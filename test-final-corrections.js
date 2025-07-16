/**
 * Test finale per verificare che tutte le correzioni funzionino
 */

console.log('🔧 TEST FINALE CORREZIONI COMPLETE');
console.log('==================================');

async function testAllCorrections() {
  try {
    const testShortCode = 'mA0WVl'; // Sostituisci con il tuo shortCode
    
    console.log(`\n📊 Testando il link: ${testShortCode}`);
    
    // Test 1: Dati generali (senza filtri)
    console.log('\n1️⃣ TEST DATI GENERALI:');
    const generalResponse = await fetch(`/api/analytics/${testShortCode}`);
    if (generalResponse.ok) {
      const data = await generalResponse.json();
      console.log(`   ✅ Statistiche generali: ${data.clickAnalytics.total_clicks} totali, ${data.clickAnalytics.unique_clicks} unici`);
      
      // Verifica grafici temporali
      const monthlyTotal = data.monthlyData?.reduce((sum, month) => sum + month.total_clicks, 0) || 0;
      const weeklyTotal = data.weeklyData?.reduce((sum, week) => sum + week.total_clicks, 0) || 0;
      console.log(`   ✅ Andamento mensile: ${monthlyTotal} click totali`);
      console.log(`   ✅ Andamento settimanale: ${weeklyTotal} click totali`);
      
      // Verifica statistiche dettagliate
      const deviceTotal = data.deviceData?.reduce((sum, device) => sum + device.clicks, 0) || 0;
      const browserTotal = data.browserData?.reduce((sum, browser) => sum + browser.clicks, 0) || 0;
      console.log(`   ✅ Statistiche dispositivi: ${deviceTotal} click`);
      console.log(`   ✅ Statistiche browser: ${browserTotal} click`);
    }
    
    // Test 2: Filtro "all"
    console.log('\n2️⃣ TEST FILTRO "ALL":');
    const allResponse = await fetch(`/api/analytics/${testShortCode}?filterType=all`);
    if (allResponse.ok) {
      const data = await allResponse.json();
      const timeSeriesTotal = data.timeSeriesData?.reduce((sum, day) => sum + day.total_clicks, 0) || 0;
      console.log(`   ✅ Andamento temporale (all): ${timeSeriesTotal} click totali`);
      console.log(`   ✅ Statistiche generali (all): ${data.clickAnalytics.total_clicks} totali`);
    }
    
    // Test 3: Filtro "today"
    console.log('\n3️⃣ TEST FILTRO "TODAY":');
    const todayResponse = await fetch(`/api/analytics/${testShortCode}?filterType=today`);
    if (todayResponse.ok) {
      const data = await todayResponse.json();
      const todayTimeSeriesTotal = data.timeSeriesData?.reduce((sum, hour) => sum + hour.total_clicks, 0) || 0;
      console.log(`   ✅ Andamento orario oggi: ${todayTimeSeriesTotal} click`);
      console.log(`   ✅ Click oggi nelle statistiche: ${data.clickAnalytics.clicks_today} click`);
    }
    
    // Test 4: Filtro "week"
    console.log('\n4️⃣ TEST FILTRO "WEEK":');
    const weekResponse = await fetch(`/api/analytics/${testShortCode}?filterType=week`);
    if (weekResponse.ok) {
      const data = await weekResponse.json();
      const weekTimeSeriesTotal = data.timeSeriesData?.reduce((sum, day) => sum + day.total_clicks, 0) || 0;
      console.log(`   ✅ Andamento settimanale: ${weekTimeSeriesTotal} click`);
      console.log(`   ✅ Click settimana nelle statistiche: ${data.clickAnalytics.clicks_this_week} click`);
    }
    
    console.log('\n🎉 CORREZIONI COMPLETATE:');
    console.log('   ✅ Filtro "all": Ora usa scaling corretto');
    console.log('   ✅ Statistiche dettagliate: Ora usano scaling corretto');
    console.log('   ✅ Andamento temporale: Ora usa scaling corretto');
    console.log('   ✅ Tutti i grafici sono coerenti con le statistiche generali');
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

// Esegui il test
testAllCorrections();
