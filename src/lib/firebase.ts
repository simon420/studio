// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, browserLocalPersistence, initializeAuth, connectAuthEmulator } from 'firebase/auth'; // Import Firebase Auth

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey:  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDwFjZTrV8n0rtcH2Uv_dVlgdIU1dJ2bgE",
  authDomain:  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "product-finder-sis.firebaseapp.com",
  projectId:  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "product-finder-sis",
  storageBucket:  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "product-finder-sis.firebasestorage.app",
  messagingSenderId:  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "943639600743",
  appId:  process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:943639600743:web:e9cdeb179ddbb1202c3ec2",
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Optional
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);

// Initialize Firebase Auth
// Use initializeAuth for modular SDK to configure persistence
let authInstance;
if (typeof window !== 'undefined') {
  // Ensure this runs only on the client
  authInstance = initializeAuth(app, {
    persistence: browserLocalPersistence // Persist auth state in local storage
  });
  // Example for connecting to Auth Emulator - uncomment if you're using it
  // if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  //   try {
  //     connectAuthEmulator(authInstance, "http://localhost:9099", { disableWarnings: true });
  //     console.log("Connected to Firebase Auth Emulator");
  //   } catch (error) {
  //     console.error("Error connecting to Firebase Auth Emulator:", error);
  //   }
  // }
} else {
  // For server-side, getAuth can be used but won't have persistence in the same way
  // This instance is typically not used for actual auth operations on SSR directly for users.
  authInstance = getAuth(app);
}

export { app, db, authInstance as auth };
