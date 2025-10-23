# Analisi del Progetto: Applicazione di Ricerca Prodotti

Questo documento analizza l'applicazione web per la ricerca e gestione di prodotti, sviluppata come progetto universitario. La relazione copre i requisiti funzionali e non funzionali, le tecnologie utilizzate, l'architettura del software e il funzionamento del sistema in base ai ruoli utente.

---

## 1. Analisi dei Requisiti

### 1.1. Requisiti Funzionali (RF)

I requisiti funzionali descrivono *cosa* il sistema deve fare.

| ID | Requisito Funzionale | Stato di Implementazione |
| :-- | :--- | :--- |
| **RF1** | **Autenticazione Utenti** | **Completato**. Il sistema permette agli utenti di registrarsi e accedere tramite email e password. |
| **RF2** | **Gestione Ruoli Utente** | **Completato**. Il sistema supporta tre ruoli: `user`, `admin`, e `super-admin`, con permessi distinti. |
| **RF3** | **Registrazione Condizionale** | **Completato**. Gli utenti `user` possono registrarsi direttamente. Gli `admin` devono inviare una richiesta che necessita di approvazione. |
| **RF4** | **Ricerca Prodotti** | **Completato**. Tutti gli utenti autenticati possono cercare prodotti per nome o codice. |
| **RF5** | **Visualizzazione Prodotti** | **Completato**. I risultati della ricerca sono mostrati in una tabella con dettagli come nome, codice, prezzo e server di provenienza. |
| **RF6** | **Aggiunta Prodotti (Admin)** | **Completato**. Gli utenti con ruolo `admin` e `super-admin` possono aggiungere nuovi prodotti al sistema. |
| **RF7** | **Modifica Prodotti (Admin)** | **Completato**. Gli `admin` possono modificare solo i prodotti da loro creati. Il `super-admin` può modificare qualsiasi prodotto. |
| **RF8** | **Eliminazione Prodotti (Admin)** | **Completato**. Gli `admin` possono eliminare solo i loro prodotti. Il `super-admin` può eliminare qualsiasi prodotto. |
| **RF9** | **Gestione Richieste Admin (Super Admin)** | **Completato**. Il `super-admin` può visualizzare, approvare o rifiutare le richieste di registrazione degli `admin`. |
| **RF10**| **Gestione Utenti (Super Admin)** | **Completato**. Il `super-admin` può visualizzare ed eliminare qualsiasi utente (escluso se stesso). |
| **RF11**| **Gestione Prodotti Amministrata (Super Admin)** | **Completato**. Durante l'eliminazione di un `admin`, il `super-admin` può decidere se riassegnare a sé i prodotti dell'admin o eliminarli. |
| **RF12**| **Notifiche in Tempo Reale** | **Completato**. Il sistema notifica gli utenti su eventi rilevanti (es. aggiunta/modifica/eliminazione di prodotti, nuove richieste admin) tramite un centro notifiche. |

### 1.2. Requisiti Non Funzionali (RNF)

I requisiti non funzionali descrivono *come* il sistema deve operare.

| ID | Requisito Non Funzionale | Stato di Implementazione |
| :-- | :--- | :--- |
| **RNF1** | **Usabilità** | **Completato**. L'interfaccia è moderna, reattiva e intuitiva, realizzata con componenti predefiniti (ShadCN/UI) e un layout coerente. L'uso di `toast` e `loader` fornisce feedback chiari all'utente. |
| **RNF2** | **Performance** | **Completato**. L'architettura Next.js App Router con Server Components e la gestione dello stato reattiva (Zustand) garantiscono tempi di caricamento rapidi e un'esperienza fluida. Le operazioni sul database sono ottimizzate tramite listener in tempo reale. |
| **RNF3** | **Scalabilità** | **Parzialmente Completato**. L'uso di Firebase Firestore con sharding (database multipli) pone le basi per una scalabilità orizzontale. L'architettura serverless di Firebase gestisce automaticamente le risorse. |
| **RNF4** | **Sicurezza** | **Completato**. L'autenticazione è gestita da Firebase Authentication. La logica di autorizzazione è implementata sia a livello di interfaccia (mostrando/nascondendo elementi) sia a livello di API (endpoint protetti) e regole Firestore (non visibili nel codice ma assunte). |
| **RNF5** | **Manutenibilità** | **Completato**. Il codice è organizzato in moduli (componenti, store, lib) con responsabilità chiare. L'uso di TypeScript e di uno state manager centralizzato (Zustand) facilita la comprensione e la modifica del codice. |
| **RNF6** | **Responsività** | **Completato**. L'applicazione è progettata con Tailwind CSS per adattarsi a diverse dimensioni di schermo, da dispositivi mobili a desktop. |

