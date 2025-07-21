# Funzionalità Statistiche Link

## Panoramica
È stata implementata una nuova funzionalità completa per visualizzare le statistiche dettagliate di ogni singolo link creato nella piattaforma.

## Come Accedere alle Statistiche

### Dal Dashboard
1. Nella tabella dei link, ogni riga ora presenta un pulsante **verde con icona del grafico** (📊) come prima azione
2. Cliccare sull'icona per accedere alla pagina delle statistiche del link specifico

## Struttura della Pagina Statistiche

### 1. Blocco Informazioni Link
- **URL Shortato**: visualizzazione dell'URL accorciato con pulsante copia
- **Link Originale**: URL originale di destinazione
- **Descrizione**: descrizione del link (se presente)
- **Data di Creazione**: quando è stato creato il link
- **Pulsanti Azioni**: 
  - 📊 Statistiche (pagina corrente)
  - 📋 Copia URL shortato
  - ✏️ Modifica link
  - 📱 Codice QR
  - 📁 Gestione cartelle
  - 🔄 Azzera click
  - 🗑️ Elimina link

### 2. Filtri Temporali
Filtri disponibili per analizzare i dati in diversi periodi:
- **Sempre**: tutti i dati storici
- **24 ore**: ultimi dati di 24 ore
- **Ultimi 7 giorni**: settimana corrente
- **Ultimi 30 giorni**: mese corrente
- **Ultimi 90 giorni**: trimestre corrente
- **Ultimi 365 giorni**: anno corrente
- **Date personalizzate**: selezione di un range personalizzato

### 3. Card Statistiche
Tre card principali che mostrano i dati principali:

#### 🔵 Click Totali (Blu)
- Numero totale di click ricevuti dal link
- Include click multipli dello stesso utente

#### 🟢 Click Unici (Verde)
- Numero di click unici basati su fingerprint
- Ogni utente viene contato una sola volta

#### 🟣 Referrer Unici (Viola)
- Numero di referrer diversi che hanno generato click
- Esclude il traffico "Direct"

## Funzionalità Tecniche

### API Endpoints
- `GET /api/stats/[shortCode]`: Recupera statistiche del link
- `DELETE /api/links/[shortCode]/reset-clicks`: Azzera i click

### Filtri Supportati
- Query parameter `filter`: tipo di filtro temporale
- Query parameters `startDate` e `endDate`: per date personalizzate

### Calcolo delle Statistiche
- **Click Totali**: `COUNT(*)` dalla tabella clicks
- **Click Unici**: `COUNT(DISTINCT click_fingerprint_hash)` 
- **Referrer**: `COUNT(DISTINCT referrer WHERE referrer != 'Direct')`

## Design e UX

### Colori e Temi
- **Blu**: per click totali (colore primario)
- **Verde**: per click unici (rappresenta unicità)
- **Viola**: per referrer (diversificazione delle fonti)
- Design minimal e professionale con gradienti tenui

### Responsività
- Layout responsive per desktop, tablet e mobile
- Grid che si adatta automaticamente alla dimensione dello schermo
- Bottoni ottimizzati per touch su dispositivi mobili

### Animazioni
- Hover effects sulle card statistiche
- Transizioni fluide sui pulsanti
- Loading states durante il caricamento dei dati

## Integrazione con Sistema Esistente

### Componenti Riutilizzati
- `LinkActions`: esteso con nuove funzionalità
- Sistema di toast per notifiche
- Modal di conferma per azioni distruttive
- Stili CSS globali esistenti

### Nuovi Componenti
- Pagina statistiche completa (`/dashboard/stats/[shortCode]`)
- API per statistiche e reset click
- Stili CSS personalizzati per le card

### Database
- Utilizza tabelle esistenti: `links` e `clicks`
- Nessuna modifica al database richiesta
- Calcoli real-time sulle query

## Note di Sicurezza
- Verifica autenticazione per tutte le API
- Controllo ownership del link prima di mostrare statistiche
- Sanitizzazione dei parametri di input
- Protezione contro SQL injection con template strings

## Prossimi Sviluppi Possibili
- Grafici temporali per visualizzare trends
- Breakdown geografico dei click
- Analisi dettagliata dei referrer
- Export dati in CSV/PDF
- Confronto tra multiple link
- Alert automatici su soglie di click
