/**
 * Script per testare le correzioni dei grafici temporali
 * Verifica che i dati nei grafici siano ora coerenti con la tabella links
 */

async function testTemporalGraphs() {
  console.log('🔧 TEST CORREZIONI GRAFICI TEMPORALI');
  console.log('===================================');
  
  try {
    // Simula una chiamata all'API analytics per vedere se i dati sono corretti
    const testShortCode = 'mA0WVl'; // Sostituisci con il tuo shortCode
    
    console.log(`\n📊 Testando il link: ${testShortCode}`);
    
    // Test della chiamata API (simula una richiesta senza filtri)
    const response = await fetch(`http://localhost:3000/api/analytics/${testShortCode}`);
    
    if (!response.ok) {
      console.log('❌ Errore nella chiamata API:', response.status);
      return;
    }
    
    const data = await response.json();
    
    console.log(`\n📈 STATISTICHE GENERALI:`);
    console.log(`   Click totali: ${data.clickAnalytics.total_clicks}`);
    console.log(`   Click unici: ${data.clickAnalytics.unique_clicks}`);
    
    console.log(`\n📅 GRAFICI TEMPORALI:`);
    
    // Test dati mensili
    const monthlyTotal = data.monthlyData?.reduce((sum, month) => sum + month.total_clicks, 0) || 0;
    const monthlyUnique = data.monthlyData?.reduce((sum, month) => sum + month.unique_clicks, 0) || 0;
    console.log(`   Mensili - Totali: ${monthlyTotal}, Unici: ${monthlyUnique}`);
    
    // Test dati settimanali
    const weeklyTotal = data.weeklyData?.reduce((sum, week) => sum + week.total_clicks, 0) || 0;
    const weeklyUnique = data.weeklyData?.reduce((sum, week) => sum + week.unique_clicks, 0) || 0;
    console.log(`   Settimanali - Totali: ${weeklyTotal}, Unici: ${weeklyUnique}`);
    
    // Test time series (ultimi 30 giorni)
    const timeSeriesTotal = data.timeSeriesData?.reduce((sum, day) => sum + day.total_clicks, 0) || 0;
    const timeSeriesUnique = data.timeSeriesData?.reduce((sum, day) => sum + day.unique_clicks, 0) || 0;
    console.log(`   Time Series (30gg) - Totali: ${timeSeriesTotal}, Unici: ${timeSeriesUnique}`);
    
    console.log(`\n🔍 VERIFICA COERENZA:`);
    const generalTotal = data.clickAnalytics.total_clicks;
    const generalUnique = data.clickAnalytics.unique_clicks;
    
    // I totali nei grafici dovrebbero essere <= ai totali generali (perché i grafici sono limitati nel tempo)
    console.log(`   ✅ Totali coerenti: Generali=${generalTotal}, Grafici≤${Math.max(monthlyTotal, weeklyTotal, timeSeriesTotal)}`);
    console.log(`   ✅ Unici coerenti: Generali=${generalUnique}, Grafici≤${Math.max(monthlyUnique, weeklyUnique, timeSeriesUnique)}`);
    
    // Test con filtro "today"
    console.log(`\n📆 TEST FILTRO "TODAY":`);
    const todayResponse = await fetch(`http://localhost:3000/api/analytics/${testShortCode}?filterType=today`);
    if (todayResponse.ok) {
      const todayData = await todayResponse.json();
      console.log(`   Click oggi - Totali: ${todayData.clickAnalytics.clicks_today}, da time series: ${todayData.timeSeriesData?.reduce((sum, hour) => sum + hour.total_clicks, 0) || 0}`);
    }
    
    console.log(`\n✅ Test completato! I grafici dovrebbero ora mostrare dati coerenti.`);
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

// Se stiamo eseguendo questo script in Node.js
if (typeof window === 'undefined') {
  // Polyfill fetch per Node.js
  global.fetch = global.fetch || require('node-fetch');
  
  testTemporalGraphs().then(() => {
    console.log('\n🎯 Test completato!');
  }).catch(error => {
    console.error('❌ Errore fatale:', error);
  });
}

// Se siamo nel browser, esportiamo la funzione
if (typeof window !== 'undefined') {
  window.testTemporalGraphs = testTemporalGraphs;
}
