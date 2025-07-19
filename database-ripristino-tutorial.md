# Tutorial per il ripristino del database SHO (Shorter Link)

Questo documento contiene le istruzioni per ripristinare il database necessario per il funzionamento dell'applicazione SHO (Shorter Link).

## Struttura del database

Il database è composto dalle seguenti tabelle principali:

1. **Tabelle principali**:
   - `users` - Per memorizzare gli utenti dell'applicazione
   - `workspaces` - Per organizzare i link in aree di lavoro
   - `folders` - Per organizzare i link in cartelle
   - `links` - La tabella centrale per i link abbreviati
   - `link_folder_associations` - Per gestire l'associazione tra link e cartelle
   - `clicks` - Per il tracciamento base dei clic

2. **Tabelle per Enhanced Fingerprinting**:
   - `enhanced_fingerprints` - Sistema migliorato di fingerprinting
   - `fingerprint_correlations` - Per correlare fingerprint tra dispositivi

3. **Tabelle per Advanced Fingerprinting**:
   - `advanced_fingerprints` - Sistema avanzato di fingerprinting con molti parametri
   - `fingerprint_interactions` - Per tracciare le interazioni dettagliate
   - `user_sessions` - Per gestire le sessioni utente
   - `daily_fingerprint_stats` - Per statistiche aggregate giornaliere

4. **Viste per Analytics**:
   - `fingerprint_summary` - Vista riassuntiva delle statistiche di fingerprinting
   - `browser_fingerprint_analysis` - Analisi dettagliate sui browser
   - `unified_click_analytics` - Analytics unificati sui clic
   - `link_analytics_view` - Analytics completi sui link

## Istruzioni per il ripristino

1. **Crea un database PostgreSQL vuoto**

2. **Esegui lo script SQL** presente nel file `database-setup-tutorial.sql` per creare tutte le tabelle e le viste necessarie

3. **Configura le variabili d'ambiente** nell'applicazione per la connessione al database:
   - POSTGRES_URL (URL di connessione completo)
   - POSTGRES_HOST (nome host o IP del server DB)
   - POSTGRES_PORT (porta, default 5432)
   - POSTGRES_DATABASE (nome del database)
   - POSTGRES_USER (username)
   - POSTGRES_PASSWORD (password)

4. **Riavvia l'applicazione**

## Manutenzione del database

- Esegui periodicamente `SELECT cleanup_old_fingerprints();` per rimuovere dati vecchi
- Controlla le performance delle query con `EXPLAIN ANALYZE`
- Considera l'uso di partitioning per tabelle che crescono molto (clicks, advanced_fingerprints)

## Note aggiuntive

- Lo script SQL crea tutti gli indici necessari per migliorare le prestazioni delle query
- Tutte le relazioni tra le tabelle sono mantenute con chiavi esterne appropriate
- Il sistema è progettato per tracciare diversi livelli di dettaglio sul comportamento degli utenti

Per qualsiasi problema di implementazione, controlla i log dell'applicazione e assicurati che le tabelle siano state create correttamente.
