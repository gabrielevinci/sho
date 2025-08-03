# Risoluzione Errore Date Personalizzate - Column "language" does not exist

## Problema Identificato
L'errore si verificava quando si tentava di applicare filtri con date personalizzate nelle statistiche dei link. Il sistema restituiva un errore 500 con il messaggio `column "language" does not exist`.

## Causa del Problema
Nel file `/app/api/stats/[shortCode]/route.ts`, la query SQL per le date personalizzate faceva riferimento a una colonna chiamata `language` che non esiste nella tabella `clicks`. 

La colonna corretta nella tabella `clicks` è denominata `language_device`.

## Schema della Tabella Clicks
```sql
CREATE TABLE clicks (
  id SERIAL PRIMARY KEY,
  link_id INTEGER NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  clicked_at_rome TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Rome'),
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  referrer TEXT,
  browser_name VARCHAR(50),
  language_device VARCHAR(10),  -- ← Questa è la colonna corretta
  device_type VARCHAR(20),
  os_name VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  timezone_device VARCHAR(50),
  click_fingerprint_hash VARCHAR(64),
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
)
```

## Soluzione Implementata
Correzione della query SQL nel filtro per date personalizzate:

**Prima (errato):**
```sql
COUNT(DISTINCT CASE WHEN language IS NOT NULL THEN language END) as lingua_count
```

**Dopo (corretto):**
```sql
COUNT(DISTINCT CASE WHEN language_device IS NOT NULL THEN language_device END) as lingua_count
```

## File Modificato
- `app/api/stats/[shortCode]/route.ts`

## Test
✅ Le date personalizzate ora funzionano correttamente
✅ Nessun errore 500 nelle richieste API  
✅ Le statistiche vengono calcolate correttamente per l'intervallo di date specificato

## Nota Tecnica
La differenza tra `language` e `language_device`:
- `language_device`: Memorizza la lingua principale del dispositivo dell'utente (es: "it", "en", "fr")
- Questo valore viene estratto dall'header `Accept-Language` del browser durante il click

La correzione garantisce che le statistiche per le date personalizzate includano correttamente il conteggio delle lingue uniche dei dispositivi che hanno cliccato sul link nell'intervallo di date specificato.
