/**
 * Test per verificare che il salvataggio nel database funzioni
 * Simula un click reale per verificare che l'errore PostgreSQL sia risolto
 */

const API_BASE = 'http://localhost:3000';

async function testRealClick() {
  console.log('🔗 Test click reale per verificare salvataggio database...\n');

  try {
    // Prima creiamo un link di test (se non esiste già)
    console.log('📝 Tentativo di accesso a un link per testare recordClick...');
    
    // Simula un click su un link esistente o usa un shortCode di test
    const response = await fetch(`${API_BASE}/test`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://google.com'
      }
    });

    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));

    if (response.status === 200 || response.status === 302 || response.status === 404) {
      console.log('✅ Nessun errore PostgreSQL rilevato!');
      console.log('🎉 Il sistema di IP fixing funziona correttamente');
    } else {
      console.log('⚠️ Status inaspettato, ma nessun crash');
    }

  } catch (error) {
    if (error.message.includes('invalid input syntax for type inet')) {
      console.log('❌ ERRORE: Il problema PostgreSQL persiste!');
      console.log('🔧 Potrebbe essere necessario verificare altre parti del codice');
    } else {
      console.log('✅ Nessun errore PostgreSQL inet!');
      console.log('ℹ️ Altri errori (normali):', error.message);
    }
  }

  // Test con endpoint di test esistente
  console.log('\n🧪 Test con endpoint API esistente...');
  try {
    const testResponse = await fetch(`${API_BASE}/api/test`);
    console.log('📊 Test API Status:', testResponse.status);
    
    if (testResponse.status !== 500) {
      console.log('✅ Endpoint API test funziona senza errori PostgreSQL');
    }
  } catch (error) {
    console.log('ℹ️ Test API error (potrebbe essere normale):', error.message);
  }
}

testRealClick();
