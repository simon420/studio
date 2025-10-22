// src/lib/firebase-admin.ts
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

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

  // Inizializzazione tramite file JSON delle credenziali letto dal filesystem
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
    const serviceAccountFile = fs.readFileSync(serviceAccountPath, 'utf-8');
    const serviceAccount = JSON.parse(serviceAccountFile);

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
    if (e instanceof SyntaxError) {
        errorMessage = "CRITICAL: Errore nel parsing del file 'firebase-service-account.json'. Assicurati che sia un JSON valido.";
    } else if (e.code === 'ENOENT') { // ENOENT: Error NO ENTry (file not found)
      errorMessage = "CRITICAL: File 'firebase-service-account.json' non trovato. Assicurati che il file esista nella root del progetto e contenga le credenziali corrette.";
    }
    
    console.error(errorMessage, e.stack);
    return { adminDb: null, adminAuth: null, error: errorMessage };
  }
}
