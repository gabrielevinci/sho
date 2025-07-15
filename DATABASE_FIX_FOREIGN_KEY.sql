-- COMANDI DI FIX PER IL PROBLEMA DEL FOREIGN KEY
-- Esegui questi comandi per risolvere l'errore e testare correttamente

-- 1. VERIFICA SE HAI LINK ESISTENTI
SELECT id, short_code, original_url FROM links ORDER BY id LIMIT 5;

-- 2. SE NON HAI LINK, CREANE UNO DI TEST
INSERT INTO links (short_code, original_url, title, click_count, unique_click_count, created_at) 
VALUES ('test123', 'https://google.com', 'Test Link', 0, 0, NOW());

-- 3. VERIFICA CHE IL LINK SIA STATO CREATO
SELECT id FROM links WHERE short_code = 'test123';

-- 4. TEST INSERIMENTO CON LINK_ID CORRETTO (usa l'ID dal passo 3)
INSERT INTO advanced_fingerprints (
  link_id, 
  fingerprint_hash, 
  user_agent, 
  platform, 
  country, 
  ip_address
) VALUES (
  (SELECT id FROM links WHERE short_code = 'test123'), 
  'test_fingerprint_123', 
  'Mozilla/5.0 Test Browser', 
  'Windows', 
  'IT', 
  '192.168.1.1'
);

-- 5. VERIFICA INSERIMENTO
SELECT * FROM advanced_fingerprints WHERE fingerprint_hash = 'test_fingerprint_123';

-- 6. TEST VISTA RIEPILOGATIVA
SELECT * FROM fingerprint_summary 
WHERE link_id = (SELECT link_id FROM advanced_fingerprints WHERE fingerprint_hash = 'test_fingerprint_123');

-- 7. PULIZIA TEST
DELETE FROM advanced_fingerprints WHERE fingerprint_hash = 'test_fingerprint_123';
DELETE FROM links WHERE short_code = 'test123';

-- 8. VERIFICA PULIZIA
SELECT COUNT(*) FROM advanced_fingerprints WHERE fingerprint_hash = 'test_fingerprint_123';
SELECT COUNT(*) FROM links WHERE short_code = 'test123';