---

## 2. Tecnologie Utilizzate

- **Frontend Framework**: **Next.js (React)** - Utilizzato per il rendering lato server (SSR) e la generazione di siti statici (SSG), con l'architettura App Router per un routing moderno e performante.
- **Linguaggio**: **TypeScript** - Aggiunge la tipizzazione statica a JavaScript, migliorando la robustezza e la manutenibilità del codice.
- **Styling**: **Tailwind CSS** e **ShadCN/UI** - Tailwind CSS per uno styling a basso livello basato su utility, e ShadCN/UI per una libreria di componenti UI riutilizzabili, accessibili e personalizzabili.
- **Backend-as-a-Service (BaaS)**: **Firebase**
    - **Firestore**: Database NoSQL in tempo reale utilizzato per la persistenza dei dati (prodotti, utenti, richieste admin). È stata implementata una logica di **sharding** manuale per distribuire i prodotti su più istanze di database (`shard-a`, `shard-b`, `shard-c`).
    - **Firebase Authentication**: Servizio per la gestione completa del ciclo di vita dell'autenticazione (registrazione, login, logout, gestione sessioni).
- **State Management**: **Zustand** - Una libreria di gestione dello stato per React, leggera e basata su hook, utilizzata per centralizzare e condividere lo stato dell'applicazione (es. stato di autenticazione, lista prodotti, notifiche).
- **API Backend**: **Next.js API Routes** - Utilizzate per creare endpoint server-side (es. `/api/approve-admin`) che interagiscono con il Firebase Admin SDK per operazioni privilegiate.
- **Librerie Ausiliarie**: `react-hook-form` e `zod` per la validazione dei form, `lucide-react` per le icone, `date-fns` per la formattazione delle date.

---

## 3. Architettura e Moduli Principali

L'applicazione segue un'architettura a componenti basata su Next.js, con una chiara separazione delle responsabilità.

### 3.1. `src/store/` - State Management (Zustand)

Questo è il cuore logico dell'applicazione client-side. Ogni "store" gestisce una porzione specifica dello stato globale e le relative azioni.

- **`auth-store.ts`**: Gestisce lo stato dell'utente (loggato/non loggato, ruolo, UID). Si interfaccia con Firebase Authentication e recupera i dati dell'utente da Firestore. Avvia e termina i listener degli altri store in base allo stato di autenticazione.
- **`product-store.ts`**: Gestisce la logica dei prodotti. Ascolta in tempo reale le modifiche su tutti gli "shard" di Firestore, aggiorna la lista locale dei prodotti, gestisce l'aggiunta/modifica/eliminazione e implementa la logica di notifica per questi eventi.
- **`admin-store.ts`**: Specifico per il `super-admin`, si mette in ascolto sulla collezione `adminRequests` per gestire le richieste di registrazione degli admin.
- **`user-management-store.ts`**: Anch'esso per il `super-admin`, gestisce la lista di tutti gli utenti e le operazioni di eliminazione.
- **`notification-store.ts`**: Aggrega le notifiche generate dagli altri store, le rende persistenti nel `localStorage` e gestisce lo stato di "letto/non letto".

### 3.2. `src/components/` - Componenti UI

