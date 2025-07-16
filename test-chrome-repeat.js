/**
 * Quick test to simulate a Chrome repeat visit
 */

async function testChromeRepeatVisit() {
  console.log('🧪 Testing Chrome repeat visit...\n');
  
  const chromeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
  
  try {
    console.log('📱 Simulating Chrome visit...');
    console.log(`  User Agent: ${chromeUserAgent.substring(0, 80)}...`);
    
    const response = await fetch('http://localhost:3000/test123', {
      method: 'GET',
      headers: {
        'User-Agent': chromeUserAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.8,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'manual'
    });
    
    console.log(`  Response status: ${response.status}`);
    console.log(`  Redirect to: ${response.headers.get('location')}`);
    
    if (response.status === 302 || response.status === 301 || response.status === 307) {
      console.log('  ✅ Request processed - check server logs for detailed debug info');
    } else {
      console.log('  ❌ Unexpected response status');
    }
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  console.log('\n💡 Check the server terminal for detailed logs showing:');
  console.log('   - Fingerprint generation');
  console.log('   - Database queries for existing fingerprints');
  console.log('   - Unique visit determination logic');
  console.log('   - Counter update operations');
}

// Esegui il test
testChromeRepeatVisit().catch(console.error);
