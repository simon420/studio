// src/app/api/approve-admin/route.ts
import { NextResponse } from 'next/server';
import { adminDb as preInitializedAdminDb, adminInitializationError as preInitializedError } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

// Helper function to initialize admin app if not already done
function ensureAdminInitialized() {
  if (admin.apps.length > 0) {
    return {
      adminDb: admin.firestore(),
      adminAuth: admin.auth(),
      error: null,
    };
  }

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountEnv) {
    return { adminDb: null, adminAuth: null, error: 'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.' };
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountEnv);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK initialized on-demand in API route.');
    return {
      adminDb: admin.firestore(),
      adminAuth: admin.auth(),
      error: null,
    };
  } catch (e: any) {
    return { adminDb: null, adminAuth: null, error: `Error initializing Firebase Admin SDK on-demand: ${e.message}` };
  }
}

export async function POST(request: Request) {
  const { adminDb, adminAuth, error: adminInitializationError } = ensureAdminInitialized();

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
            console.warn(`User ${requestData.email} already exists in Auth. Attempting to recover and assign admin role.`);
            userRecord = await adminAuth.getUserByEmail(requestData.email);
            // If the user already exists, we might want to just proceed to create the firestore doc
            // and don't need to throw an error. This makes the approval process idempotent.
        } else {
            console.error('Error creating user in Firebase Auth:', error);
            // This is a more specific error that will be thrown to the client
            throw new Error(error.message || "Impossibile creare l'utente in Firebase Auth.");
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
