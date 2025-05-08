// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

let adminDb: admin.firestore.Firestore | null = null;
let adminInitializationError: string | null = null; 
// let adminAuth: admin.auth.Auth | null = null; // Admin Auth SDK not used for client-side Firebase Auth flows

if (!admin.apps.length) {
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY; // Ensure this is set in your Vercel/server environment
  if (!serviceAccountEnv) {
    adminInitializationError = 'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.';
    console.error(`CRITICAL: ${adminInitializationError} This is required for server-side admin operations.`);
  } else {
    try {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com` // If using Realtime Database
      });
      adminDb = admin.firestore();
      // adminAuth = admin.auth(); 
      console.log('Firebase Admin SDK initialized successfully.');
    } catch (error: any) {
      adminInitializationError = `Error initializing Firebase Admin SDK: ${error.message}. Ensure FIREBASE_SERVICE_ACCOUNT_KEY is valid JSON.`;
      console.error(`CRITICAL: ${adminInitializationError}`);
    }
  }
} else {
  // If already initialized (e.g. HMR), get the default app's services
  adminDb = admin.app().firestore();
  // adminAuth = admin.app().auth();
  console.log('Firebase Admin SDK already initialized. Using existing instance.');
}

// Export adminDb for server-side Firestore access (e.g., Cloud Functions, API routes run on server)
// Export adminInitializationError to allow server-side components/routes to check initialization status
export { adminDb, adminInitializationError /*, adminAuth */ };
