# Analisi del Progetto: Sistema Distribuito di Ricerca Prodotti

Questo documento analizza la progettazione e l'implementazione di un sistema distribuito per la ricerca di prodotti, sviluppato in conformità con la traccia di un progetto universitario. La relazione illustra come l'applicazione soddisfi i requisiti funzionali e non funzionali richiesti, facendo leva su soluzioni **Google Cloud** come **Firebase Firestore** per simulare un'architettura multi-server.

La traccia richiede la realizzazione di un sistema per la ricerca di informazioni su prodotti (nome, codice, prezzo) distribuiti su più server, consentendo a **utenti generici** di effettuare ricerche e a **gestori** di inserire e ricercare prodotti.

---

## 1. Analisi dei Requisiti

### 1.1. Requisiti Funzionali (RF)

I requisiti funzionali descrivono *cosa* il sistema deve fare, in linea con la traccia del progetto.

| ID | Requisito Funzionale (dalla traccia) | Implementazione e Stato |
| :-- | :--- | :--- |
| **RF1** | **Ricerca Prodotti da parte degli Utenti**: Gli utenti devono poter inserire termini di ricerca e visualizzare i risultati. | **Completato**. Tutti gli utenti autenticati (sia `user` che `admin`) possono utilizzare una barra di ricerca per trovare prodotti per nome o codice. I risultati vengono aggregati da tutti i "server" (shard di Firestore) e mostrati in una tabella chiara. |
| **RF2** | **Salvataggio Prodotti da parte dei Gestori**: I gestori devono poter salvare nuovi prodotti sui server. | **Completato**. Gli utenti con ruolo `admin` e `super-admin` (i "gestori" del sistema) possono aggiungere prodotti tramite un apposito form. Il sistema determina automaticamente su quale "server" (`shard`) salvare il prodotto in base al suo codice, implementando la logica di distribuzione. |
| **RF3** | **Ricerca Prodotti da parte dei Gestori**: I gestori devono poter effettuare ricerche su tutte le tabelle dei server. | **Completato**. I gestori (`admin`, `super-admin`) utilizzano la stessa potente funzione di ricerca degli utenti `user`, che opera in modo trasparente su tutti i database distribuiti. |
| **RF4** | **Autenticazione e Gestione Ruoli**: Il sistema deve distinguere tra "utenti" e "gestori" per applicare i permessi corretti. | **Completato**. Il sistema utilizza **Firebase Authentication** e supporta tre ruoli (`user`, `admin`, `super-admin`) che mappano perfettamente i concetti di "utente" e "gestore", con logiche di autorizzazione granulari. |
| **RF5** | **Gestione Privilegiata (Funzionalità Aggiuntiva)**: Il sistema deve offrire funzionalità avanzate per la gestione completa delle risorse. | **Completato**. Sono state implementate funzionalità avanzate non esplicitamente richieste ma essenziali per un sistema reale: modifica/eliminazione di prodotti (con permessi basati sulla proprietà), approvazione di nuovi gestori e gestione completa degli utenti da parte di un `super-admin`. |
| **RF6** | **Notifiche in Tempo Reale (Funzionalità Aggiuntiva)**: Il sistema notifica gli utenti su eventi rilevanti per promuovere la collaborazione. | **Completato**. Gli utenti ricevono notifiche in tempo reale (es. "Prodotto X modificato da Y"), migliorando la consapevolezza su un sistema distribuito. |

### 1.2. Requisiti Non Funzionali (RNF)

I requisiti non funzionali descrivono *come* il sistema deve operare, con particolare attenzione alle performance e alla scalabilità in un contesto distribuito.

| ID | Requisito Non Funzionale | Stato e Implementazione |
| :-- | :--- | :--- |
| **RNF1** | **Usabilità** | **Completato**. L'interfaccia è moderna e intuitiva (ShadCN/UI), fornendo feedback costanti tramite `toast`, `loader` e notifiche, rendendo semplice l'interazione con un sistema complesso. |
| **RNF2** | **Performance in Ambiente Distribuito** | **Completato**. L'architettura Next.js App Router con Server Components e l'uso di listener Firestore in tempo reale garantiscono un'esperienza reattiva. Le ricerche sono performanti nonostante la necessità di interrogare più database contemporaneamente. |
| **RNF3** | **Scalabilità e Distribuzione** | **Completato**. Questo è il cuore del progetto. L'uso di **Firebase Firestore** con una strategia di **sharding manuale** (database `shard-a`, `shard-b`, `shard-c`) simula efficacemente un sistema distribuito su più server. Questa architettura, basata su una soluzione Google Cloud, è nativamente scalabile. |
| **RNF4** | **Sicurezza** | **Completato**. **Firebase Authentication (Google Cloud)** gestisce l'autenticazione. Le regole di autorizzazione sono implementate sia a livello di UI (interfaccia dinamica per ruolo) sia a livello di API e regole di sicurezza Firestore (assunte), garantendo che ogni gestore possa modificare solo i propri dati (salvo il `super-admin`). |
| **RNF5** | **Manutenibilità** | **Completato**. L'uso di TypeScript, un'architettura a componenti e uno state management centralizzato (Zustand) rendono il codice modulare, comprensibile e facile da estendere. |
| **RNF6** | **Responsività** | **Completato**. L'applicazione si adatta a schermi di diverse dimensioni (desktop, mobile) grazie a Tailwind CSS. |

---

## 2. Tecnologie Utilizzate (Stack Google Cloud e Frontend Moderno)

