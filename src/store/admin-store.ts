
// src/store/admin-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, deleteDoc, query, where, orderBy, updateDoc } from 'firebase/firestore';
import type { AdminRequest } from '@/lib/types';

interface AdminState {
  pendingRequests: AdminRequest[];
  isLoading: boolean;
  fetchRequests: () => Promise<void>;
  approveAdminRequest: (requestId: string) => Promise<void>;
  declineAdminRequest: (requestId: string) => Promise<void>;
}

// API call to approve request (create user on server)
async function approveRequestApiCall(requestId: string): Promise<void> {
    const response = await fetch('/api/approve-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Approvazione richiesta fallita.');
    }
}


export const useAdminStore = create<AdminState>()(
  devtools(
    (set) => ({
      pendingRequests: [],
      isLoading: true,

      fetchRequests: async () => {
        set({ isLoading: true });
        try {
          const q = query(
            collection(db, 'adminRequests'), 
            where('status', '==', 'pending'),
            orderBy('requestedAt', 'desc')
          );
          const querySnapshot = await getDocs(q);
          const requestsData = querySnapshot.docs.map(docSnap => ({
              id: docSnap.id,
              ...docSnap.data()
          } as AdminRequest));
          set({ pendingRequests: requestsData, isLoading: false });
        } catch (error) {
          console.error("Errore nel recupero delle richieste admin:", error);
          set({ isLoading: false });
        }
      },

      approveAdminRequest: async (requestId: string) => {
        // Call the secure API route to handle user creation and document updates
        await approveRequestApiCall(requestId);

        // Update the local store to remove the approved request
        set(state => ({
          pendingRequests: state.pendingRequests.filter(req => req.id !== requestId)
        }));
      },

      declineAdminRequest: async (requestId: string) => {
        // Simply delete the request document from Firestore
        const requestDocRef = doc(db, 'adminRequests', requestId);
        await deleteDoc(requestDocRef);

        // Update the local store
        set(state => ({
          pendingRequests: state.pendingRequests.filter(req => req.id !== requestId),
        }));
      },
    }),
    { name: 'AdminStore' }
  )
);

    