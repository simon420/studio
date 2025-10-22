// src/lib/firebase-admin.ts
import admin from 'firebase-admin';

// Questa funzione assicura che Firebase Admin SDK sia inizializzato e restituisce i suoi servizi.
// È progettata per essere idempotente (esegue l'inizializzazione solo una volta).
export function getAdminServices() {
  // Se l'app admin è già inizializzata, restituisce immediatamente i servizi.
  if (admin.apps.length > 0 && admin.app()) {
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

  // Costruisce le credenziali dalle variabili d'ambiente individuali.
  try {
    // Controlla che le variabili d'ambiente essenziali esistano
    const requiredEnvVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL'
    ];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);

    if (missingVars.length > 0) {
        const error = `CRITICAL: Mancano variabili d'ambiente Firebase essenziali: ${missingVars.join(', ')}.`;
        console.error(error);
        return { adminDb: null, adminAuth: null, error };
    }

    // Pulisce la chiave privata: rimuove le virgolette e corregge gli "a capo"
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
      .replace(/^"|"$/g, '') // Rimuove le virgolette all'inizio e alla fine
      .replace(/\\n/g, '\n');

    const serviceAccount = {
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    };
    
    // Inizializza l'app con le credenziali certificate.
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('Firebase Admin SDK initialized successfully from environment variables.');
    
    return {
      adminDb: admin.firestore(),
      adminAuth: admin.auth(),
      error: null,
    };
  } catch (e: any) {
    const error = `Errore nell'inizializzazione di Firebase Admin SDK: ${e.message}`;
    console.error(error, e.stack); // Logga anche lo stack trace per un debug più approfondito
    return { adminDb: null, adminAuth: null, error };
  }
}
