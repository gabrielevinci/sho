// Test con link reale per verificare il database
console.log('=== Test Click Reale con Database ===\n');

const testUrl = 'http://localhost:3000/test-device-correlation'; // Usa un short code esistente dal tuo database

console.log('🔗 Per testare la correlazione cross-browser:');
console.log('1. Apri questo URL in Chrome:');
console.log(`   ${testUrl}`);
console.log('2. Poi aprilo in Firefox:');
console.log(`   ${testUrl}`);
console.log('3. Poi aprilo in Edge:');
console.log(`   ${testUrl}`);
console.log();

console.log('📊 Dopo aver fatto i click, controlla il database:');
console.log('Query per vedere i fingerprint:');
console.log(`
SELECT 
  device_fingerprint,
  browser_fingerprint,
  browser_type,
  ip_hash,
  os_family,
  COUNT(*) as count
FROM enhanced_fingerprints 
WHERE ip_hash = (
  SELECT ip_hash 
  FROM enhanced_fingerprints 
  ORDER BY created_at DESC 
  LIMIT 1
)
GROUP BY device_fingerprint, browser_fingerprint, browser_type, ip_hash, os_family
ORDER BY created_at DESC;
`);

console.log();
console.log('🎯 Risultato atteso:');
console.log('- STESSO device_fingerprint per tutti e 3 i browser');
console.log('- DIVERSI browser_fingerprint per ogni browser');
console.log('- browser_type diversi: chrome, firefox, edge');

console.log();
console.log('📝 Query per verificare unique visitors su un link:');
console.log(`
SELECT 
  l.short_code,
  COUNT(DISTINCT ef.device_fingerprint) as unique_devices,
  COUNT(DISTINCT ef.browser_fingerprint) as unique_browsers,
  COUNT(c.id) as total_clicks
FROM clicks c
JOIN links l ON l.id = c.link_id  
JOIN enhanced_fingerprints ef ON ef.browser_fingerprint = c.user_fingerprint
WHERE l.short_code = 'TUO_SHORT_CODE'
GROUP BY l.short_code;
`);

console.log();
console.log('🎯 Con il sistema corretto:');
console.log('- unique_devices dovrebbe essere 1 (stesso dispositivo fisico)');
console.log('- unique_browsers dovrebbe essere 3 (tre browser diversi)');
console.log('- total_clicks dovrebbe essere 3 (tre click totali)');
