// src/app/api/super-admin/users/route.ts
import { NextResponse } from 'next/server';
import { getAdminServices } from '@/lib/firebase-admin';
import { UserRecord } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

// Helper to filter and map user data to not expose sensitive info
const mapUser = (user: UserRecord) => ({
  uid: user.uid,
  email: user.email,
  emailVerified: user.emailVerified,
  disabled: user.disabled,
  metadata: {
    creationTime: user.metadata.creationTime,
    lastSignInTime: user.metadata.lastSignInTime,
  },
  customClaims: user.customClaims,
});

export async function GET() {
  const { adminAuth, error } = getAdminServices();

  if (error || !adminAuth) {
    return NextResponse.json({ message: `Errore servizi Admin: ${error}` }, { status: 500 });
  }
  
  try {
    const listUsersResult = await adminAuth.listUsers();
    const users = listUsersResult.users.map(mapUser);
    return NextResponse.json({ users }, { status: 200 });
  } catch (err: any) {
    console.error('Errore nel recuperare la lista utenti:', err);
    return NextResponse.json({ message: 'Errore del server nel recuperare gli utenti.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { adminAuth, adminDb, error } = getAdminServices();
  
  if (error || !adminAuth || !adminDb) {
    return NextResponse.json({ message: `Errore servizi Admin: ${error}` }, { status: 500 });
  }

  try {
    const { uid } = await request.json();
    if (!uid) {
      return NextResponse.json({ message: 'UID utente mancante.' }, { status: 400 });
    }

    // Delete from Firebase Authentication
    await adminAuth.deleteUser(uid);
    
    // Delete from Firestore 'users' collection in the default database
    const userDocRef = adminDb.collection('users').doc(uid);
    await userDocRef.delete();
    
    return NextResponse.json({ message: `Utente con UID: ${uid} eliminato con successo.` }, { status: 200 });

  } catch (err: any) {
    console.error(`Errore nell'eliminare l'utente:`, err);
    if (err.code === 'auth/user-not-found') {
        return NextResponse.json({ message: 'Utente non trovato in Firebase Authentication.' }, { status: 404 });
    }
    return NextResponse.json({ message: `Errore del server nell'eliminare l'utente: ${err.message}` }, { status: 500 });
  }
}
