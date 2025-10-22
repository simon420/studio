
// src/store/admin-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where, deleteDoc } from 'firebase/firestore';
import type { UserFirestoreData } from '@/lib/types';

interface AdminState {
  // Requests are now just users with the 'pending' role
  pendingUsers: UserFirestoreData[];
  isLoading: boolean;
  fetchPendingUsers: () => Promise<void>;
  approveAdminRequest: (uid: string) => Promise<void>;
  declineAdminRequest: (uid: string) => Promise<void>;
}

// Function to call our new secure API route
async function deleteUserApiCall(uid: string): Promise<void> {
    const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Eliminazione utente fallita.');
    }
}

export const useAdminStore = create<AdminState>()(
  devtools(
    (set) => ({
      pendingUsers: [],
      isLoading: true,

      fetchPendingUsers: async () => {
        set({ isLoading: true });
        try {
          const q = query(collection(db, 'users'), where('role', '==', 'pending'));
          const querySnapshot = await getDocs(q);
          const usersData = querySnapshot.docs.map(docSnap => docSnap.data() as UserFirestoreData);
          set({ pendingUsers: usersData, isLoading: false });
        } catch (error) {
          console.error("Errore nel recupero degli utenti in attesa:", error);
          set({ isLoading: false });
        }
      },

      approveAdminRequest: async (uid: string) => {
        const userDocRef = doc(db, 'users', uid);
        // Change role from 'pending' to 'admin'
        await updateDoc(userDocRef, { role: 'admin' });

        set(state => ({
          pendingUsers: state.pendingUsers.filter(user => user.uid !== uid)
        }));
      },

      declineAdminRequest: async (uid: string) => {
        // 1. Delete the user from Firebase Authentication via the secure API route
        await deleteUserApiCall(uid);

        // 2. Delete the user's document from Firestore
        const userDocRef = doc(db, 'users', uid);
        await deleteDoc(userDocRef);

        // 3. Update the local store
        set(state => ({
          pendingUsers: state.pendingUsers.filter(user => user.uid !== uid),
        }));
      },