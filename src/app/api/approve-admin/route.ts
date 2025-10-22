// src/app/api/approve-admin/route.ts
import { NextResponse } from 'next/server';
import { getAdminServices } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin'; // Still needed for type definitions like UserRecord

export async function POST(request: Request) {
  // Use the centralized function to get admin services.
  const { adminDb, adminAuth, error: adminInitializationError } = getAdminServices();

  if (adminInitializationError || !adminDb || !adminAuth) {
    console.error('API Error: Firebase Admin SDK not initialized:', adminInitializationError);
    return NextResponse.json({ message: 'Errore di configurazione del server.' }, { status: 500 });
  }
  
  try {
    const { requestId } = await request.json();
    if (!requestId) {
      return NextResponse.json({ message: 'ID richiesta mancante.' }, { status: 400 });
    }

    const requestDocRef = adminDb.collection('adminRequests').doc(requestId);
    const requestDoc = await requestDocRef.get();

    if (!requestDoc.exists) {
      return NextResponse.json({ message: 'Richiesta non trovata.' }, { status: 404 });
    }

    const requestData = requestDoc.data();
    // Use the password directly from the request, as it should be in plain text.
    if (!requestData || !requestData.email || !requestData.password) {
      return NextResponse.json({ message: 'Dati richiesta non validi (email o password mancanti).' }, { status: 400 });
    }
    
    let userRecord: admin.auth.UserRecord;

    try {
        // Attempt to create the user in Firebase Authentication
        userRecord = await adminAuth.createUser({
            email: requestData.email,
            password: requestData.password,
            emailVerified: true, // Automatically verify the email for approved admins
            disabled: false,
        });
        console.log(`Successfully created new admin user in Auth with UID: ${userRecord.uid}`);
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            console.warn(`User ${requestData.email} already exists in Auth. Recovering user record to proceed.`);
            // If the user already exists in Auth (e.g., from a failed prior attempt),
            // get their record so we can still create their Firestore document.
            userRecord = await adminAuth.getUserByEmail(requestData.email);
        } else {
            console.error('Error creating user in Firebase Auth:', error);
            throw new Error(error.message || "Impossibile creare l'utente in Firebase Auth.");
        }
    }

    // Now, create the user's document in the 'users' collection with the 'admin' role.
    const userDocRef = adminDb.collection('users').doc(userRecord.uid);
    await userDocRef.set({
      uid: userRecord.uid,
      email: userRecord.email,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Finally, delete the pending request.
    await requestDocRef.delete();

    return NextResponse.json({ message: 'Utente approvato con successo.', uid: userRecord.uid }, { status: 200 });

  } catch (error: any) {
    console.error('Errore approvazione richiesta admin:', error);
    const errorMessage = error.message || 'Si è verificato un errore del server.';
    const errorCode = error.code || 'UNKNOWN_ERROR';
    return NextResponse.json({ message: errorMessage, code: errorCode }, { status: 500 });
  }
}
