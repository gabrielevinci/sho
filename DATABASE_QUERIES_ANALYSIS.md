# Analisi Query Database per Grafico Statistiche

## File Analizzato
- **Percorso**: `/app/api/links/[shortCode]/stats/route.ts`
- **Scopo**: API endpoint per fornire dati al grafico delle statistiche

## Struttura Generale

### 1. Query Iniziale - Verifica Link
```sql
SELECT id FROM links 
WHERE short_code = ${shortCode} AND user_id = ${session.userId}
```
**Scopo**: Ottiene l'ID## 🔧 Risoluzione Problemi Comuni

### Errore 500 "Failed to load resource"
**Sintomo**: Console del browser mostra errore 500 per chiamate API
**Causa**: Mismatch delle porte tra client e server
**Soluzione**: 
1. Verifica su quale porta sta girando il server Next.js
2. Aggiorna `.env.local` con le variabili:
   ```
   NEXT_PUBLIC_APP_URL="http://localhost:[PORTA_CORRETTA]"
   NEXT_PUBLIC_SITE_URL="http://localhost:[PORTA_CORRETTA]"
   ```
3. Riavvia il server

### Errore 401 "Non autorizzato"
**Sintomo**: API restituisce errore di autenticazione
**Causa**: Sessione mancante o scaduta
**Soluzione**: Verifica che l'utente sia autenticato e che i cookie di sessione siano presenti

### Errori Webpack / Compilazione
**Sintomo**: `__webpack_modules__[moduleId] is not a function` o errori di compilazione
**Causa**: Cache corrotta o dipendenze inconsistenti
**Soluzione**:
1. **Pulizia completa**:
   ```bash
   # PowerShell
   Remove-Item -Recurse -Force .next
   Remove-Item -Recurse -Force node_modules
   npm cache clean --force
   
   # Bash/Linux
   rm -rf .next node_modules
   npm cache clean --force
   ```
2. **Reinstallazione**:
   ```bash
   npm install
   npm run dev
   ```
3. **Se persiste**, verifica la versione di Node.js (consigliata: 18+)

### Problemi di Porte Multiple
**Sintomo**: Server che cambia porta automaticamente (3000 → 3001 → 3003...)
**Causa**: Processi multipli di Next.js in esecuzione
**Soluzione**:
1. Chiudi tutti i terminali/processi Next.js attivi
2. Verifica con: `netstat -ano | findstr :3000` (Windows) o `lsof -i :3000` (Linux/Mac)
3. Termina i processi se necessario
4. Riavvia con `npm run dev`ce breve e verifica che appartenga all'utente

---

## Query per Ogni Filtro Temporale

### 2. Filtro "24h" - Ultime 24 ore (AGGIORNATO - VERSIONE AVANZATA)
```sql
WITH clicks_ranked AS (
  SELECT
    id,
    clicked_at_rome,
    click_fingerprint_hash,
    ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
  FROM
    clicks
  WHERE
    link_id = $1 AND
    clicked_at_rome >= NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '23 hours'
)
SELECT
  serie_oraria.ora AS ora_italiana,
  COALESCE(COUNT(cr.id), 0) AS click_totali,
  COALESCE(SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END), 0) AS click_unici
FROM
  generate_series(
    DATE_TRUNC('hour', NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '23 hours'),
    DATE_TRUNC('hour', NOW() AT TIME ZONE 'Europe/Rome'),
    '1 hour'
  ) AS serie_oraria(ora)
LEFT JOIN
  clicks_ranked cr ON DATE_TRUNC('hour', cr.clicked_at_rome) = serie_oraria.ora
GROUP BY
  serie_oraria.ora
ORDER BY
  serie_oraria.ora ASC;
```

**Parametri**: 
- `$1` = `linkId` (numero)

