
// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, browserLocalPersistence, initializeAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey:  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDwFjZTrV8n0rtcH2Uv_dVlgdIU1dJ2bgE",
  authDomain:  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "product-finder-sis.firebaseapp.com",
  projectId:  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "product-finder-sis",
  storageBucket:  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "product-finder-sis.firebasestorage.app",
  messagingSenderId:  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "943639600743",
  appId:  process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:943639600743:web:e9cdeb179ddbb1202c3ec2",
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Default database
const db = getFirestore(app);

// Initialize sharded databases
const dbShardA = getFirestore(app, 'shard-a');
const dbShardB = getFirestore(app, 'shard-b');
const dbShardC = getFirestore(app, 'shard-c');

const shards = {
  'shard-a': dbShardA,
  'shard-b': dbShardB,
  'shard-c': dbShardC,
};

// Initialize Firebase Auth
let authInstance;
if (typeof window !== 'undefined') {
  authInstance = initializeAuth(app, {
    persistence: browserLocalPersistence
  });
} else {
  authInstance = getAuth(app);
}

export { app, db, authInstance as auth, shards };
