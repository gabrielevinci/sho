// Test per verificare che l'API batch-reset-clicks funzioni correttamente
const BASE_URL = 'http://localhost:3000';

console.log('🧪 Test API batch-reset-clicks');

async function testBatchResetClicks() {
  try {
    console.log('\n1️⃣ Test: Verifica endpoint batch-reset-clicks');
    
    // Test con array vuoto (dovrebbe fallire)
    console.log('📤 Testando con array vuoto...');
    const emptyResponse = await fetch(`${BASE_URL}/api/links/batch-reset-clicks`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shortCodes: [] }),
    });
    
    const emptyResult = await emptyResponse.json();
    console.log('📊 Risposta array vuoto:', emptyResponse.status, emptyResult);
    
    // Test con shortCodes validi (simulato - senza autenticazione fallirà)
    console.log('\n📤 Testando con shortCodes simulati...');
    const testResponse = await fetch(`${BASE_URL}/api/links/batch-reset-clicks`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shortCodes: ['test1', 'test2'] }),
    });
    
    const testResult = await testResponse.json();
    console.log('📊 Risposta test shortCodes:', testResponse.status, testResult);
    
    if (testResponse.status === 401) {
      console.log('✅ API funziona correttamente (richiede autenticazione)');
    } else {
      console.log('❓ Risposta inaspettata:', testResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

// Esegui test
testBatchResetClicks();
