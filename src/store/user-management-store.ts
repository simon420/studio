// src/store/user-management-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useAuthStore } from './auth-store';
import { useNotificationStore } from './notification-store';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, Unsubscribe, DocumentChange, Timestamp } from 'firebase/firestore';
import type { UserFirestoreData, Notification } from '@/lib/types';


// We can't use the full UserRecord type on the client, so define a client-safe version
export interface ClientUser extends UserFirestoreData {
    // This type now directly extends UserFirestoreData, which is what we get from the listener
}

let userListener: Unsubscribe | null = null;
let userListenerAttachTime: number | null = null;

interface UserManagementState {
  users: ClientUser[];
  isLoading: boolean;
  error: string | null;
  listenForUsers: () => void;
  cleanupUserListener: () => void;
  deleteUser: (uid: string) => Promise<void>;
}

export const useUserManagementStore = create<UserManagementState>()(
  devtools(
    (set, get) => ({
      users: [],
      isLoading: true,
      error: null,

      listenForUsers: () => {
          const { userRole } = useAuthStore.getState();
          if (userRole !== 'super-admin') {
            set({ error: 'Non autorizzato.', isLoading: false, users: [] });
            return;
          }
          
          get().cleanupUserListener();
          set({ isLoading: true, error: null });
          userListenerAttachTime = Date.now();

          const q = query(collection(db, 'users'));

          userListener = onSnapshot(q, (snapshot) => {
              const { addNotification } = useNotificationStore.getState();

              snapshot.docChanges().forEach((change: DocumentChange) => {
                  const userData = change.doc.data() as UserFirestoreData;
                  const userTimestamp = (userData.createdAt as Timestamp)?.toDate().getTime() || 0;
                  
                  // Notify only for new users that were added after the listener was attached
                  if (change.type === "added" && userListenerAttachTime && userTimestamp > userListenerAttachTime) {
                      let notificationType: Notification['type'] = 'user_registered';
                      let message = `Nuovo utente registrato: ${userData.email}`;

                      if (userData.role === 'admin') {
                        notificationType = 'user_approved';
                        message = `L'utente admin ${userData.email} è stato approvato.`;
                      }
                      
                      addNotification({
                          type: notificationType,
                          message: message,
                      });
                  }
              });

              const usersData = snapshot.docs.map(docSnap => ({
                  ...docSnap.data()
              } as ClientUser));
              
              set({ users: usersData, isLoading: false });

          }, (error) => {
              console.error("Errore nel listener degli utenti:", error);
              set({ error: error.message, isLoading: false });
          });
      },

      cleanupUserListener: () => {
        if (userListener) {
            userListener();
            userListener = null;
        }
        userListenerAttachTime = null;
        set({ users: [], isLoading: true, error: null });
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
          
          // The real-time listener will automatically remove the user from the local state.
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


// Subscribe to auth changes to manage the user listener
if (typeof window !== 'undefined') {
    useAuthStore.subscribe(
        (currentAuthState, previousAuthState) => {
            const userStore = useUserManagementStore.getState();
            const wasSuperAdmin = previousAuthState.userRole === 'super-admin';
            const isSuperAdmin = currentAuthState.userRole === 'super-admin';

            if (!wasSuperAdmin && isSuperAdmin) {
                console.log("UserManagementStore: L'utente è super-admin. Avvio listener utenti.");
                userStore.listenForUsers();
            }
            else if (wasSuperAdmin && !isSuperAdmin) {
                 console.log("UserManagementStore: L'utente non è più super-admin. Pulisco listener utenti.");
                 userStore.cleanupUserListener();
            }
        }
    );

    // Initial check on page load
    const initialAuth = useAuthStore.getState();
    if (initialAuth.isAuthenticated && initialAuth.userRole === 'super-admin' && !initialAuth.isLoading) {
        console.log("UserManagementStore: Check iniziale, utente è super-admin. Avvio listener.");
        useUserManagementStore.getState().listenForUsers();
    }
}
