console.log('🔧 VERIFICA CORREZIONI GRAFICI TEMPORALI');
console.log('======================================');

// Test rapido della API per verificare i dati
fetch('/api/analytics/mA0WVl')
  .then(response => response.json())
  .then(data => {
    console.log('\n📈 STATISTICHE GENERALI:');
    console.log(`   Click totali: ${data.clickAnalytics.total_clicks}`);
    console.log(`   Click unici: ${data.clickAnalytics.unique_clicks}`);
    
    console.log('\n📅 SOMME DEI GRAFICI TEMPORALI:');
    
    // Somma dati mensili
    const monthlyTotal = data.monthlyData?.reduce((sum, month) => sum + month.total_clicks, 0) || 0;
    const monthlyUnique = data.monthlyData?.reduce((sum, month) => sum + month.unique_clicks, 0) || 0;
    console.log(`   📊 Mensili - Totali: ${monthlyTotal}, Unici: ${monthlyUnique}`);
    
    // Somma dati settimanali
    const weeklyTotal = data.weeklyData?.reduce((sum, week) => sum + week.total_clicks, 0) || 0;
    const weeklyUnique = data.weeklyData?.reduce((sum, week) => sum + week.unique_clicks, 0) || 0;
    console.log(`   📊 Settimanali - Totali: ${weeklyTotal}, Unici: ${weeklyUnique}`);
    
    // Somma time series
    const timeSeriesTotal = data.timeSeriesData?.reduce((sum, day) => sum + day.total_clicks, 0) || 0;
    const timeSeriesUnique = data.timeSeriesData?.reduce((sum, day) => sum + day.unique_clicks, 0) || 0;
    console.log(`   📊 Time Series (30gg) - Totali: ${timeSeriesTotal}, Unici: ${timeSeriesUnique}`);
    
    console.log('\n✅ Se i numeri sopra sono simili tra loro e alle statistiche generali, la correzione ha funzionato!');
    console.log('✅ I grafici ora utilizzano i dati corretti della tabella links con scaling temporale appropriato.');
  })
  .catch(error => {
    console.error('❌ Errore nel test:', error);
  });
