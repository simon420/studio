
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, deleteDoc, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import type { AdminRequest, UserFirestoreData } from '@/lib/types';
import { useAuthStore } from './auth-store';

interface AdminState {
  requests: AdminRequest[];
  isLoading: boolean;
  fetchRequests: () => Promise<void>;
  approveAdminRequest: (requestId: string, email: string, password: string) => Promise<void>;
  declineAdminRequest: (requestId: string) => Promise<void>;
}

export const useAdminStore = create<AdminState>()(
  devtools(
    (set, get) => ({
      requests: [],
      isLoading: true,

      fetchRequests: async () => {
        const { userRole } = useAuthStore.getState();
        if (userRole !== 'admin') {
            set({ requests: [], isLoading: false });
            return;
        }

        set({ isLoading: true });
        try {
          const q = query(collection(db, 'adminRequests'), where('status', '==', 'pending'));
          const querySnapshot = await getDocs(q);
          const requestsData = querySnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as AdminRequest[];
          set({ requests: requestsData, isLoading: false });
        } catch (error) {
          console.error("Errore nel recupero delle richieste admin:", error);
          set({ isLoading: false });
        }
      },

      approveAdminRequest: async (requestId: string, email: string, password: string) => {
        const { userRole } = useAuthStore.getState();
        if (userRole !== 'admin') {
          throw new Error("Solo gli amministratori possono approvare le richieste.");
        }
        
        // This is complex because createUserWithEmailAndPassword logs the current user out.
        // For this simple case, we will proceed, but a real app might use a backend function.
        try {
            // IMPORTANT: This will sign out the current admin. This is a limitation of client-side user creation.
            // A better solution involves Cloud Functions to create users without affecting current auth state.
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newAdminUser = userCredential.user;

            // 2. Create a document for the new admin in the `users` collection
            const userDocRef = doc(db, 'users', newAdminUser.uid);
            const newUserDoc: UserFirestoreData = {
                uid: newAdminUser.uid,
                email: newAdminUser.email,
                role: 'admin',
                createdAt: serverTimestamp(),
            };
            await setDoc(userDocRef, newUserDoc);
            
            // 3. Delete the request from `adminRequests`
            const requestDocRef = doc(db, 'adminRequests', requestId);
            await deleteDoc(requestDocRef);

            // 4. Update the local store
            set(state => ({
                requests: state.requests.filter(req => req.id !== requestId)
            }));
            
            // The current admin will be logged out. They need to log back in.
            // This is a known side-effect of using client-side createUserWithEmailAndPassword.

        } catch (error: any) {
            console.error("Errore nell'approvazione della richiesta admin: ", error);
            if (error.code === 'auth/email-already-in-use') {
                // If user exists, just delete the request.
                await get().declineAdminRequest(requestId);
                throw new Error('Un utente con questa email esiste già. La richiesta è stata rimossa.');
            }
            throw new Error(`Impossibile creare l'utente: ${error.message}`);
        }
      },

      declineAdminRequest: async (requestId: string) => {
        const { userRole } = useAuthStore.getState();
        if (userRole !== 'admin') {
          throw new Error("Solo gli amministratori possono rifiutare le richieste.");
        }
        
        const requestDocRef = doc(db, 'adminRequests', requestId);
        await deleteDoc(requestDocRef);

        set(state => ({
          requests: state.requests.filter(req => req.id !== requestId),
        }));
      },
    }),
    { name: 'AdminStore' }
  )
);
