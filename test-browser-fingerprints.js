/**
 * Test script to simulate different browsers accessing a shortened link
 */

// User agent strings per diversi browser
const userAgents = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
  opera: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 OPR/111.0.0.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15'
};

// Usiamo il link "test123" - dovrai crearlo manualmente nel dashboard o modificare qui
const TEST_SHORT_CODE = 'test123';

async function testBrowserFingerprinting() {
  console.log('🧪 Testing browser fingerprinting...\n');
  console.log(`📍 Testing link: http://localhost:3000/${TEST_SHORT_CODE}\n`);

  // Testa ogni browser
  for (const [browserName, userAgent] of Object.entries(userAgents)) {
    console.log(`📱 Testing ${browserName}:`);
    console.log(`  User Agent: ${userAgent.substring(0, 80)}...`);
    
    try {
      // Simula una richiesta al link shortato
      const response = await fetch(`http://localhost:3000/${TEST_SHORT_CODE}`, {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.8,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        redirect: 'manual' // Non seguire il redirect per poter analizzare la risposta
      });
      
      console.log(`  Response status: ${response.status}`);
      if (response.status === 302 || response.status === 301 || response.status === 307) {
        console.log(`  Redirect to: ${response.headers.get('location')}`);
        console.log('  ✅ Click registered successfully');
      } else if (response.status === 404) {
        console.log('  ❌ Link not found - create a link with short code "test123" first');
        break;
      } else {
        console.log(`  ⚠️ Status ${response.status} - Link may not exist yet`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    
    console.log('');
    
    // Pausa tra le richieste per vedere i log del server
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('🏁 Test completed. Check server logs for fingerprint details.');
  console.log('');
  console.log('💡 To analyze the results:');
  console.log('   1. Check the server console for fingerprint generation logs');
  console.log('   2. Look at the database tables: clicks, enhanced_fingerprints, fingerprint_correlations');
  console.log('   3. Verify that Opera is being correlated with other browsers from the same device');
}

// Esegui il test
testBrowserFingerprinting().catch(console.error);
