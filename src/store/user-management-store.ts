// src/store/user-management-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useAuthStore } from './auth-store';
import { useNotificationStore } from './notification-store';
import { useProductStore } from './product-store';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, Unsubscribe, DocumentChange, Timestamp, doc, updateDoc } from 'firebase/firestore';
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
  deleteAdminUserAndManageProducts: (uid: string, productAction: 'reassign' | 'delete') => Promise<void>;
  revokeUserSession: (uid: string) => Promise<void>;
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
              const { addNotification, ...authStore } = useNotificationStore.getState();

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

              // Verify the current user's validity after the user list is updated
              useAuthStore.getState().verifyCurrentUser();

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
      
      revokeUserSession: async (uid: string) => {
        const userDocRef = doc(db, 'users', uid);
        try {
          await updateDoc(userDocRef, {
            sessionVersion: Math.floor(Date.now() / 1000) // Use a timestamp as a new version
          });
        } catch (error) {
          console.error(`Impossibile revocare la sessione per l'utente ${uid}:`, error);
          // Don't re-throw, as we want to proceed with deletion anyway
        }
      },

      deleteAdminUserAndManageProducts: async (uid, productAction) => {
        const { userRole, uid: superAdminUid, email: superAdminEmail } = useAuthStore.getState();
        if (userRole !== 'super-admin' || !superAdminUid || !superAdminEmail) {
          throw new Error('Solo i super-amministratori possono eseguire questa azione.');
        }

        const { products, superAdminUpdateProduct, superAdminDeleteProduct } = useProductStore.getState();
        const adminProducts = products.filter(p => p.addedByUid === uid);
        
        // Revoke session first to force an immediate logout on the admin's client
        await get().revokeUserSession(uid);

        // Step 1: Manage products
        if (productAction === 'reassign') {
            const updatedData = { addedByUid: superAdminUid, addedByEmail: superAdminEmail };
            const promises = adminProducts.map(product => 
                superAdminUpdateProduct(product.id, product.serverId!, updatedData)
            );
            await Promise.all(promises);
        } else if (productAction === 'delete') {
            const promises = adminProducts.map(product => 
                superAdminDeleteProduct(product.id, product.serverId!)
            );
            await Promise.all(promises);
        }

        // Step 2: Delete user after products are managed
        await get().deleteUser(uid);
      },


      deleteUser: async (uid: string) => {
        const { userRole } = useAuthStore.getState();
        if (userRole !== 'super-admin') {
          throw new Error('Solo i super-amministratori possono eliminare gli utenti.');
        }

        // Revoke session for non-admin users as well
        const userToDelete = get().users.find(u => u.uid === uid);
        if (userToDelete && userToDelete.role !== 'admin') {
          await get().revokeUserSession(uid);
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
