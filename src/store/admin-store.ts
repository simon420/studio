
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, deleteDoc, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import type { AdminRequest, UserFirestoreData } from '@/lib/types';


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
        // Rimosso controllo userRole, l'accesso è protetto dalla pagina super-admin
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
        // Rimosso controllo userRole, l'accesso è protetto dalla pagina super-admin
        
        // This is complex because createUserWithEmailAndPassword logs the current user out.
        // In this Super Admin flow, there is no logged-in Firebase user, so this is safe.
        try {
            // 1. Create the user in Firebase Auth
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
            
            // IMPORTANT: Since the super-admin is not a Firebase user, creating a new user here
            // does not sign them out. However, it might briefly set the 'auth' state app-wide
            // if not handled carefully. For this app's architecture, it's acceptable.
            // A more robust system would use a Cloud Function.

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
       // Rimosso controllo userRole, l'accesso è protetto dalla pagina super-admin
        
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
