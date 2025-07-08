# Sistema di Cartelle per Link Shortener

## Panoramica
Il sistema di cartelle permette agli utenti di organizzare i propri link in cartelle nidificate all'interno dei workspace. Ogni workspace ha automaticamente una cartella "Tutti i link" che contiene tutti i link per default.

## Funzionalità implementate

### 1. Struttura delle cartelle
- **Cartelle nidificate**: Le cartelle possono contenere altre cartelle
- **Cartella "Tutti i link"**: Creata automaticamente per ogni workspace
- **Organizzazione gerarchica**: Visualizzazione ad albero nella sidebar

### 2. Operazioni disponibili

#### Gestione cartelle
- ✅ **Creare cartelle**: Nuove cartelle a livello root o come sottocartelle
- ✅ **Creare sottocartelle**: Cartelle nidificate all'interno di altre cartelle
- ✅ **Rinominare cartelle**: Modifica inline del nome della cartella
- ✅ **Eliminare cartelle**: Eliminazione ricorsiva di cartelle e contenuto
- ✅ **Navigazione**: Espandere/comprimere cartelle nell'albero

#### Gestione link
- ✅ **Spostare link**: Drag & drop per spostare link tra cartelle
- ✅ **Visualizzazione filtrata**: Mostrare solo link della cartella selezionata
- ✅ **Link non assegnati**: Tutti i link sono visibili in "Tutti i link"

### 3. Interfaccia utente

#### Sidebar delle cartelle
- Albero delle cartelle espandibile/comprimibile
- Icone per cartelle aperte/chiuse
- Pulsanti per azioni (crea, rinomina, elimina)
- Supporto drag & drop per spostare link

#### Area principale
- Visualizzazione filtrata dei link per cartella
- Contatore dei link per cartella
- Interfaccia drag & drop per spostare link

### 4. Drag & Drop
- **Trascinamento**: I link possono essere trascinati dalle card
- **Rilascio**: Le cartelle nella sidebar fungono da zone di rilascio
- **Feedback visivo**: Evidenziazione delle zone di rilascio attive
- **Animazioni**: Feedback visivo durante il trascinamento

## Struttura del database

### Tabella `folders`
```sql
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Modifica tabella `links`
```sql
ALTER TABLE links ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
```

## API Endpoints

### `/api/folders`
- **GET**: Recupera tutte le cartelle di un workspace
- **POST**: Crea una nuova cartella
- **PUT**: Rinomina una cartella
- **DELETE**: Elimina una cartella

### `/api/links/move`
- **PUT**: Sposta un link in una cartella diversa

## Componenti React

### `FolderSidebar`
- Visualizza l'albero delle cartelle
- Gestisce le operazioni CRUD sulle cartelle
- Supporta drag & drop per ricevere link

### `LinkCard`
- Visualizza informazioni del link
- Supporta drag & drop per spostare link
- Azioni per modificare/eliminare link

### `FolderizedLinksList`
- Lista filtrata dei link per cartella
- Gestisce la visualizzazione dei link

## Installazione e Setup

### 1. Eseguire le migrazioni SQL
```sql
-- Eseguire il contenuto di initialize_folders.sql
-- per creare le tabelle e inizializzare i dati
```

### 2. Installare dipendenze
```bash
npm install @heroicons/react
```

### 3. Riavviare l'applicazione
```bash
npm run dev
```

## Utilizzo

1. **Navigare alla dashboard**: `/dashboard`
2. **Selezionare workspace**: Se ci sono più workspace
3. **Creare cartelle**: Pulsante "Nuova Cartella" nella sidebar
4. **Organizzare link**: Trascinare i link dalle card alle cartelle
5. **Gestire cartelle**: Hover sulle cartelle per vedere le azioni disponibili

## Caratteristiche tecniche

- **Sicurezza**: Tutte le operazioni verificano l'ownership dell'utente
- **Performance**: Queries ottimizzate con indici appropriati
- **UX**: Feedback visivo immediato per tutte le operazioni
- **Responsive**: Layout adattivo per dispositivi mobili
- **Accessibilità**: Supporto keyboard e screen reader

## Note importanti

- La cartella "Tutti i link" non può essere eliminata
- L'eliminazione di una cartella elimina ricorsivamente tutte le sottocartelle
- I link in cartelle eliminate vengono spostati nella cartella "Tutti i link"
- Il drag & drop funziona solo su desktop/tablet con pointer device