**Logica AVANZATA**:
- **CTE `clicks_ranked`**: Pre-filtra i click delle ultime 23 ore e assegna un rank per fingerprint
- **`ROW_NUMBER() OVER(PARTITION BY...)`**: Numera i click per ogni fingerprint unico in ordine cronologico
- **Filtro temporale**: Limita già nella CTE ai click delle ultime 23 ore per performance
- **Click unici accurati**: `SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END)` conta solo il primo click di ogni fingerprint
- **Vantaggi**: 
  - Più efficiente (pre-filtro temporale nella CTE)
  - Click unici precisi (prima occorrenza per fingerprint)
  - Migliore performance su dataset grandi
- **Differenza dalla versione precedente**: I click unici ora rappresentano veramente utenti unici, non solo fingerprint distinti per ora

---

### 3. Filtro "7d" - Ultimi 7 giorni (AGGIORNATO - VERSIONE AVANZATA)
```sql
WITH clicks_ranked AS (
  SELECT
    id,
    clicked_at_rome,
    click_fingerprint_hash,
    ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
  FROM
    clicks
  WHERE
    link_id = $1 AND
    clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '6 days')::date
)
SELECT
  serie_giornaliera.giorno AS data_italiana,
  COALESCE(COUNT(cr.id), 0) AS click_totali,
  COALESCE(SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END), 0) AS click_unici
FROM
  generate_series(
    DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '6 days'),
    DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome'),
    '1 day'
  ) AS serie_giornaliera(giorno)
LEFT JOIN
  clicks_ranked cr ON DATE_TRUNC('day', cr.clicked_at_rome) = serie_giornaliera.giorno
GROUP BY
  serie_giornaliera.giorno
ORDER BY
  serie_giornaliera.giorno ASC;
```

**Parametri**: 
- `$1` = `linkId` (numero)

**Logica AVANZATA**:
- **CTE `clicks_ranked`**: Pre-filtra i click degli ultimi 6 giorni + oggi e assegna un rank per fingerprint
- **`ROW_NUMBER() OVER(PARTITION BY...)`**: Numera i click per ogni fingerprint unico in ordine cronologico
- **Filtro temporale**: Limita già nella CTE ai click degli ultimi 7 giorni per performance
- **Click unici accurati**: `SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END)` conta solo il primo click di ogni fingerprint
- **Vantaggi**: 
  - Più efficiente (pre-filtro temporale nella CTE)
  - Click unici precisi (prima occorrenza per fingerprint nel periodo di 7 giorni)
  - Migliore performance su dataset grandi
  - Coerente con la logica del filtro "24h"
- **Differenza dalla versione precedente**: I click unici ora rappresentano veramente nuovi utenti unici nel periodo, non fingerprint distinti per giorno

---

### 4. Filtro "30d" - Ultimi 30 giorni (AGGIORNATO - VERSIONE AVANZATA)
```sql
WITH clicks_ranked AS (
  SELECT
    id,
    clicked_at_rome,
    click_fingerprint_hash,
    ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
  FROM
    clicks
  WHERE
    link_id = $1 AND
    clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '29 days')::date
)
SELECT
  serie_giornaliera.giorno AS data_italiana,
  COALESCE(COUNT(cr.id), 0) AS click_totali,
  COALESCE(SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END), 0) AS click_unici
FROM
  generate_series(
    DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '29 days'),
    DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome'),
    '1 day'
  ) AS serie_giornaliera(giorno)
LEFT JOIN
  clicks_ranked cr ON DATE_TRUNC('day', cr.clicked_at_rome) = serie_giornaliera.giorno
GROUP BY
  serie_giornaliera.giorno
ORDER BY
  serie_giornaliera.giorno ASC;
```

**Parametri**: 
- `$1` = `linkId` (numero)

