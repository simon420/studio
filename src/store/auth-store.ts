import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserRole, UserFirestoreData } from '@/lib/types';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  email: string | null;
  uid: string | null;
  userRole: UserRole | 'guest';
  isAuthenticated: boolean;
  isLoading: boolean; // To handle async auth state loading
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
          set({ isLoading: true });
          try {
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
              // This can happen if registration succeeded for auth but Firestore write failed/is pending
              // Or if user was created via Firebase console without a corresponding Firestore doc.
              return 'user'; 
            }
          } catch (error) {
            console.error('Errore nel recupero del ruolo utente da Firestore:', error);
            return 'user'; // Fallback on error
          }
        },
        
        _updateAuthData: async (fbUser, roleOverride) => {
          if (fbUser) {
            // Explicitly set isLoading to true when starting to process a user,
            // especially since role fetching is async.
            // This handles cases where _updateAuthData might be called when isLoading was false.
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
              // This catch is primarily for unexpected errors in _fetchUserRole
              // though _fetchUserRole itself has a catch and returns a default.
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
          // Only persist minimal, non-sensitive data.
        }),
        onRehydrateStorage: () => {
          return (state) => {
            if (state) state.isLoading = true; // Ensure loading on rehydration
          };
        },
      }
    ),
    { name: "AuthStore" } // Name for devtools
  )
);

// Initialize Firebase onAuthStateChanged listener
if (typeof window !== 'undefined' && auth) {
  onAuthStateChanged(auth, async (user) => { // Make the listener callback async
    // Await _updateAuthData to ensure all async operations within it (like role fetching) complete
    // before subsequent dependent logic in components might run.
    await useAuthStore.getState()._updateAuthData(user);
  }, (error) => {
    console.error("onAuthStateChanged error:", error);
    // Ensure state is reset and isLoading is false even on listener error
    useAuthStore.getState()._updateAuthData(null); 
  });
}
