// src/store/user-management-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useAuthStore } from './auth-store';

// We can't use the full UserRecord type on the client, so define a client-safe version
export interface ClientUser {
    uid: string;
    email: string | undefined;
    emailVerified: boolean;
    disabled: boolean;
    metadata: {
        creationTime: string;
        lastSignInTime: string;
    };
    customClaims?: { [key: string]: any };
    // This will be fetched separately from Firestore
    role?: string; 
}


interface UserManagementState {
  users: ClientUser[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  deleteUser: (uid: string) => Promise<void>;
}

export const useUserManagementStore = create<UserManagementState>()(
  devtools(
    (set, get) => ({
      users: [],
      isLoading: false,
      error: null,

      fetchUsers: async () => {
        const { userRole } = useAuthStore.getState();
        if (userRole !== 'super-admin') {
          set({ error: 'Non autorizzato.', isLoading: false, users: [] });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/super-admin/users');
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Impossibile caricare gli utenti.');
          }
          const data = await response.json();
          // Here you could enrich user data with roles from your Firestore 'users' collection
          // For simplicity, we'll just display what we get from Auth for now.
          set({ users: data.users, isLoading: false });
        } catch (error: any) {
          console.error("Errore nel fetch degli utenti:", error);
          set({ error: error.message, isLoading: false });
        }
      },

      deleteUser: async (uid: string) => {
        const { userRole } = useAuthStore.getState();
        if (userRole !== 'super-admin') {
          throw new Error('Solo i super-amministratori possono eliminare gli utenti.');
        }

        try {
          const response = await fetch('/api/super-admin/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Eliminazione utente fallita.');
          }
          
          // Remove user from local state
          set(state => ({
            users: state.users.filter(user => user.uid !== uid),
          }));

        } catch (error: any) {
          console.error(`Errore nell'eliminare l'utente ${uid}:`, error);
          // Propagate the error so the component can display a toast
          throw error;
        }
      },
    }),
    { name: 'UserManagementStore' }
  )
);
