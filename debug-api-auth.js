/**
 * Script per testare l'API /api/links/[shortCode]/stats e debuggare il problema 401
 */

const testShortCode = 'CIIhbJv';
const serverUrl = 'http://localhost:3001'; // Server attuale

async function testAPI() {
  console.log('🧪 Test API Stats - Debug Autenticazione');
  console.log('=' .repeat(50));

  try {
    // Test 1: Chiamata senza autenticazione
    console.log('📝 Test 1: Chiamata senza cookie di sessione');
    const response1 = await fetch(`${serverUrl}/api/links/${testShortCode}/stats?filter=all`);
    console.log(`Status: ${response1.status}`);
    
    if (!response1.ok) {
      const errorData = await response1.json();
      console.log('Errore:', errorData);
    } else {
      console.log('✅ Successo (inaspettato senza autenticazione)');
    }

    console.log('\n' + '-'.repeat(30) + '\n');

    // Test 2: Test endpoint settimanale
    console.log('📝 Test 2: Test endpoint settimanale');
    const response2 = await fetch(`${serverUrl}/api/links/${testShortCode}/weekly-stats?year=2025`);
    console.log(`Weekly stats status: ${response2.status}`);
    
    if (!response2.ok) {
      const errorData = await response2.json();
      console.log('Errore weekly:', errorData);
    } else {
      console.log('✅ Weekly endpoint funziona');
    }

    console.log('\n' + '-'.repeat(30) + '\n');

    // Test 3: Verifica se ci sono cookie nel browser
    console.log('📝 Test 3: Verifica esistenza del server');
    const healthCheck = await fetch(`${serverUrl}/`);
    console.log(`Health check status: ${healthCheck.status}`);

    console.log('\n' + '-'.repeat(30) + '\n');

    // Test 4: Prova con simulazione di sessione (se possibile)
    console.log('📝 Test 4: Informazioni di debug');
    console.log('Server URL:', serverUrl);
    console.log('Short Code:', testShortCode);
    console.log('API Endpoint Stats:', `/api/links/${testShortCode}/stats?filter=all`);
    console.log('API Endpoint Weekly:', `/api/links/${testShortCode}/weekly-stats?year=2025`);

  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

// Esegui il test
testAPI();
