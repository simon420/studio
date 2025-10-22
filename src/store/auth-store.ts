
import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
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
  _updateAuthData: (user: FirebaseUser | null, roleOverride?: UserRole) => Promise<void>; // Internal helper, now async
  _fetchUserRole: (uid: string) => Promise<UserRole>; // Internal helper to fetch role
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
  devtools( // Optional: For Zustand devtools
    persist(
      (set, get) => ({
        ...initialAuthState,

        login: async (email, password) => {
          set({ isLoading: true });
          try {
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged will handle setting user and fetching role
          } catch (error: any) {
            set({ isLoading: false });
            console.error('Firebase login error:', error);
            throw error;
          }
        },

        register: async (email, password, role) => {
          if (role === 'admin') {
            throw new Error("La registrazione degli amministratori deve passare attraverso la richiesta.");
          }
          set({ isLoading: true });

          try {
            // SECURITY FIX: Check if an admin request for this email already exists
            const adminRequestQuery = query(collection(db, 'adminRequests'), where('email', '==', email), where('status', '==', 'pending'));
            const existingAdminRequests = await getDocs(adminRequestQuery);
            if (!existingAdminRequests.empty) {
                throw new Error('Esiste già una richiesta di registrazione come admin per questa email. Attendi l\'approvazione.');
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
            
            // onAuthStateChanged will handle the rest
          } catch (error: any) {
            set({ isLoading: false });
            console.error('Firebase registration error:', error);
            throw error;
          }
        },

        requestAdminRegistration: async (email, password) => {
          set({ isLoading: true });
          try {
            // SECURITY FIX: Check if a user with this email already exists in the 'users' collection
            const userQuery = query(collection(db, 'users'), where('email', '==', email));
            const existingUsers = await getDocs(userQuery);
            if (!existingUsers.empty) {
                throw new Error('Un utente con questa email è già registrato.');
            }

            // Check if a pending request for this email already exists
            const requestQuery = query(collection(db, 'adminRequests'), where('email', '==', email), where('status', '==', 'pending'));
            const existingRequests = await getDocs(requestQuery);
            if (!existingRequests.empty) {
                throw new Error('Una richiesta per questa email è già in attesa di approvazione.');
            }
            
            const requestRef = collection(db, 'adminRequests');
            await addDoc(requestRef, {
              email: email,
              password: password, // Storing password is NOT recommended for production. This is for the demo.
              status: 'pending',
              requestedAt: serverTimestamp(),
            });
            
             set({ isLoading: false });
          } catch(error: any) {
            set({ isLoading: false });
            console.error('Errore nella richiesta di registrazione admin:', error);
            throw error;
          }
        },

        logout: async () => {
          set({ isLoading: true });
          try {
            await signOut(auth);
            // onAuthStateChanged will clear user state
          } catch (error) {
            console.error('Firebase logout error:', error);
            // Fallback to ensure logged out state, onAuthStateChanged should also trigger
            set({ ...initialAuthState, isLoading: false }); 
          }
        },

        _fetchUserRole: async (uid: string): Promise<UserRole> => {
          try {
            const userDocRef = doc(db, 'users', uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data() as UserFirestoreData;
              return userData.role;
            } else {
              console.warn('Documento utente non trovato in Firestore per UID:', uid, "- imposto ruolo di default 'user'.");
              return 'user'; 
            }
          } catch (error) {
            console.error('Errore nel recupero del ruolo utente da Firestore:', error);
            return 'user'; // Fallback on error
          }
        },
        
        _updateAuthData: async (fbUser, roleOverride) => {
          if (fbUser) {
            set(state => ({ ...state, isLoading: true }));
            try {
              const role = roleOverride || (await get()._fetchUserRole(fbUser.uid));
              set({
                firebaseUser: fbUser,
                email: fbUser.email,
                uid: fbUser.uid,
                userRole: role,
                isAuthenticated: true,
                isLoading: false,
              });
            } catch (error) {
              console.error("Errore durante il recupero del ruolo in _updateAuthData:", error);
              set({
                firebaseUser: fbUser,
                email: fbUser.email,
                uid: fbUser.uid,
                userRole: 'user', // Fallback role
                isAuthenticated: true,
                isLoading: false, // Ensure isLoading is set to false
              });
            }
          } else {
            set({ ...initialAuthState, isLoading: false });
          }
        },
      }),
      {
        name: 'auth-firebase-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
        }),
        onRehydrateStorage: () => {
          return (state) => {
            if (state) state.isLoading = true; 
          };
        },
      }
    ),
    { name: "AuthStore" } 
  )
);

if (typeof window !== 'undefined' && auth) {
  onAuthStateChanged(auth, async (user) => { 
    await useAuthStore.getState()._updateAuthData(user);
  }, (error) => {
    console.error("onAuthStateChanged error:", error);
    useAuthStore.getState()._updateAuthData(null); 
  });
}

    