**Logica AVANZATA**:
- **CTE `clicks_ranked`**: Pre-filtra i click degli ultimi 29 giorni + oggi e assegna un rank per fingerprint
- **`ROW_NUMBER() OVER(PARTITION BY...)`**: Numera i click per ogni fingerprint unico in ordine cronologico
- **Filtro temporale**: Limita già nella CTE ai click degli ultimi 30 giorni per performance
- **Click unici accurati**: `SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END)` conta solo il primo click di ogni fingerprint
- **Vantaggi**: 
  - Più efficiente (pre-filtro temporale nella CTE)
  - Click unici precisi (prima occorrenza per fingerprint nel periodo di 30 giorni)
  - Migliore performance su dataset grandi
  - Coerente con la logica dei filtri "24h" e "7d"
- **Differenza dalla versione precedente**: I click unici ora rappresentano veramente nuovi utenti unici nel periodo, non fingerprint distinti per giorno

---

### 5. Filtro "90d" - Ultimi 90 giorni (AGGIORNATO - VERSIONE AVANZATA)
```sql
WITH clicks_ranked AS (
  SELECT
    id,
    clicked_at_rome,
    click_fingerprint_hash,
    ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
  FROM
    clicks
  WHERE
    link_id = $1 AND
    clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '89 days')::date
)
SELECT
  serie_giornaliera.giorno AS data_italiana,
  COALESCE(COUNT(cr.id), 0) AS click_totali,
  COALESCE(SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END), 0) AS click_unici
FROM
  generate_series(
    DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '89 days'),
    DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome'),
    '1 day'
  ) AS serie_giornaliera(giorno)
LEFT JOIN
  clicks_ranked cr ON DATE_TRUNC('day', cr.clicked_at_rome) = serie_giornaliera.giorno
GROUP BY
  serie_giornaliera.giorno
ORDER BY
  serie_giornaliera.giorno ASC;
```

**Parametri**: 
- `$1` = `linkId` (numero)

**Logica AVANZATA**:
- **CTE `clicks_ranked`**: Pre-filtra i click degli ultimi 89 giorni + oggi e assegna un rank per fingerprint
- **`ROW_NUMBER() OVER(PARTITION BY...)`**: Numera i click per ogni fingerprint unico in ordine cronologico
- **Filtro temporale**: Limita già nella CTE ai click degli ultimi 90 giorni per performance
- **Click unici accurati**: `SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END)` conta solo il primo click di ogni fingerprint
- **Vantaggi**: 
  - Più efficiente (pre-filtro temporale nella CTE)
  - Click unici precisi (prima occorrenza per fingerprint nel periodo di 90 giorni)
  - Migliore performance su dataset grandi
  - Coerente con la logica dei filtri "24h", "7d" e "30d"
- **Differenza dalla versione precedente**: I click unici ora rappresentano veramente nuovi utenti unici nel periodo, non fingerprint distinti per giorno

---

### 6. Filtro "365d" - Ultimi 365 giorni (AGGIORNATO - VERSIONE AVANZATA)
```sql
WITH clicks_ranked AS (
  SELECT
    id,
    clicked_at_rome,
    click_fingerprint_hash,
    ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
  FROM
    clicks
  WHERE
    link_id = $1 AND
    clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '364 days')::date
)
SELECT
  serie_giornaliera.giorno AS data_italiana,
  COALESCE(COUNT(cr.id), 0) AS click_totali,
  COALESCE(SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END), 0) AS click_unici
FROM
  generate_series(
    DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '364 days'),
    DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome'),
    '1 day'
  ) AS serie_giornaliera(giorno)
LEFT JOIN
  clicks_ranked cr ON DATE_TRUNC('day', cr.clicked_at_rome) = serie_giornaliera.giorno
GROUP BY
  serie_giornaliera.giorno
ORDER BY
  serie_giornaliera.giorno ASC;
```

**Parametri**: 
- `$1` = `linkId` (numero)

