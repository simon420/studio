// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// import { getAuth } from 'firebase/auth'; // Import if using Firebase Auth

// Your web app's Firebase configuration
// IMPORTANT: Replace with your actual Firebase project configuration
// Consider using environment variables for sensitive information
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDwFjZTrV8n0rtcH2Uv_dVlgdIU1dJ2bgE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "product-finder-sis.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "product-finder-sis",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "product-finder-sis.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "943639600743",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:943639600743:web:e9cdeb179ddbb1202c3ec2",
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Optional
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
// const auth = getAuth(app); // Initialize Firebase Auth if needed

export { app, db /*, auth*/ };
