// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

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

  // IMPORTANTE: la chiave di servizio viene caricata in modo sicuro da una variabile d'ambiente.
  // Questa variabile ora è gestita tramite il file .env.local.
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountEnv || serviceAccountEnv === 'INCOLLA QUI LA TUA CHIAVE DI SERVIZIO JSON COMPLETA') {
    const error = 'CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY non è impostata nel file .env.local.';
    console.error(error);
    return { adminDb: null, adminAuth: null, error };
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountEnv);

    // Inizializza con il formato corretto della chiave privata
    admin.initializeApp({
      credential: admin.credential.cert({
        ...serviceAccount,
        private_key: serviceAccount.private_key.replace(/\\n/g, '\n'),
      }),
    });
    
    console.log('Firebase Admin SDK initialized successfully from .env.local.');
    
    return {
      adminDb: admin.firestore(),
      adminAuth: admin.auth(),
      error: null,
    };
  } catch (e: any) {
    let error;
    if (e instanceof SyntaxError) {
      error = `Errore nel parsing di FIREBASE_SERVICE_ACCOUNT_KEY come JSON: ${e.message}. Assicurati che sia una stringa JSON valida.`;
    } else {
      error = `Errore nell'inizializzazione di Firebase Admin SDK: ${e.message}`;
    }
    console.error(error);
    return { adminDb: null, adminAuth: null, error };
  }
}
