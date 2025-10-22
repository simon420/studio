// src/app/api/approve-admin/route.ts
import { NextResponse } from 'next/server';
import { getAdminServices } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

export async function POST(request: Request) {
  const { adminDb, adminAuth, error: adminInitializationError } = getAdminServices();

  if (adminInitializationError) {
    console.error('API Error: Firebase Admin SDK initialization failed.', adminInitializationError);
    return NextResponse.json({ message: `Errore di inizializzazione dell'Admin SDK: ${adminInitializationError}` }, { status: 500 });
  }

  if (!adminDb) {
    console.error('API Error: Firestore service (adminDb) is not available.');
    return NextResponse.json({ message: 'Errore di configurazione del server: servizio Firestore non disponibile.' }, { status: 500 });
  }

  if (!adminAuth) {
    console.error('API Error: Authentication service (adminAuth) is not available.');
    return NextResponse.json({ message: 'Errore di configurazione del server: servizio di autenticazione non disponibile.' }, { status: 500 });
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
    if (!requestData || !requestData.email || !requestData.password) {
      return NextResponse.json({ message: 'Dati richiesta non validi (email o password mancanti).' }, { status: 400 });
    }
    
    let userRecord: admin.auth.UserRecord;

    try {
        userRecord = await adminAuth.createUser({
            email: requestData.email,
            password: requestData.password,
            emailVerified: true,
            disabled: false,
        });
        console.log(`Successfully created new admin user in Auth with UID: ${userRecord.uid}`);
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            console.warn(`User ${requestData.email} already exists in Auth. Recovering user record.`);
            userRecord = await adminAuth.getUserByEmail(requestData.email);
        } else {
            console.error('Error creating user in Firebase Auth:', error);
            throw new Error(`Impossibile creare l'utente in Firebase Auth: ${error.message}`);
        }
    }

    const userDocRef = adminDb.collection('users').doc(userRecord.uid);
    await userDocRef.set({
      uid: userRecord.uid,
      email: userRecord.email,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await requestDocRef.delete();

    return NextResponse.json({ message: 'Utente approvato con successo.', uid: userRecord.uid }, { status: 200 });

  } catch (error: any) {
    console.error('Errore approvazione richiesta admin:', error);
    const errorMessage = error.message || 'Si è verificato un errore del server.';
    const errorCode = error.code || 'UNKNOWN_ERROR';
    return NextResponse.json({ message: errorMessage, code: errorCode }, { status: 500 });
  }
}
