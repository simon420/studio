
// src/app/api/approve-admin/route.ts
import { NextResponse } from 'next/server';
import { adminDb, adminInitializationError } from '@/lib/firebase-admin';
import * as bcrypt from 'bcrypt';
import * as admin from 'firebase-admin';

// This is a simplified check. In a real app, you'd have robust auth here.
// For example, checking if the request comes from an authenticated super-admin session.
function isSuperAdmin(request: Request): boolean {
  // For now, we'll allow requests from localhost in dev or a simple header check.
  // In production, this MUST be replaced with proper authentication.
  const host = request.headers.get('host');
  const isDev = process.env.NODE_ENV === 'development' && host?.startsWith('localhost');
  const superAdminHeader = request.headers.get('X-Super-Admin-Auth');
  // A real app would validate a JWT or session token here.
  return !!isDev || superAdminHeader === process.env.SUPER_ADMIN_API_KEY;
}

export async function POST(request: Request) {
  if (adminInitializationError) {
    console.error('API Error: Firebase Admin SDK not initialized:', adminInitializationError);
    return NextResponse.json({ message: 'Errore di configurazione del server.' }, { status: 500 });
  }

  //   if (!isSuperAdmin(request)) {
  //      return NextResponse.json({ message: 'Non autorizzato.' }, { status: 403 });
  //   }
  
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
    
    // The password is required to create a user. We need to decrypt it first.
    // For this example, we assume password is NOT stored encrypted and we pass it directly.
    // In a real-world scenario, you might pass the password from the client during approval
    // or use a temporary token. Storing raw passwords is not recommended.
    // **Correction**: We stored the hashed password, but Admin SDK needs the raw password.
    // The new flow saves the encrypted password, and we'll compare it here.
    // Let's adjust the flow: The API should receive the *raw* password to create the user.
    // But since we can't get it, we'll create the user and they'll have to reset their password.
    // A better flow: we'll create the user with the email and a *random* password, then
    // the super admin can communicate this to the user, or the user can use "Forgot Password".
    
    // Let's create the user in Firebase Auth. We must use the Admin SDK.
    let createdUser: admin.auth.UserRecord;
    try {
        createdUser = await admin.auth().createUser({
            email: requestData.email,
            password: 'temporaryPassword123!', // User must reset this
            emailVerified: true,
            disabled: false,
        });
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            // If the user somehow already exists in Auth, try to find them and set their role.
            createdUser = await admin.auth().getUserByEmail(requestData.email);
            console.warn(`Admin request for an existing auth user: ${requestData.email}. Proceeding to set user document.`);
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

    return NextResponse.json({ message: 'Utente approvato con successo.', uid: createdUser.uid }, { status: 200 });

  } catch (error: any) {
    console.error('Errore approvazione richiesta admin:', error);
    return NextResponse.json({ message: error.message || 'Si è verificato un errore del server.' }, { status: 500 });
  }
}

    