- **Piattaforma Cloud**: **Google Cloud Platform (GCP)**. I requisiti di calcolo, storage e virtualizzazione sono soddisfatti tramite l'utilizzo dei servizi serverless di **Firebase**, che è parte integrante dell'offerta GCP.
- **Database Distribuito (Storage)**: **Firebase Firestore**. Utilizzato come database NoSQL in tempo reale. La richiesta di un sistema "multi-server" è stata implementata tramite **sharding**: sono state create più istanze di database (`shard-a`, `shard-b`, `shard-c`) e i prodotti vengono distribuiti tra di esse in base al loro codice. L'applicazione si connette e ascolta contemporaneamente tutti gli shard.
- **Autenticazione (Calcolo/Servizio)**: **Firebase Authentication**. Gestisce in modo sicuro la registrazione, il login e la gestione delle sessioni utente, fornendo la base per il sistema di ruoli.
- **Frontend Framework**: **Next.js (React)**. Scelta ideale per la sua performance (Server Components) e per la sua architettura moderna (App Router).
- **Linguaggio**: **TypeScript**. Per un codice robusto, manutenibile e con meno errori.
- **Styling**: **Tailwind CSS** e **ShadCN/UI**. Per un'interfaccia moderna, reattiva e personalizzabile.
- **State Management**: **Zustand**. Per una gestione dello stato client-side centralizzata, leggera e reattiva, essenziale per sincronizzare i dati provenienti dai vari shard.

---

## 3. Architettura del Sistema Distribuito e Moduli Chiave

### 3.1. `src/store/` - Il Cervello Logico del Sistema

Questa directory contiene gli store Zustand, che orchestrano la logica del sistema.

- **`auth-store.ts`**: Gestisce lo stato di autenticazione dell'utente e il suo ruolo. È il primo a entrare in gioco e determina quali listener devono essere attivati.
- **`product-store.ts`**: **Questo è il modulo chiave per la logica distribuita**.
    - La funzione `listenToAllProductShards` avvia un listener in tempo reale per **ciascuno shard** di Firestore (`shard-a`, `shard-b`, `shard-c`).
    - I dati provenienti da tutti i server vengono aggregati in un unico array di prodotti nello stato locale, fornendo una visione unificata del sistema.
    - La funzione `addProduct` contiene la logica di **sharding**: calcola lo shard corretto (`getShard`) in base al codice del prodotto e scrive il dato solo su quel database specifico.
    - Implementa la logica di notifica confrontando lo stato dei prodotti prima e dopo ogni aggiornamento ricevuto dai listener.
- **Store Amministrativi (`admin-store.ts`, `user-management-store.ts`)**: Gestiscono la logica specifica del `super-admin`, come l'approvazione di nuovi gestori e la gestione degli utenti.

### 3.2. `src/lib/firebase.ts` - Connessione all'Architettura Distribuita

Questo file è il punto di ingresso alla nostra architettura multi-database. Inizializza non solo la connessione principale a Firebase, ma anche le connessioni separate a **ciascuno shard** (`dbShardA`, `dbShardB`, `dbShardC`), rendendole disponibili al resto dell'applicazione.

### 3.3. `src/app/` e `src/components/` - Interfaccia Utente

- **Pagine e Routing**: L'App Router di Next.js definisce le pagine (`/login`, `/super-admin/dashboard`, etc.). La pagina principale `/` contiene la logica per renderizzare l'interfaccia corretta in base al ruolo utente, gestendo anche i reindirizzamenti.
- **Componenti**: I componenti React (`search-results.tsx`, `admin-products-list.tsx`, etc.) si collegano agli store Zustand per visualizzare i dati aggregati e per invocare le azioni (es. aggiunta, modifica). Sono "agnostici" rispetto alla provenienza dei dati; non sanno da quale shard arrivi un prodotto, ma lavorano sulla vista unificata fornita dal `product-store`.

---

## 4. Funzionamento per Ruolo Utente (Utente vs. Gestore)

### 4.1. Utente (`user`)

- **Flusso**: Si registra o accede. Atterra sulla pagina principale.
- **Permessi**: Come da traccia, può **solo ricercare e visualizzare prodotti**. Il sistema gli mostra i risultati aggregati da tutti i server in modo trasparente. Non può aggiungere, modificare o eliminare prodotti. L'interfaccia nasconde queste funzionalità.

### 4.2. Gestore (`admin`)

- **Flusso**: Deve inviare una richiesta di registrazione, che viene approvata dal `super-admin`. Una volta approvato, può accedere.
- **Permessi**:
    - **Ricerca Globale**: Può cercare e visualizzare tutti i prodotti, come un `user`.
    - **Salvataggio Prodotti**: Può **aggiungere nuovi prodotti**. Il sistema instrada automaticamente il nuovo prodotto allo shard corretto.
    - **Gestione Proprietaria**: Può modificare ed eliminare **solo** i prodotti che ha creato lui stesso, garantendo l'incapsulamento dei dati tra i gestori.

### 4.3. Super-Gestore (`super-admin`)

- **Flusso**: Accede tramite una pagina dedicata e viene reindirizzato a una dashboard di controllo totale.
- **Permessi**: Ha il controllo completo su tutto il sistema distribuito.
    - **Gestione Globale Prodotti**: Può aggiungere, visualizzare, modificare ed eliminare **qualsiasi prodotto su qualsiasi shard**, indipendentemente da chi lo ha creato.
    - **Gestione degli Altri Gestori**: Può approvare le richieste di registrazione degli `admin` e può eliminare qualsiasi utente o gestore dal sistema.
    - **Gestione dei Dati Orfani**: Quando elimina un `admin`, può decidere se riassegnare a sé stesso i prodotti di quell'admin o eliminarli, risolvendo un problema comune nei sistemi distribuiti.
