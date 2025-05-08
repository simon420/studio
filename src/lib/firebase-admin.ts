// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

let adminDb: admin.firestore.Firestore | null = null;
// let adminAuth: admin.auth.Auth | null = null; // Uncomment if you plan to use adminAuth

if (!admin.apps.length) {
  try {
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountEnv) {
      console.error('CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
    }
    
    const serviceAccount = JSON.parse(serviceAccountEnv);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // Add other config options if needed, e.g., databaseURL
      // databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    adminDb = admin.firestore();
    // adminAuth = admin.auth(); // Uncomment if you plan to use adminAuth
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('CRITICAL: Error initializing Firebase Admin SDK. adminDb will be null. Error:', error.message);
    // adminDb remains null if initialization fails
    // This ensures that attempts to use an uninitialized adminDb can be checked elsewhere.
  }
} else {
  // If admin.apps.length > 0, it means it's already initialized (e.g., due to HMR)
  // Get the default app's firestore instance
  adminDb = admin.app().firestore();
  // adminAuth = admin.app().auth(); // Uncomment if you plan to use adminAuth
  console.log('Firebase Admin SDK already initialized. Using existing instance.');
}

export { adminDb /*, adminAuth */ };
