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

// !! IMPORTANTE: Questa è una password statica per un accesso di "emergenza" o di primo livello.
// In un'applicazione di produzione, questa logica dovrebbe essere sostituita da un sistema più sicuro.
const SUPER_ADMIN_PASSWORD = 'superpassword';

// Questo store gestisce un'autenticazione "locale", completamente separata da Firebase.
// Serve solo a proteggere l'accesso alla dashboard del super admin nel browser.
// L'autenticazione vera e propria per le operazioni critiche (come creare utenti)
// avviene sul server tramite le API routes che usano l'Admin SDK di Firebase.
export const useSuperAdminStore = create<SuperAdminState>()(
  devtools(
    persist(
      (set) => ({
        isAuthenticated: false,
        isLoggingIn: false,
        error: null,

        login: (password: string) => {
          set({ isLoggingIn: true, error: null });
          // Semplice controllo della password statica
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
        storage: createJSONStorage(() => sessionStorage), // Usa sessionStorage per non persistere tra sessioni del browser
        partialize: (state) => ({ isAuthenticated: state.isAuthenticated }), // Persisti solo lo stato di autenticazione
      }
    ),
    { name: 'SuperAdminStore' }
  )
);