**Logica AVANZATA**:
- **CTE `clicks_ranked`**: Pre-filtra i click degli ultimi 364 giorni + oggi e assegna un rank per fingerprint
- **`ROW_NUMBER() OVER(PARTITION BY...)`**: Numera i click per ogni fingerprint unico in ordine cronologico
- **Filtro temporale**: Limita già nella CTE ai click degli ultimi 365 giorni per performance
- **Click unici accurati**: `SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END)` conta solo il primo click di ogni fingerprint
- **Vantaggi**: 
  - Più efficiente (pre-filtro temporale nella CTE)
  - Click unici precisi (prima occorrenza per fingerprint nel periodo di 365 giorni)
  - Migliore performance su dataset grandi
  - Coerente con la logica dei filtri "24h", "7d", "30d" e "90d"
- **Differenza dalla versione precedente**: I click unici ora rappresentano veramente nuovi utenti unici nel periodo, non fingerprint distinti per giorno

---

### 7. Filtro "all" - Sempre (AGGIORNATO - VERSIONE AVANZATA)

```sql
WITH ranked_clicks AS (
  SELECT
    clicked_at_rome,
    click_fingerprint_hash,
    ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
  FROM
    clicks
  WHERE
    link_id = $1
),
daily_stats AS (
  SELECT
    DATE_TRUNC('day', clicked_at_rome) AS click_day,
    COUNT(*) AS total_clicks,
    COUNT(*) FILTER (WHERE rn = 1) AS unique_clicks
  FROM
    ranked_clicks
  GROUP BY
    click_day
)
SELECT
  serie.giorno AS data_italiana,
  COALESCE(ds.total_clicks, 0) AS click_totali,
  COALESCE(ds.unique_clicks, 0) AS click_unici
FROM
  generate_series(
    (SELECT COALESCE(DATE_TRUNC('day', MIN(clicked_at_rome)), (SELECT DATE(created_at AT TIME ZONE 'Europe/Rome') FROM links WHERE id = $1)) FROM clicks WHERE link_id = $1),
    DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome'),
    '1 day'
  ) AS serie(giorno)
LEFT JOIN
  daily_stats ds ON serie.giorno = ds.click_day
ORDER BY
  serie.giorno ASC;
```

**Parametri**:
- `$1` = `linkId` (numero)

**Logica AVANZATA**:
- **CTE `ranked_clicks`**: Assegna un rank a tutti i click per ogni fingerprint unico in ordine cronologico
- **CTE `daily_stats`**: Aggrega i click per giorno usando `COUNT(*) FILTER (WHERE rn = 1)` per click unici accurati
- **Serie temporale dinamica**: Inizia dal primo click o dalla data di creazione del link se non ci sono click
- **Click unici precisi**: `COUNT(*) FILTER (WHERE rn = 1)` conta solo il primo click di ogni fingerprint nella storia del link
- **Vantaggi**: 
  - Timeline completa dalla creazione o primo click
  - Click unici accurati su tutto l'arco di vita del link
  - Ottima performance anche con dataset molto grandi
  - Coerente con la logica avanzata degli altri filtri
- **Differenza dalla versione precedente**: 
  - Una singola query invece di query multiple e logica complessa
  - Click unici rappresentano veramente nuovi utenti nella storia del link
  - Gestione automatica di link senza click

---

### 8. Filtro "custom" - Date personalizzate (AGGIORNATO - VERSIONE AVANZATA)
```sql
WITH ranked_clicks AS (
  SELECT
    clicked_at_rome,
    click_fingerprint_hash,
    ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
  FROM
    clicks
  WHERE
    link_id = $1
),
daily_stats AS (
  SELECT
    DATE_TRUNC('day', clicked_at_rome) AS click_day,
    COUNT(*) AS total_clicks,
    COUNT(*) FILTER (WHERE rn = 1) AS unique_clicks
  FROM
    ranked_clicks
  WHERE
    clicked_at_rome >= $2::date 
    AND clicked_at_rome < ($3::date + INTERVAL '1 day')
  GROUP BY
    click_day
)
SELECT
  serie.giorno AS data_italiana,
  COALESCE(ds.total_clicks, 0) AS click_totali,
  COALESCE(ds.unique_clicks, 0) AS click_unici
FROM
  generate_series(
    $2::date,
    $3::date,
    '1 day'
  ) AS serie(giorno)
LEFT JOIN
  daily_stats ds ON serie.giorno = ds.click_day
ORDER BY
  serie.giorno ASC;
```

