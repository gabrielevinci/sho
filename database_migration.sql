-- ==============================================
-- MIGRAZIONE DATABASE per CLICK UNIVOCI
-- Database: sho-db
-- ==============================================

-- 1. Aggiungi la colonna user_fingerprint alla tabella clicks
ALTER TABLE clicks 
ADD COLUMN user_fingerprint VARCHAR(64);

-- 2. Crea un indice per migliorare le performance delle query sui click univoci
CREATE INDEX IF NOT EXISTS idx_clicks_user_fingerprint 
ON clicks(user_fingerprint);

-- 3. Crea un indice composito per ottimizzare le query di analisi
CREATE INDEX IF NOT EXISTS idx_clicks_link_fingerprint_date 
ON clicks(link_id, user_fingerprint, clicked_at);

-- 4. Aggiorna i record esistenti con un fingerprint basato sui dati disponibili
-- NOTA: Questo genererà fingerprint retroattivi basati sui dati esistenti
UPDATE clicks 
SET user_fingerprint = 
    SUBSTR(
        MD5(
            COALESCE(browser_name, 'unknown') || 
            COALESCE(device_type, 'unknown') || 
            COALESCE(os_name, 'unknown') ||
            COALESCE(country, 'unknown')
        ), 
        1, 16
    )
WHERE user_fingerprint IS NULL;

-- 5. Rendi la colonna NOT NULL dopo aver popolato i dati esistenti
ALTER TABLE clicks 
ALTER COLUMN user_fingerprint SET NOT NULL;

-- 6. Verifica dei dati dopo la migrazione
-- Query di test per verificare che tutto funzioni correttamente:

-- Test 1: Conteggio totale dei click vs click univoci
SELECT 
    COUNT(*) as total_clicks,
    COUNT(DISTINCT user_fingerprint) as unique_clicks,
    ROUND(
        (COUNT(DISTINCT user_fingerprint)::FLOAT / COUNT(*)) * 100, 
        2
    ) as unique_percentage
FROM clicks;

-- Test 2: Click univoci per link (top 10)
SELECT 
    l.short_code,
    l.original_url,
    COUNT(*) as total_clicks,
    COUNT(DISTINCT c.user_fingerprint) as unique_clicks
FROM clicks c
JOIN links l ON c.link_id = l.id
GROUP BY l.id, l.short_code, l.original_url
ORDER BY unique_clicks DESC
LIMIT 10;

-- Test 3: Distribuzione dei fingerprint (verifica che non ci siano troppi duplicati)
SELECT 
    user_fingerprint,
    COUNT(*) as click_count
FROM clicks
GROUP BY user_fingerprint
HAVING COUNT(*) > 10  -- Mostra fingerprint con più di 10 click (possibili bot o sessioni molto attive)
ORDER BY click_count DESC
LIMIT 20;

-- ==============================================
-- ISTRUZIONI PER L'ESECUZIONE:
-- ==============================================
-- 1. Connettiti al database sho-db
-- 2. Esegui questo script in una transazione per sicurezza:
--    BEGIN;
--    [esegui il contenuto di questo file]
--    COMMIT;
-- 3. Verifica i risultati con le query di test
-- 4. Aggiorna il codice dell'applicazione per utilizzare la nuova colonna
-- ==============================================
