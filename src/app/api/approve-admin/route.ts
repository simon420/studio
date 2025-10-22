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
    // Use plain-text 'password' from the request.
    if (!requestData || !requestData.email || !requestData.password) {
      return NextResponse.json({ message: 'Dati richiesta non validi (email o password mancanti).' }, { status: 400 });
    }
    
    let userRecord: admin.auth.UserRecord;

    try {
        // User should not exist, so we create them. If they do, something is wrong.
        userRecord = await admin.auth().createUser({
            email: requestData.email,
            password: requestData.password, // Use the plain-text password from the request
            emailVerified: true,
            disabled: false,
        });
        console.log(`Successfully created new admin user in Auth with UID: ${userRecord.uid}`);

    } catch (error: any) {
        // If user already exists in Auth, that's an inconsistent state.
        // We log it, but for robustness, we can try to find them and assign the role.
        if (error.code === 'auth/email-already-exists') {
            console.warn(`User ${requestData.email} already exists in Auth. Attempting to recover and assign admin role.`);
            userRecord = await admin.auth().getUserByEmail(requestData.email);
        } else {
             // For other errors (e.g., weak-password), we should fail.
            console.error('Error creating user in Firebase Auth:', error);
            return NextResponse.json({ message: error.message || "Impossibile creare l'utente in Firebase Auth." }, { status: 500 });
        }
    }

    // Now, create their document in the 'users' collection to assign the role
    const userDocRef = adminDb.collection('users').doc(userRecord.uid);
    await userDocRef.set({
      uid: userRecord.uid,
      email: userRecord.email,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Finally, delete the original request (which contains the plain-text password)
    await requestDocRef.delete();

    return NextResponse.json({ message: 'Utente approvato con successo.', uid: userRecord.uid }, { status: 200 });

  } catch (error: any) {
    console.error('Errore approvazione richiesta admin:', error);
    // Provide a more specific error if available
    const errorMessage = error.message || 'Si è verificato un errore del server.';
    const errorCode = error.code || 'UNKNOWN_ERROR';
    return NextResponse.json({ message: errorMessage, code: errorCode }, { status: 500 });
  }
}
