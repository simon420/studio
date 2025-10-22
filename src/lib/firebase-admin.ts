// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

// This function ensures the Firebase Admin SDK is initialized and returns its services.
// It's designed to be idempotent, meaning it will only initialize the app once.
export function getAdminServices() {
  // If the admin app is already initialized, return the services immediately.
  if (admin.apps.length > 0) {
    return {
      adminDb: admin.firestore(),
      adminAuth: admin.auth(),
      error: null,
    };
  }

  // IMPORTANT: The service account key is securely loaded from an environment variable.
  // This variable is managed by the Firebase Studio environment and should not be set manually.
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountEnv) {
    const error = 'CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.';
    console.error(error);
    return { adminDb: null, adminAuth: null, error };
  }

  try {
    // We need to parse the JSON string from the environment variable.
    const serviceAccount = JSON.parse(serviceAccountEnv);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    console.log('Firebase Admin SDK initialized successfully in getAdminServices.');
    
    return {
      adminDb: admin.firestore(),
      adminAuth: admin.auth(),
      error: null,
    };
  } catch (e: any) {
    const error = `Error initializing Firebase Admin SDK: ${e.message}. Ensure the service account key is a valid JSON.`;
    console.error(error);
    return { adminDb: null, adminAuth: null, error };
  }
}
