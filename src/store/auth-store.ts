
// src/store/auth-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserRole, UserFirestoreData } from '@/lib/types';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  email: string | null;
  uid: string | null;
  userRole: UserRole | 'guest';
  isAuthenticated: boolean;
  isLoading: boolean; // To handle async auth state loading
  requestAdminRegistration: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  _updateAuthData: (user: FirebaseUser | null) => Promise<void>; // Internal helper, now async
  _fetchUserRole: (uid: string) => Promise<UserRole | 'guest'>; // Internal helper to fetch role
}

const initialAuthState = {
  firebaseUser: null,
  email: null,
  uid: null,
  userRole: 'guest' as UserRole | 'guest',
  isAuthenticated: false,
  isLoading: true, // Start in loading state until first auth check
};

export const useAuthStore = create<AuthState>()(
  devtools( 
    (set, get) => ({
      ...initialAuthState,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const role = await get()._fetchUserRole(userCredential.user.uid);
          // Manually block login if role is 'pending'
          if (role === 'pending') {
            await signOut(auth); // Sign out the user immediately
            throw new Error('Il tuo account admin è in attesa di approvazione.');
          }
          // onAuthStateChanged will handle setting the rest of the state
        } catch (error: any) {
          set({ isLoading: false });
          // If it's our custom pending error, re-throw it with a specific message
          if (error.message.includes('in attesa di approvazione')) {
             throw error;
          }
          console.error('Firebase login error:', error);
          throw error;
        }
      },

      register: async (email, password, role) => {
        if (role === 'admin') {
          return get().requestAdminRegistration(email, password);
        }
        set({ isLoading: true });

        try {
          // SECURITY FIX: Check if an admin request for this email already exists
          const adminRequestQuery = query(collection(db, 'adminRequests'), where('email', '==', email));
          const existingAdminRequests = await getDocs(adminRequestQuery);
          if (!existingAdminRequests.empty) {
            throw new Error('Esiste già una richiesta di registrazione come admin per questa email. Attendi l\'approvazione o contatta il supporto.');
          }

          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;

          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userData: UserFirestoreData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: role,
            createdAt: serverTimestamp(),
          };
          await setDoc(userDocRef, userData);
        } catch (error: any) {
          set({ isLoading: false });
          console.error('Firebase registration error:', error);
          throw error;
        }
      },

      requestAdminRegistration: async (email, password) => {
        set({ isLoading: true });
        try {
          // Check if a user with this email already exists in Firestore users collection
          const userQuery = query(collection(db, 'users'), where('email', '==', email));
          const existingUsers = await getDocs(userQuery);
          if (!existingUsers.empty) {
            throw new Error('Un utente con questa email è già registrato.');
          }

          // Create the user in Firebase Auth first
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;
          
          // Now, create their user document in Firestore with 'pending' role
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userData: UserFirestoreData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: 'pending', // Set role to 'pending'
            createdAt: serverTimestamp(),
          };
          await setDoc(userDocRef, userData);
          
          // Sign the user out immediately after registration
          await signOut(auth);

          set({ isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
          console.error('Errore nella richiesta di registrazione admin:', error);
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await signOut(auth);
        } catch (error) {
          console.error('Firebase logout error:', error);
        } finally {
          set({ ...initialAuthState, isLoading: false });
        }
      },

      _fetchUserRole: async (uid: string): Promise<UserRole | 'guest'> => {
        try {
          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as UserFirestoreData;
            return userData.role;
          } else {
            console.warn('Documento utente non trovato in Firestore per UID:', uid, "- l'utente potrebbe non avere un ruolo assegnato.");
            return 'guest'; // Return 'guest' if no user doc, indicates a problem
          }
        } catch (error) {
          console.error('Errore nel recupero del ruolo utente da Firestore:', error);
          return 'guest'; // Fallback on error
        }
      },

      _updateAuthData: async (fbUser) => {
        if (fbUser) {
          set(state => ({ ...state, isLoading: true }));
          try {
            const role = await get()._fetchUserRole(fbUser.uid);

            if (role === 'pending' || role === 'guest') {
              // If role is pending or guest (no doc), they are not authenticated in our app logic
              await signOut(auth); // Ensure they are signed out of Firebase
              set({ ...initialAuthState, isLoading: false });
            } else {
              set({
                firebaseUser: fbUser,
                email: fbUser.email,
                uid: fbUser.uid,
                userRole: role,
                isAuthenticated: true,
                isLoading: false,
              });
            }
          } catch (error) {
            console.error("Errore durante il recupero del ruolo in _updateAuthData:", error);
            set({ ...initialAuthState, isLoading: false });
          }
        } else {
          set({ ...initialAuthState, isLoading: false });
        }
      },
    }),
    { name: "AuthStore" } 
  )
);

// This listener remains critical for keeping state in sync
if (typeof window !== 'undefined' && auth) {
  onAuthStateChanged(auth, async (user) => { 
    await useAuthStore.getState()._updateAuthData(user);
  }, (error) => {
    console.error("onAuthStateChanged error:", error);
    useAuthStore.setState({ ...initialAuthState, isLoading: false });
  });
}
