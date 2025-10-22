// src/store/admin-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { db } from '@/lib/firebase';
import { collection, doc, deleteDoc, query, where, onSnapshot, Unsubscribe, DocumentChange } from 'firebase/firestore';
import type { AdminRequest } from '@/lib/types';
import { useNotificationStore } from './notification-store';
import { useAuthStore } from './auth-store';

// Keep track of the real-time listener
let adminRequestListener: Unsubscribe | null = null;

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

        const q = query(
          collection(db, 'adminRequests'),
          where('status', '==', 'pending')
        );

        adminRequestListener = onSnapshot(q, (snapshot) => {
          const isInitialLoad = get().pendingRequests.length === 0 && snapshot.docChanges().length > 0;

          snapshot.docChanges().forEach((change: DocumentChange) => {
            const requestData = {
              id: change.doc.id,
              ...change.doc.data()
            } as AdminRequest;

            // Notify only on new additions after the initial load
            if (change.type === "added" && !isInitialLoad) {
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
            const dateA = a.requestedAt?.toDate ? a.requestedAt.toDate().getTime() : 0;
            const dateB = b.requestedAt?.toDate ? b.requestedAt.toDate().getTime() : 0;
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
        set({ pendingRequests: [], isLoading: true });
      },

      approveAdminRequest: async (requestId: string) => {
        const { addNotification } = useNotificationStore.getState();
        const approvedData = await approveRequestApiCall(requestId);
        
        addNotification({
            type: 'user_approved',
            message: `L'utente admin ${approvedData.email} è stato approvato e creato.`,
        });

        // The onSnapshot listener will automatically remove the request from the list.
        // No need for manual state update here.
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
