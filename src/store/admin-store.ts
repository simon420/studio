// src/store/admin-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { db } from '@/lib/firebase';
import { collection, doc, deleteDoc, query, where, onSnapshot, Unsubscribe, DocumentChange, Timestamp } from 'firebase/firestore';
import type { AdminRequest } from '@/lib/types';
import { useNotificationStore } from './notification-store';
import { useAuthStore } from './auth-store';

// Keep track of the real-time listener
let adminRequestListener: Unsubscribe | null = null;
let listenerAttachTime: number | null = null; // To track when the listener was attached

interface AdminState {
  pendingRequests: AdminRequest[];
  isLoading: boolean;
  listenForAdminRequests: () => void;
  cleanupAdminListener: () => void;
  approveAdminRequest: (requestId: string) => Promise<void>;
  declineAdminRequest: (requestId: string) => Promise<void>;
}

// API call to approve request (create user on server)
async function approveRequestApiCall(requestId: string): Promise<{uid: string, email: string}> {
    const response = await fetch('/api/approve-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Approvazione richiesta fallita.');
    }
    return response.json();
}


export const useAdminStore = create<AdminState>()(
  devtools(
    (set, get) => ({
      pendingRequests: [],
      isLoading: true,

      listenForAdminRequests: () => {
        const { addNotification } = useNotificationStore.getState();
        // Clean up any existing listener before starting a new one
        get().cleanupAdminListener();

        set({ isLoading: true });
        listenerAttachTime = Date.now(); // Set the timestamp when the listener starts

        const q = query(
          collection(db, 'adminRequests'),
          where('status', '==', 'pending')
        );

        adminRequestListener = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change: DocumentChange) => {
            const requestData = {
              id: change.doc.id,
              ...change.doc.data()
            } as AdminRequest;

            const requestTimestamp = (requestData.requestedAt as Timestamp)?.toDate().getTime() || 0;

            // Notify only for new requests that appeared after the listener was attached
            if (change.type === "added" && listenerAttachTime && requestTimestamp > listenerAttachTime) {
              addNotification({
                type: 'admin_request',
                message: `Nuova richiesta admin da: ${requestData.email}`,
              });
            }
          });

          const requestsData = snapshot.docs.map(docSnap => ({
              id: docSnap.id,
              ...docSnap.data()
          } as AdminRequest));
          
          requestsData.sort((a, b) => {
            const dateA = (a.requestedAt as Timestamp)?.toDate().getTime() || 0;
            const dateB = (b.requestedAt as Timestamp)?.toDate().getTime() || 0;
            return dateB - dateA;
          });

          set({ pendingRequests: requestsData, isLoading: false });
        }, (error) => {
          console.error("Errore nel listener delle richieste admin:", error);
          set({ isLoading: false });
        });
      },
      
      cleanupAdminListener: () => {
        if (adminRequestListener) {
            adminRequestListener();
            adminRequestListener = null;
        }
        listenerAttachTime = null; // Reset timestamp on cleanup
        set({ pendingRequests: [], isLoading: true });
      },

      approveAdminRequest: async (requestId: string) => {
        // This call will create the user in Auth and in the 'users' Firestore collection.
        // The listener on the `users` collection in `user-management-store` will pick up
        // the new user and trigger a notification.
        // The listener on `adminRequests` collection here will pick up the deleted request.
        // We no longer need to manually trigger notifications or refetches from here.
        await approveRequestApiCall(requestId);
      },

      declineAdminRequest: async (requestId: string) => {
        const requestDocRef = doc(db, 'adminRequests', requestId);
        await deleteDoc(requestDocRef);

        // The onSnapshot listener will automatically remove the request from the list.
      },
    }),
    { name: 'AdminStore' }
  )
);

// Subscribe to auth changes to manage the admin requests listener
if (typeof window !== 'undefined') {
    useAuthStore.subscribe(
        (currentAuthState, previousAuthState) => {
            const adminStore = useAdminStore.getState();
            const wasSuperAdmin = previousAuthState.userRole === 'super-admin';
            const isSuperAdmin = currentAuthState.userRole === 'super-admin';

            // User logs in as super-admin or gains super-admin role
            if (!wasSuperAdmin && isSuperAdmin) {
                console.log("AdminStore: Utente è super-admin. Avvio listener richieste.");
                adminStore.listenForAdminRequests();
            }
            // User logs out or loses super-admin role
            else if (wasSuperAdmin && !isSuperAdmin) {
                 console.log("AdminStore: Utente non è più super-admin. Pulisco listener richieste.");
                 adminStore.cleanupAdminListener();
            }
        }
    );

    // Initial check on page load
    const initialAuth = useAuthStore.getState();
    if (initialAuth.isAuthenticated && initialAuth.userRole === 'super-admin' && !initialAuth.isLoading) {
        console.log("AdminStore: Check iniziale, utente è super-admin. Avvio listener.");
        useAdminStore.getState().listenForAdminRequests();
    }
}
