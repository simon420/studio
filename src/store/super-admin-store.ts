// src/store/super-admin-store.ts
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

interface SuperAdminState {
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  error: string | null;
  login: (password: string) => void;
  logout: () => void;
}

const SUPER_ADMIN_PASSWORD = 'superpassword';

export const useSuperAdminStore = create<SuperAdminState>()(
  devtools(
    persist(
      (set) => ({
        isAuthenticated: false,
        isLoggingIn: false,
        error: null,

        login: (password: string) => {
          set({ isLoggingIn: true, error: null });
          if (password === SUPER_ADMIN_PASSWORD) {
            set({ isAuthenticated: true, isLoggingIn: false });
          } else {
            set({
              isAuthenticated: false,
              isLoggingIn: false,
              error: 'Password errata.',
            });
          }
        },

        logout: () => {
          set({ isAuthenticated: false, isLoggingIn: false, error: null });
        },
      }),
      {
        name: 'super-admin-auth-storage',
        storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for non-persistence across browser sessions
        partialize: (state) => ({ isAuthenticated: state.isAuthenticated }), // Only persist auth status
      }
    ),
    { name: 'SuperAdminStore' }
  )
);