Contiene tutti i componenti React riutilizzabili.
- **`ui/`**: Componenti base forniti da ShadCN (es. `Button`, `Card`, `Table`).
- **Componenti Funzionali**: (es. `admin-products-list.tsx`, `search-results.tsx`, `user-management.tsx`). Questi componenti si "agganciano" agli store Zustand per ottenere i dati e le funzioni necessarie a svolgere il loro compito, mantenendo la logica di business separata dalla UI.
- **`notification-center.tsx`**: Un esempio perfetto di questa architettura. Il componente si collega allo `notification-store` e allo `auth-store` per visualizzare le notifiche pertinenti al ruolo dell'utente, senza conoscere i dettagli di come queste notifiche vengono generate.

### 3.3. `src/app/` - Routing e Pagine

Implementa il routing basato su App Router di Next.js.
- **`(pagine)`**: Ogni cartella corrisponde a una rotta (es. `/login`, `/super-admin/dashboard`).
- **`page.tsx`**: Il file principale di ogni rotta, che assembla i componenti per costruire la pagina.
- **`layout.tsx`**: Definisce la struttura comune delle pagine (es. include il font, il `Toaster` per le notifiche a comparsa).
- **`api/`**: Contiene le API server-side che eseguono operazioni sicure utilizzando il **Firebase Admin SDK**, come la creazione di un utente `admin` dopo l'approvazione.

---

## 4. Funzionamento per Ruolo Utente

### 4.1. Utente (`user`)

- **Flusso**: Si registra, accede e atterra sulla pagina principale.
- **Permessi**:
    - **Visualizzazione**: Può cercare e visualizzare tutti i prodotti nel sistema.
    - **Limitazioni**: Non può aggiungere, modificare o eliminare prodotti. Vede dei pannelli informativi che spiegano queste limitazioni.
- **Interfaccia**: Vede la barra di ricerca, i risultati e i controlli di autenticazione. Le sezioni per l'aggiunta e la gestione dei prodotti sono sostituite da messaggi.

### 4.2. Amministratore (`admin`)

- **Flusso**: Deve richiedere la registrazione. Dopo l'approvazione del `super-admin`, può accedere.
- **Permessi**:
    - Eredita tutti i permessi dell'utente `user`.
    - **Aggiunta Prodotti**: Può aggiungere nuovi prodotti attraverso un form dedicato. Il sistema determina automaticamente lo "shard" corretto in base al codice prodotto.
    - **Gestione Prodotti Proprietari**: Può visualizzare, modificare ed eliminare **solo** i prodotti che ha aggiunto.
- **Interfaccia**: Oltre alla ricerca, vede un form per aggiungere prodotti e una tabella che elenca solo i prodotti da lui inseriti, con pulsanti per la modifica e l'eliminazione.

### 4.3. Super Amministratore (`super-admin`)

- **Flusso**: Accede tramite una pagina di login dedicata (`/super-admin`) e viene reindirizzato a una dashboard di gestione completa.
- **Permessi**: Ha il controllo totale sul sistema.
    - **Gestione Utenti**: Può visualizzare tutti gli utenti registrati (user, admin, super-admin) ed eliminare qualsiasi utente (tranne se stesso).
    - **Gestione Richieste Admin**: Vede le richieste di registrazione degli admin in tempo reale e può approvarle (creando l'utente) o rifiutarle.
    - **Gestione Globale dei Prodotti**: Può aggiungere, visualizzare, cercare, modificare ed eliminare **qualsiasi** prodotto nel sistema, indipendentemente da chi lo ha creato.
    - **Gestione Prodotti Admin Eliminati**: Quando elimina un utente `admin`, gli viene presentata una scelta: eliminare tutti i prodotti di quell'admin o riassegnarli al proprio account `super-admin`.
- **Interfaccia**: Ha una dashboard dedicata con schede per la gestione dei prodotti, degli utenti e delle richieste admin. Ha una visione globale e privilegi elevati su tutte le risorse.
