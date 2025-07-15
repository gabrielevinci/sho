# SETUP DATABASE FINGERPRINTING - ISTRUZIONI COMPLETE

## 📋 Procedura di Setup

### 1. BACKUP DEL DATABASE (RACCOMANDATO)
Prima di procedere, fai un backup del tuo database:
```bash
pg_dump your_database_name > backup_before_fingerprinting.sql
```

### 2. ESECUZIONE COMANDI DATABASE

#### Opzione A: Tramite Interface Web (Vercel, pgAdmin, etc.)
1. Accedi alla tua interface del database
2. Apri il file `DATABASE_SETUP_COMMANDS.sql`
3. Copia e incolla tutti i comandi
4. Esegui l'intero script

#### Opzione B: Tramite psql Command Line
```bash
psql -h your_host -U your_username -d your_database -f DATABASE_SETUP_COMMANDS.sql
```

#### Opzione C: Tramite Codice Node.js
Esegui il file di migrazione TypeScript esistente:
```bash
npm run ts-node database/migrations/create-advanced-fingerprint-tables.ts
```

### 3. VERIFICA INSTALLAZIONE
Dopo l'esecuzione, verifica che tutto sia andato a buon fine:

1. Apri il file `DATABASE_VERIFICATION_QUERIES.sql`
2. Esegui le query di verifica nel tuo database
3. Controlla che:
   - Tutte le tabelle siano state create
   - Tutti gli indici siano presenti
   - Le viste funzionino correttamente

### 4. TEST FUNZIONAMENTO
Per testare che il sistema funzioni:

1. Avvia la tua applicazione
2. Visita un link breve
3. Controlla che i dati vengano salvati:
```sql
SELECT COUNT(*) FROM advanced_fingerprints;
SELECT * FROM advanced_fingerprints ORDER BY first_seen DESC LIMIT 5;
```

## 📊 Struttura Database Creata

### Tabelle Principali:
- `advanced_fingerprints` - Dati principali del fingerprinting
- `fingerprint_interactions` - Interazioni dettagliate dell'utente
- `user_sessions` - Sessioni utente aggregate
- `daily_fingerprint_stats` - Statistiche giornaliere

### Indici Creati:
- Performance ottimizzate per query frequenti
- Indici unici per evitare duplicati
- Indici su date per analytics temporali

### Viste Create:
- `fingerprint_summary` - Riepilogo per analytics
- `browser_fingerprint_analysis` - Analisi browser-specific

## 🔍 Query Utili per Analytics

### Fingerprint più recenti:
```sql
SELECT * FROM advanced_fingerprints 
ORDER BY first_seen DESC 
LIMIT 10;
```

### Statistiche per link:
```sql
SELECT * FROM fingerprint_summary 
WHERE link_id = YOUR_LINK_ID;
```

### Paesi più attivi:
```sql
SELECT country, COUNT(*) as visits 
FROM advanced_fingerprints 
GROUP BY country 
ORDER BY visits DESC;
```

### Browser più usati:
```sql
SELECT platform, COUNT(*) as count 
FROM advanced_fingerprints 
GROUP BY platform 
ORDER BY count DESC;
```

## ⚠️ Note Importanti

1. **Compatibilità**: Il sistema mantiene la tabella `clicks` esistente
2. **Performance**: I dati avanzati vengono salvati in background
3. **Privacy**: Gli IP sono hashati automaticamente
4. **Storage**: Le tabelle possono crescere rapidamente con molti utenti

## 🚨 Troubleshooting

### Errore "table already exists"
```sql
DROP TABLE IF EXISTS advanced_fingerprints CASCADE;
```
Poi riesegui il setup.

### Errore "permission denied"
Assicurati che l'utente del database abbia i permessi per:
- CREATE TABLE
- CREATE INDEX  
- CREATE VIEW

### Performance lente
Verifica che gli indici siano stati creati:
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'advanced_fingerprints';
```

## ✅ Checklist Finale

- [ ] Backup database effettuato
- [ ] Script `DATABASE_SETUP_COMMANDS.sql` eseguito senza errori
- [ ] Query di verifica eseguite con successo
- [ ] Test inserimento dati funzionante
- [ ] Viste accessibili e funzionanti
- [ ] Applicazione redeployata (se necessario)

## 📞 Supporto

Se riscontri problemi durante il setup:
1. Controlla i log del database per errori specifici
2. Verifica la versione PostgreSQL (richiesta >= 12)
3. Assicurati che JSONB sia supportato
4. Controlla i permessi dell'utente database
