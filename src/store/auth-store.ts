// src/store/auth-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  Unsubscribe,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserRole, UserFirestoreData } from '@/lib/types';
import { useNotificationStore } from './notification-store'; // Import notification store

let sessionListener: Unsubscribe | null = null;

interface AuthState {
  firebaseUser: FirebaseUser | null;
  email: string | null;
  uid: string | null;
  userRole: UserRole | 'guest';
  sessionVersion: number;
  isAuthenticated: boolean;
  isLoading: boolean; // To handle async auth state loading
  requestAdminRegistration: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  _updateAuthData: (user: FirebaseUser | null) => Promise<void>; // Internal helper, now async
  _fetchUserData: (uid: string) => Promise<UserFirestoreData | null>; // Fetches the full user document
  _cleanupSessionListener: () => void;
}

const initialAuthState = {
  firebaseUser: null,
  email: null,
  uid: null,
  userRole: 'guest' as UserRole | 'guest',
  sessionVersion: 0,
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
          await signInWithEmailAndPassword(auth, email, password);
          // onAuthStateChanged will handle setting the rest of the state
        } catch (error: any) {
          set({ isLoading: false });
          console.error('Firebase login error:', error);
          throw error;
        }
      },

      register: async (email, password, role) => {
        if (role === 'admin' || role === 'super-admin') {
          return get().requestAdminRegistration(email, password);
        }
        set({ isLoading: true });

        try {
           const adminRequestQuery = query(collection(db, 'adminRequests'), where('email', '==', email), where('status', '==', 'pending'));
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
            sessionVersion: 1, // Initial session version
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
             // 1. Check if user already exists in Auth or Firestore 'users'
             const userQuery = query(collection(db, 'users'), where('email', '==', email));
             const existingUsers = await getDocs(userQuery);
             if (!existingUsers.empty) {
                 throw new Error('Un utente con questa email è già registrato.');
             }

             // 2. Check if a pending request for this email already exists
             const requestQuery = query(collection(db, 'adminRequests'), where('email', '==', email), where('status', '==', 'pending'));
             const existingRequests = await getDocs(requestQuery);
             if (!existingRequests.empty) {
                 throw new Error('Una richiesta per questa email è già in attesa di approvazione.');
             }
             
             await addDoc(collection(db, 'adminRequests'), {
                 email,
                 password, // Storing plain-text password temporarily.
                 status: 'pending',
                 requestedAt: serverTimestamp(),
             });

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
          // Clear notifications from the previous user's session
          useNotificationStore.getState().clearAllNotifications();
        } catch (error) {
          console.error('Firebase logout error:', error);
        } finally {
          get()._cleanupSessionListener();
          set({ ...initialAuthState, isLoading: false });
        }
      },
      
      _cleanupSessionListener: () => {
        if (sessionListener) {
          sessionListener();
          sessionListener = null;
        }
      },

      _fetchUserData: async (uid: string): Promise<UserFirestoreData | null> => {
        try {
          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            return userDocSnap.data() as UserFirestoreData;
          }
          return null;
        } catch (error) {
          console.error('Errore nel recupero del ruolo utente da Firestore:', error);
          return null; // Fallback on error
        }
      },

      _updateAuthData: async (fbUser) => {
        get()._cleanupSessionListener();

        if (fbUser) {
          set(state => ({ ...state, isLoading: true }));
          try {
            const userData = await get()._fetchUserData(fbUser.uid);

            if (!userData) { // If user doc doesn't exist, they shouldn't be logged in
              console.warn(`User document not found for UID ${fbUser.uid}. Forcing logout.`);
              await get().logout();
            } else {
              set({
                firebaseUser: fbUser,
                email: fbUser.email,
                uid: fbUser.uid,
                userRole: userData.role,
                sessionVersion: userData.sessionVersion || 1,
                isAuthenticated: true,
                isLoading: false,
              });

              // Start listening for session changes
              const userDocRef = doc(db, 'users', fbUser.uid);
              sessionListener = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                  const newUserData = docSnap.data() as UserFirestoreData;
                  const localSessionVersion = get().sessionVersion;
                  
                  if (newUserData.sessionVersion && newUserData.sessionVersion > localSessionVersion) {
                    console.log("Sessione revocata dal server. Logout forzato.");
                    get().logout();
                  }
                } else {
                  // Document was deleted, force logout
                  console.log("Documento utente eliminato. Logout forzato.");
                  get().logout();
                }
              });
            }
          } catch (error) {
            console.error("Errore durante il recupero del ruolo in _updateAuthData:", error);
            await get().logout();
          }
        } else {
          set({ ...initialAuthState, isLoading: false });
        }
      },
    }),
    { name: "AuthStore" } 
  )
);

if (typeof window !== 'undefined' && auth) {
  onAuthStateChanged(auth, async (user) => { 
    await useAuthStore.getState()._updateAuthData(user);
  }, (error) => {
    console.error("onAuthStateChanged error:", error);
    useAuthStore.setState({ ...initialAuthState, isLoading: false });
  });
}
