// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

let adminDb: admin.firestore.Firestore | null = null;
let adminInitializationError: string | null = null; 

if (!admin.apps.length) {
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountEnv) {
    adminInitializationError = 'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.';
    console.error(`CRITICAL: ${adminInitializationError}`);
    // adminDb remains null
  } else {
    try {
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
      // Catches errors from JSON.parse or admin.initializeApp
      adminInitializationError = `Error initializing Firebase Admin SDK: ${error.message}. Ensure FIREBASE_SERVICE_ACCOUNT_KEY is valid JSON.`;
      console.error(`CRITICAL: ${adminInitializationError}`);
      // adminDb remains null
    }
  }
} else {
  // If admin.apps.length > 0, it means it's already initialized (e.g., due to HMR)
  // Get the default app's firestore instance
  adminDb = admin.app().firestore();
  // adminAuth = admin.app().auth(); // Uncomment if you plan to use adminAuth
  console.log('Firebase Admin SDK already initialized. Using existing instance.');
}

export { adminDb, adminInitializationError /*, adminAuth */ };
