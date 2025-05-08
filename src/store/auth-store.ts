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
  _updateAuthData: (user: FirebaseUser | null, role?: UserRole) => void; // Internal helper
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
            // We can optimistically update role here if needed, but listener is source of truth
            // get()._updateAuthData(firebaseUser, role); // Optimistic update
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
            // Even if Firebase signOut fails, clear client state via listener
            set({ ...initialAuthState, isLoading: false }); // Fallback to ensure logged out state
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
              console.warn('User document not found in Firestore for UID:', uid);
              return 'user'; // Default to 'user' if no role doc found (or handle as error)
            }
          } catch (error) {
            console.error('Error fetching user role from Firestore:', error);
            return 'user'; // Fallback on error
          }
        },
        
        _updateAuthData: (fbUser, roleOverride) => {
          if (fbUser) {
            set(async (state) => {
              const role = roleOverride || (await get()._fetchUserRole(fbUser.uid));
              return {
                firebaseUser: fbUser,
                email: fbUser.email,
                uid: fbUser.uid,
                userRole: role,
                isAuthenticated: true,
                isLoading: false,
              };
            });
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
          // isLoading will be true on app load until onAuthStateChanged fires.
          // email: state.email, // Example: could persist email for quick display
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
// This should run once when the app/store is loaded on the client-side
if (typeof window !== 'undefined' && auth) {
  onAuthStateChanged(auth, async (user) => {
    const storeUpdater = useAuthStore.getState()._updateAuthData;
    if (user) {
      storeUpdater(user); // This will also trigger role fetch
    } else {
      storeUpdater(null);
    }
  }, (error) => {
    console.error("onAuthStateChanged error:", error);
    useAuthStore.getState()._updateAuthData(null);
  });
}
