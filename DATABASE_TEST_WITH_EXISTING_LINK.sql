-- APPROCCIO ALTERNATIVO - USA LINK ESISTENTE
-- Se hai già dei link nella tabella, usa questo approccio più semplice

-- 1. TROVA TUTTI I LINK ESISTENTI
SELECT id, short_code, original_url, click_count FROM links ORDER BY id;

-- 2. SCEGLI UN LINK_ID ESISTENTE E SOSTITUISCI 'YOUR_LINK_ID' CON L'ID REALE
-- Esempio: se hai un link con id=5, sostituisci YOUR_LINK_ID con 5

-- 3. TEST INSERIMENTO CON LINK_ID REALE
INSERT INTO advanced_fingerprints (
  link_id, 
  fingerprint_hash, 
  user_agent, 
  platform, 
  country, 
  ip_address
) VALUES (
  YOUR_LINK_ID, 
  'test_fingerprint_real', 
  'Mozilla/5.0 Test Browser', 
  'Windows', 
  'IT', 
  '192.168.1.1'
);

-- 4. VERIFICA INSERIMENTO
SELECT * FROM advanced_fingerprints WHERE fingerprint_hash = 'test_fingerprint_real';

-- 5. TEST VISTA RIEPILOGATIVA
SELECT * FROM fingerprint_summary WHERE link_id = YOUR_LINK_ID;

-- 6. PULIZIA TEST
DELETE FROM advanced_fingerprints WHERE fingerprint_hash = 'test_fingerprint_real';
