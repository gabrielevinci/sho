// SCRIPT DI TEST PER VERIFICARE QUERY ANALYTICS SINGOLO LINK
// Questo script simula una chiamata API e verifica i filtri

console.log('=== TEST COMPLETO QUERY ANALYTICS SINGOLO LINK ===');
console.log('');

// SIMULAZIONE PARAMETRI DI TEST
const testParams = {
  userId: 'test-user-123',
  workspaceId: 'test-workspace-456', 
  shortCode: 'TEST789',
  startDate: '2025-07-19T00:00:00+02:00',
  endDate: '2025-07-19T23:59:59+02:00'
};

console.log('📋 Parametri di test:', testParams);

// TEST 1: FILTRO "TODAY" (ultimi 24 ore)
console.log('\n🔍 TEST 1: FILTRO TODAY');
const todayRange = (() => {
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  return {
    startDate: start.toISOString(),
    endDate: now.toISOString()
  };
})();

console.log('Today Range:', todayRange);
console.log('URL Test:', `http://localhost:3000/api/analytics/${testParams.shortCode}?filterType=today&startDate=${encodeURIComponent(todayRange.startDate)}&endDate=${encodeURIComponent(todayRange.endDate)}`);

// TEST 2: FILTRO "WEEK" 
console.log('\n🔍 TEST 2: FILTRO WEEK');
const weekRange = (() => {
  const now = new Date();
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  return {
    startDate: start.toISOString(),
    endDate: now.toISOString()
  };
})();

console.log('Week Range:', weekRange);
console.log('URL Test:', `http://localhost:3000/api/analytics/${testParams.shortCode}?filterType=week&startDate=${encodeURIComponent(weekRange.startDate)}&endDate=${encodeURIComponent(weekRange.endDate)}`);

// TEST 3: FILTRO "MONTH"
console.log('\n🔍 TEST 3: FILTRO MONTH');
const monthRange = (() => {
  const now = new Date();
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  return {
    startDate: start.toISOString(),
    endDate: now.toISOString()
  };
})();

console.log('Month Range:', monthRange);
console.log('URL Test:', `http://localhost:3000/api/analytics/${testParams.shortCode}?filterType=month&startDate=${encodeURIComponent(monthRange.startDate)}&endDate=${encodeURIComponent(monthRange.endDate)}`);

// TEST 4: NESSUN FILTRO ("ALL")
console.log('\n🔍 TEST 4: NESSUN FILTRO (ALL)');
console.log('URL Test:', `http://localhost:3000/api/analytics/${testParams.shortCode}?filterType=all`);

console.log('\n=== PROBLEMI DA VERIFICARE ===');
console.log('');

console.log('❌ PROBLEMA 1: PERIOD_STATS NON COERENTI');
console.log('   - Con filtro "today": clicks_today dovrebbe essere uguale a total_clicks');
console.log('   - Con filtro "week": clicks_this_week dovrebbe essere uguale a total_clicks'); 
console.log('   - Con filtro "month": clicks_this_month dovrebbe essere uguale a total_clicks');

console.log('\n❌ PROBLEMA 2: UNIQUE VISITORS INCONSISTENTI');
console.log('   - Geographical: usa device_cluster_id fallback');
console.log('   - Browsers: usa device_cluster_id fallback');
console.log('   - Devices: usa device_cluster_id fallback');
console.log('   - Referrers: usa device_cluster_id fallback');
console.log('   - ClickAnalytics: usa device_cluster fallback');
console.log('   - TimeSeriesData: usa COALESCE(fc.device_cluster_id, ef.fingerprint_hash, c.user_fingerprint)');

console.log('\n❌ PROBLEMA 3: LOGICA CASE WHEN CONFUSA');
console.log('   - total_clicks: CASE WHEN filtro THEN filtered ELSE link_table');
console.log('   - unique_clicks: CASE WHEN filtro THEN filtered ELSE link_table');
console.log('   - Ma altre metriche sempre da query filtrata');

console.log('\n=== COMPORTAMENTO ATTESO PER OGNI FILTRO ===');
console.log('');

console.log('🎯 FILTRO "TODAY" (ultimi 24 ore):');
console.log('   ✅ total_clicks = click negli ultimi 24 ore');
console.log('   ✅ unique_clicks = click unici negli ultimi 24 ore');
console.log('   ✅ clicks_today = total_clicks (stesso valore!)');
console.log('   ✅ clicks_this_week >= total_clicks');
console.log('   ✅ clicks_this_month >= total_clicks');

console.log('\n🎯 FILTRO "WEEK" (ultimi 7 giorni):');
console.log('   ✅ total_clicks = click negli ultimi 7 giorni');
console.log('   ✅ unique_clicks = click unici negli ultimi 7 giorni');
console.log('   ✅ clicks_this_week = total_clicks (stesso valore!)');
console.log('   ✅ clicks_this_month >= total_clicks');

console.log('\n🎯 FILTRO "MONTH" (ultimi 30 giorni):');
console.log('   ✅ total_clicks = click negli ultimi 30 giorni');
console.log('   ✅ unique_clicks = click unici negli ultimi 30 giorni');
console.log('   ✅ clicks_this_month = total_clicks (stesso valore!)');

console.log('\n🎯 NESSUN FILTRO ("ALL"):');
console.log('   ✅ total_clicks = tutti i click dal link creato');
console.log('   ✅ unique_clicks = tutti i click unici dal link creato');
console.log('   ✅ clicks_today = click nelle ultime 24 ore');
console.log('   ✅ clicks_this_week = click negli ultimi 7 giorni');
console.log('   ✅ clicks_this_month = click negli ultimi 30 giorni');

console.log('\n=== COME TESTARE MANUALMENTE ===');
console.log('');
console.log('1. 🖥️  Avvia il server: npm run dev');
console.log('2. 🔐 Accedi alla dashboard nel browser');
console.log('3. 📊 Vai alle analytics di un link con dati recenti');
console.log('4. 🔄 Prova ogni filtro temporale e verifica:');
console.log('   - Le "Statistiche Generali" cambiano in base al filtro');
console.log('   - Il grafico corrisponde alle statistiche generali');
console.log('   - I dati geografici/browser/dispositivi cambiano con i filtri');
console.log('   - La somma del grafico = total_clicks delle statistiche');

console.log('\n🔧 PER DEVELOPERS:');
console.log('1. Apri Developer Tools nel browser');
console.log('2. Vai nel tab Network');
console.log('3. Cambia filtro e vedi le chiamate API');
console.log('4. Confronta i parametri startDate/endDate inviati');
console.log('5. Verifica che ogni sezione usi gli stessi parametri');

console.log('\n✅ TEST COMPLETATO');
console.log('📋 Usa questo script come guida per verificare le correzioni alle query');
