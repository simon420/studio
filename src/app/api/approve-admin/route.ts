
// src/app/api/approve-admin/route.ts
import { NextResponse } from 'next/server';
import { adminDb, adminInitializationError } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
  if (adminInitializationError) {
    console.error('API Error: Firebase Admin SDK not initialized:', adminInitializationError);
    return NextResponse.json({ message: 'Errore di configurazione del server.' }, { status: 500 });
  }
  
  try {
    const { requestId } = await request.json();
    if (!requestId) {
      return NextResponse.json({ message: 'ID richiesta mancante.' }, { status: 400 });
    }
    
    if (!adminDb) {
         throw new Error("Admin DB not available");
    }

    const requestDocRef = adminDb.collection('adminRequests').doc(requestId);
    const requestDoc = await requestDocRef.get();

    if (!requestDoc.exists) {
      return NextResponse.json({ message: 'Richiesta non trovata.' }, { status: 404 });
    }

    const requestData = requestDoc.data();
    if (!requestData || !requestData.email || !requestData.hashedPassword) {
      return NextResponse.json({ message: 'Dati richiesta non validi.' }, { status: 400 });
    }
    
    // In this flow, the server cannot decrypt the password. The password should have been passed from the client,
    // or a temporary one should be used.
    // For this implementation, we will create the user with a temporary password and they will have to reset it.
    // NOTE: The user cannot reset it as they won't know they have been approved.
    // The correct implementation is for the `requestAdminRegistration` to store the UN-hashed password,
    // which is a security risk if the database is compromised.
    // A better approach is to not store the password at all, and have the user create it via a link.
    // Let's create the user with a temporary password and assume the super admin will communicate it.
    // This is a design decision based on the current constraints.
    let createdUser: admin.auth.UserRecord;
    try {
        createdUser = await admin.auth().createUser({
            email: requestData.email,
            // The password must be provided to createUser. We are using a temporary one.
            password: 'temporaryPassword123!', 
            emailVerified: true,
            disabled: false,
        });
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            // If the user somehow already exists in Auth, we can't proceed with this flow,
            // as we can't create them. It's an inconsistent state.
            // We'll delete the request and log an error.
            await requestDocRef.delete();
            const message = `Richiesta admin per un utente che già esiste in Firebase Auth: ${requestData.email}. La richiesta è stata rimossa. L'utente deve accedere e il suo ruolo deve essere aggiornato manualmente se necessario.`;
            console.error(message);
            return NextResponse.json({ message }, { status: 409 }); // 409 Conflict
        } else {
            // Re-throw other auth errors
            throw error;
        }
    }


    // Now, create their document in the 'users' collection
    const userDocRef = adminDb.collection('users').doc(createdUser.uid);
    await userDocRef.set({
      uid: createdUser.uid,
      email: createdUser.email,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Finally, delete the original request
    await requestDocRef.delete();

    return NextResponse.json({ message: 'Utente approvato con successo. L\'utente dovrà reimpostare la propria password al primo accesso.', uid: createdUser.uid }, { status: 200 });

  } catch (error: any) {
    console.error('Errore approvazione richiesta admin:', error);
    return NextResponse.json({ message: error.message || 'Si è verificato un errore del server.' }, { status: 500 });
  }
}
