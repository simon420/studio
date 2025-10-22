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

  // Inizializzazione tramite file JSON delle credenziali
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require('../../../firebase-service-account.json');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('Firebase Admin SDK initialized successfully from service account file.');
    
    return {
      adminDb: admin.firestore(),
      adminAuth: admin.auth(),
      error: null,
    };
  } catch (e: any) {
    let errorMessage = `Errore nell'inizializzazione di Firebase Admin SDK: ${e.message}`;
    if (e.code === 'MODULE_NOT_FOUND') {
      errorMessage = "CRITICAL: File 'firebase-service-account.json' non trovato. Assicurati che il file esista nella root del progetto e contenga le credenziali corrette.";
    } else if (e.message.includes('Error parsing')) {
      errorMessage = "CRITICAL: Errore nel parsing del file 'firebase-service-account.json'. Assicurati che sia un JSON valido.";
    }
    
    console.error(errorMessage, e.stack);
    return { adminDb: null, adminAuth: null, error: errorMessage };
  }
}
