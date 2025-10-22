
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
    
    let userRecord: admin.auth.UserRecord;

    try {
        // Check if user already exists
        userRecord = await admin.auth().getUserByEmail(requestData.email);
        console.log(`User ${requestData.email} already exists in Auth. UID: ${userRecord.uid}. Proceeding to create Firestore doc.`);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            // User does not exist, so create them
            console.log(`User ${requestData.email} not found in Auth. Creating new user.`);
            userRecord = await admin.auth().createUser({
                email: requestData.email,
                password: requestData.hashedPassword, // SECURITY: This is insecure. The password should be sent from the client.
                emailVerified: true,
                disabled: false,
            });
        } else {
            // A different kind of auth error occurred, re-throw it.
            console.error('Error checking for user in Firebase Auth:', error);
            throw error;
        }
    }

    // Now, create their document in the 'users' collection
    const userDocRef = adminDb.collection('users').doc(userRecord.uid);
    await userDocRef.set({
      uid: userRecord.uid,
      email: userRecord.email,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Finally, delete the original request
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
