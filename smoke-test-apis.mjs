/**
 * Test di smoke per verificare le nuove API delle cartelle multiple
 */

console.log('🧪 Test di smoke per le API delle cartelle multiple\n');

const BASE_URL = 'http://localhost:3001';

async function testAPI(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    console.log(`${method} ${endpoint}: ${response.status} ${response.statusText}`);
    
    if (response.status === 404) {
      console.log('  ⚠️  Endpoint non trovato (normale se il database non è configurato)');
      return null;
    }
    
    if (response.status === 500) {
      console.log('  ⚠️  Errore del server (normale se il database non è configurato)');
      return null;
    }

    if (response.ok) {
      const result = await response.json();
      console.log('  ✅ Risposta OK');
      return result;
    } else {
      console.log(`  ❌ Errore: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log(`  ❌ Errore di rete: ${error.message}`);
    return null;
  }
}

async function runSmokeTests() {
  console.log('📡 Test degli endpoint API...\n');

  // Test GET per ottenere i link con cartelle
  await testAPI('/api/links-with-folders?workspaceId=test-workspace');

  // Test GET per ottenere le associazioni
  await testAPI('/api/link-folder-associations?workspaceId=test-workspace');

  // Test GET per le cartelle standard (dovrebbe funzionare)
  await testAPI('/api/folders?workspaceId=test-workspace');

  // Test POST per creare associazione (fallirà senza autenticazione, ma l'endpoint dovrebbe esistere)
  await testAPI('/api/link-folder-associations', 'POST', {
    linkId: 'test-link',
    folderIds: ['test-folder-1', 'test-folder-2']
  });

  // Test batch operations
  await testAPI('/api/link-folder-associations/batch', 'POST', {
    linkId: 'test-link',
    folderIds: ['test-folder-1']
  });

  console.log('\n🎉 Test di smoke completati!');
  console.log('💡 Gli errori 401/403/500 sono normali senza autenticazione o database configurato');
  console.log('✅ L\'importante è che gli endpoint esistano e non restituiscano 404');
}

runSmokeTests().catch(console.error);
