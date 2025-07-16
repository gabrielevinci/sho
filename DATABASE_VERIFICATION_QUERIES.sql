-- QUERY DI VERIFICA DATABASE FINGERPRINTING
-- Esegui queste query per verificare che tutto funzioni correttamente

-- 1. VERIFICA TABELLE ESISTENTI
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%fingerprint%' 
  OR table_name LIKE '%session%';

-- 2. VERIFICA STRUTTURA TABELLA PRINCIPALE
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'advanced_fingerprints'
ORDER BY ordinal_position;

-- 3. VERIFICA INDICI
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('advanced_fingerprints', 'fingerprint_interactions', 'user_sessions', 'daily_fingerprint_stats');

-- 4. VERIFICA VISTE
SELECT viewname, definition
FROM pg_views
WHERE viewname IN ('fingerprint_summary', 'browser_fingerprint_analysis');

-- 5. TROVA UN LINK_ID ESISTENTE
SELECT id FROM links LIMIT 1;

-- 6. TEST INSERIMENTO DATI (usa il link_id trovato sopra)
INSERT INTO advanced_fingerprints (
  link_id, 
  fingerprint_hash, 
  user_agent, 
  platform, 
  country, 
  ip_address
) VALUES (
  (SELECT id FROM links LIMIT 1), 
  'test_fingerprint_123', 
  'Mozilla/5.0 Test Browser', 
  'Windows', 
  'IT', 
  '192.168.1.1'
);

-- 7. VERIFICA INSERIMENTO
SELECT * FROM advanced_fingerprints WHERE fingerprint_hash = 'test_fingerprint_123';

-- 8. TEST VISTA RIEPILOGATIVA (usa il link_id dal test sopra)
SELECT * FROM fingerprint_summary 
WHERE link_id = (SELECT link_id FROM advanced_fingerprints WHERE fingerprint_hash = 'test_fingerprint_123' LIMIT 1);

-- 9. PULIZIA TEST
DELETE FROM advanced_fingerprints WHERE fingerprint_hash = 'test_fingerprint_123';

-- 10. CONTA RECORDS PER TABELLA
SELECT 
  'advanced_fingerprints' as table_name, 
  COUNT(*) as record_count 
FROM advanced_fingerprints
UNION ALL
SELECT 
  'fingerprint_interactions' as table_name, 
  COUNT(*) as record_count 
FROM fingerprint_interactions
UNION ALL
SELECT 
  'user_sessions' as table_name, 
  COUNT(*) as record_count 
FROM user_sessions
UNION ALL
SELECT 
  'daily_fingerprint_stats' as table_name, 
  COUNT(*) as record_count 
FROM daily_fingerprint_stats;

-- 11. VERIFICA DATI RECENTI (ultimi 7 giorni)
SELECT 
  DATE(first_seen) as date,
  COUNT(*) as fingerprints_count,
  COUNT(DISTINCT country) as unique_countries,
  COUNT(DISTINCT platform) as unique_platforms
FROM advanced_fingerprints 
WHERE first_seen >= NOW() - INTERVAL '7 days'
GROUP BY DATE(first_seen)
ORDER BY date DESC;
