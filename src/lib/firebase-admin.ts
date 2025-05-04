// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

// Ensure Firebase Admin is initialized only once
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // Add other config options if needed, e.g., databaseURL
      // databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
    // Optional: Throw the error if initialization is critical
    // throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
}

const adminDb = admin.firestore();
// const adminAuth = admin.auth(); // Use if integrating Firebase Auth features

export { adminDb /*, adminAuth */ };