**Parametri**:
- `$1` = `linkId` (numero)
- `$2` = `startDate` (string YYYY-MM-DD)
- `$3` = `endDate` (string YYYY-MM-DD)

**Logica AVANZATA**:
- **CTE `ranked_clicks`**: Assegna un rank a tutti i click per ogni fingerprint unico in ordine cronologico (senza pre-filtro temporale)
- **CTE `daily_stats`**: Filtra per range di date personalizzato e aggrega usando `COUNT(*) FILTER (WHERE rn = 1)` per click unici accurati
- **Filtro temporale inclusivo**: `clicked_at_rome >= startDate AND clicked_at_rome < (endDate + 1 day)` include tutti i click del giorno finale
- **Click unici precisi**: `COUNT(*) FILTER (WHERE rn = 1)` conta solo il primo click di ogni fingerprint nella storia del link
- **Vantaggi**: 
  - Click unici accurati anche per range personalizzati
  - Coerente con tutti gli altri filtri ottimizzati
  - Gestione corretta dei click al confine delle date
  - Performance ottimizzata per range di date specifici
- **Differenza dalla versione precedente**: I click unici ora rappresentano veramente nuovi utenti unici nella storia del link, non solo fingerprint distinti nel range selezionato

---

## Tabelle Coinvolte

### Tabella `links`
- **Colonne usate**: `id`, `short_code`, `user_id`, `created_at`
- **Scopo**: Validazione link e proprietà, data di creazione

### Tabella `clicks` 
- **Colonne usate**: `id`, `link_id`, `clicked_at_rome`, `click_fingerprint_hash`
- **Scopo**: Dati effettivi dei click per calcoli

### Tabella `statistiche_link` (solo per verifica)
- **Colonne usate**: `link_id`, `click_totali_sempre`
- **Scopo**: Verifica coerenza con i dati pre-calcolati

---

## Potenziali Problemi Identificati

### 1. **Timezone Handling**
- Tutte le query usano `Europe/Rome`
- Campo `clicked_at_rome` dovrebbe già essere nella timezone corretta
- **Verifica**: Controlla che `clicked_at_rome` sia popolato correttamente

### 2. **Calcoli Click Totali**
- Formula: `COUNT(c.id)` dalla tabella `clicks`
- **Verifica**: Assicurati che ogni click abbia un ID unico

### 3. **Calcoli Click Unici**
- Formula: `COUNT(DISTINCT c.click_fingerprint_hash)`
- **Verifica**: 
  - Il campo `click_fingerprint_hash` è popolato per tutti i click?
  - Due click dello stesso utente hanno lo stesso fingerprint?

### 4. **Join Logic**
- Tutti i filtri fanno LEFT JOIN sulla condizione: `c.link_id = $1`
- **Verifica**: I link_id nella tabella clicks corrispondono agli ID della tabella links?

### 5. **Data Filtering**
- Per filtri temporali: `DATE(c.clicked_at_rome) = s.data`
- Per 24h: `DATE_TRUNC('hour', c.clicked_at_rome AT TIME ZONE 'Europe/Rome') = s.ora`
- **Verifica**: Il campo `clicked_at_rome` ha il formato timestamp corretto?

---

## Suggerimenti per il Debug

### 1. Verifica Dati Base
```sql
-- Controlla struttura tabella clicks
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clicks';

-- Conta totale click per il link
SELECT COUNT(*) as total_clicks, COUNT(DISTINCT click_fingerprint_hash) as unique_clicks
FROM clicks 
WHERE link_id = [TUO_LINK_ID];
```

