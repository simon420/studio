
// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

// This function ensures the Firebase Admin SDK is initialized and returns its services.
// It's designed to be idempotent, meaning it will only initialize the app once.
export function getAdminServices() {
  // If the admin app is already initialized, return the services immediately.
  if (admin.apps.length > 0 && admin.app()) {
    console.log('Firebase Admin SDK already initialized. Returning existing services.');
    try {
        return {
            adminDb: admin.firestore(),
            adminAuth: admin.auth(),
            error: null,
        };
    } catch (e: any) {
        console.error('Error getting services from already initialized app:', e);
        return { adminDb: null, adminAuth: null, error: e.message };
    }
  }

  // IMPORTANT: The service account key is securely loaded from an environment variable.
  // This variable is managed by the Firebase Studio environment and should not be set manually.
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountEnv) {
    const error = 'CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set or empty.';
    console.error(error);
    return { adminDb: null, adminAuth: null, error };
  }

  console.log('FIREBASE_SERVICE_ACCOUNT_KEY environment variable found. Attempting to initialize Admin SDK...');

  try {
    const serviceAccount = JSON.parse(serviceAccountEnv);

    // Initialize with the corrected private key format
    admin.initializeApp({
      credential: admin.credential.cert({
        ...serviceAccount,
        private_key: serviceAccount.private_key.replace(/\\n/g, '\n'),
      }),
    });
    
    console.log('Firebase Admin SDK initialized successfully in getAdminServices.');
    
    return {
      adminDb: admin.firestore(),
      adminAuth: admin.auth(),
      error: null,
    };
  } catch (e: any) {
    let error;
    if (e instanceof SyntaxError) { // More specific error check for JSON parsing
      error = `Error parsing FIREBASE_SERVICE_ACCOUNT_KEY as JSON: ${e.message}`;
    } else {
      error = `Error initializing Firebase Admin SDK with parsed credentials: ${e.message}`;
    }
    console.error(error);
    // Log the first few characters of the env var to check if it's there without exposing it.
    console.error(`Received FIREBASE_SERVICE_ACCOUNT_KEY starting with: ${serviceAccountEnv.substring(0, 30)}...`);
    return { adminDb: null, adminAuth: null, error };
  }
}