### 2. Verifica Fingerprint
```sql
-- Controlla se ci sono fingerprint null
SELECT COUNT(*) as null_fingerprints
FROM clicks 
WHERE link_id = [TUO_LINK_ID] AND click_fingerprint_hash IS NULL;

-- Controlla distribuzione fingerprint
SELECT click_fingerprint_hash, COUNT(*) as click_count
FROM clicks 
WHERE link_id = [TUO_LINK_ID]
GROUP BY click_fingerprint_hash
ORDER BY click_count DESC
LIMIT 10;
```

### 3. Verifica Timezone
```sql
-- Controlla formato delle date
SELECT clicked_at_rome, DATE(clicked_at_rome), DATE_TRUNC('hour', clicked_at_rome)
FROM clicks 
WHERE link_id = [TUO_LINK_ID]
ORDER BY clicked_at_rome DESC
LIMIT 5;
```

---

## 🚀 Riepilogo Ottimizzazioni Query

### Filtri con Logica Avanzata (Window Functions)
**TUTTI i filtri** ora utilizzano la **versione avanzata** con `ROW_NUMBER() OVER()`:

✅ **24h** - Click unici accurati per utente nel periodo di 24 ore  
✅ **7d** - Click unici accurati per utente nel periodo di 7 giorni  
✅ **30d** - Click unici accurati per utente nel periodo di 30 giorni  
✅ **90d** - Click unici accurati per utente nel periodo di 90 giorni  
✅ **365d** - Click unici accurati per utente nel periodo di 365 giorni  
✅ **all** - Click unici accurati per utente nella storia completa del link  
✅ **custom** - Click unici accurati per utente nel range di date personalizzato

### Vantaggi delle Window Functions
1. **Precisione**: I click unici rappresentano veramente nuovi utenti nel periodo, non fingerprint distinti per giorno/ora
2. **Performance**: Pre-filtro temporale nella CTE riduce il dataset da processare
3. **Coerenza**: **TUTTI** i filtri usano la stessa logica avanzata
4. **Scalabilità**: Migliori performance su dataset grandi con molti click
5. **Completezza**: Copertura completa di tutti i tipi di filtro temporale

### Pattern Query Avanzata
```sql
WITH clicks_ranked AS (
  SELECT
    id, clicked_at_rome, click_fingerprint_hash,
    ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
  FROM clicks
  WHERE link_id = $1 AND clicked_at_rome >= [PERIODO_FILTRO]
)
SELECT
  serie.periodo AS data_italiana,
  COALESCE(COUNT(cr.id), 0) AS click_totali,
  COALESCE(SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END), 0) AS click_unici
FROM generate_series([RANGE_TEMPORALE]) AS serie(periodo)
LEFT JOIN clicks_ranked cr ON [JOIN_CONDITION]
GROUP BY serie.periodo
ORDER BY serie.periodo ASC;
```

---

## Note Finali

- **Coerenza**: Il filtro "all" dovrebbe mostrare gli stessi totali delle card del dashboard
- **Performance**: Le query con `generate_series` possono essere lente per periodi molto lunghi
- **Precisione**: I click unici dipendono dalla qualità del fingerprinting

---

## 🔧 Risoluzione Problemi Comuni

### Errore 500 "Failed to load resource"
**Sintomo**: Console del browser mostra errore 500 per chiamate API
**Causa**: Mismatch delle porte tra client e server
**Soluzione**: 
1. Verifica su quale porta sta girando il server Next.js
2. Aggiorna `.env.local` con le variabili:
   ```
   NEXT_PUBLIC_APP_URL="http://localhost:[PORTA_CORRETTA]"
   NEXT_PUBLIC_SITE_URL="http://localhost:[PORTA_CORRETTA]"
   ```
3. Riavvia il server

### Errore 401 "Non autorizzato"
**Sintoma**: API restituisce errore di autenticazione
**Causa**: Sessione mancante o scaduta
**Soluzione**: Verifica che l'utente sia autenticato e che i cookie di sessione siano presenti
