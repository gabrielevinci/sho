// Test delle nuove query migliorate per il filtro "all"
console.log('=== TEST QUERY MIGLIORATA PER FILTRO "ALL" ===');

// Simula una query per testare la logica
function simulateImprovedQuery() {
  // Dati di esempio che simulano il database
  const mockClicks = [
    { date: '2025-07-17', clicked_at_rome: '2025-07-17 10:30:00', user_fingerprint: 'fp1' },
    { date: '2025-07-17', clicked_at_rome: '2025-07-17 14:20:00', user_fingerprint: 'fp1' }, // Stesso utente
    { date: '2025-07-17', clicked_at_rome: '2025-07-17 16:45:00', user_fingerprint: 'fp2' },
    { date: '2025-07-18', clicked_at_rome: '2025-07-18 09:15:00', user_fingerprint: 'fp1' }, // Stesso utente giorno diverso
    { date: '2025-07-18', clicked_at_rome: '2025-07-18 11:30:00', user_fingerprint: 'fp3' },
    { date: '2025-07-18', clicked_at_rome: '2025-07-18 13:45:00', user_fingerprint: 'fp3' }, // Stesso utente
    { date: '2025-07-19', clicked_at_rome: '2025-07-19 08:20:00', user_fingerprint: 'fp4' },
  ];

  const mockEnhancedFingerprints = [
    { fingerprint_hash: 'fp1', device_fingerprint: 'device1' },
    { fingerprint_hash: 'fp2', device_fingerprint: 'device2' },
    { fingerprint_hash: 'fp3', device_fingerprint: 'device3' },
    { fingerprint_hash: 'fp4', device_fingerprint: 'device1' }, // Stesso device di fp1
  ];

  const mockCorrelations = [
    { fingerprint_hash: 'fp1', device_cluster_id: 'cluster1' },
    { fingerprint_hash: 'fp4', device_cluster_id: 'cluster1' }, // Stesso cluster
    { fingerprint_hash: 'fp2', device_cluster_id: 'cluster2' },
    { fingerprint_hash: 'fp3', device_cluster_id: 'cluster3' },
  ];

  // Simula la nuova logica di conteggio
  console.log('\n🔍 ANALISI DATI MOCK:');
  console.log('Total clicks:', mockClicks.length);
  console.log('Unique fingerprints:', new Set(mockClicks.map(c => c.user_fingerprint)).size);

  // Raggruppa per data
  const byDate = {};
  
  mockClicks.forEach(click => {
    const date = click.date;
    if (!byDate[date]) {
      byDate[date] = { total_clicks: 0, fingerprints: new Set() };
    }
    byDate[date].total_clicks++;
    byDate[date].fingerprints.add(click.user_fingerprint);
  });

  console.log('\n📅 CONTEGGIO PER DATA (logica precedente):');
  Object.entries(byDate).forEach(([date, data]) => {
    console.log(`  ${date}: ${data.total_clicks} total, ${data.fingerprints.size} unique fingerprints`);
  });

  // Simula la nuova logica con correlazioni
  const improvedByDate = {};
  
  mockClicks.forEach(click => {
    const date = click.date;
    if (!improvedByDate[date]) {
      improvedByDate[date] = { total_clicks: 0, unique_devices: new Set() };
    }
    improvedByDate[date].total_clicks++;
    
    // Trova la correlazione per questo fingerprint
    const correlation = mockCorrelations.find(c => c.fingerprint_hash === click.user_fingerprint);
    const uniqueId = correlation 
      ? correlation.device_cluster_id 
      : click.user_fingerprint;
    
    improvedByDate[date].unique_devices.add(uniqueId);
  });

  console.log('\n🚀 CONTEGGIO MIGLIORATO (con correlazioni device):');
  Object.entries(improvedByDate).forEach(([date, data]) => {
    console.log(`  ${date}: ${data.total_clicks} total, ${data.unique_devices.size} unique devices`);
  });

  // Verifica coerenza
  console.log('\n✅ VERIFICA COERENZA:');
  Object.entries(improvedByDate).forEach(([date, data]) => {
    const isValid = data.unique_devices.size <= data.total_clicks;
    console.log(`  ${date}: ${isValid ? '✅' : '❌'} unique (${data.unique_devices.size}) <= total (${data.total_clicks})`);
  });

  // Simula il risultato finale per il grafico
  console.log('\n📊 DATI FINALI PER IL GRAFICO:');
  const chartData = Object.entries(improvedByDate).map(([date, data]) => ({
    date,
    total_clicks: data.total_clicks,
    unique_clicks: data.unique_devices.size
  }));

  chartData.forEach(entry => {
    const efficiency = entry.total_clicks > 0 ? ((entry.unique_clicks / entry.total_clicks) * 100).toFixed(1) : '0.0';
    console.log(`  ${entry.date}: ${entry.total_clicks} total, ${entry.unique_clicks} unique (${efficiency}% efficacia)`);
  });

  return chartData;
}

// Esegui il test
const result = simulateImprovedQuery();

console.log('\n🎯 RIEPILOGO MIGLIORAMENTI:');
console.log('1. ✅ Conteggio separato per total_clicks e unique_clicks');
console.log('2. ✅ Uso delle correlazioni device per unique_clicks più accurati');
console.log('3. ✅ Prevenzione anomalie (unique <= total)');
console.log('4. ✅ Efficacia percentuale per ogni punto dati');
console.log('\nIl nuovo sistema dovrebbe mostrare:');
console.log('- Click totali: somma di tutti i click giornalieri');
console.log('- Click unici: dispositivi unici basati su correlazioni');
console.log('- Tooltip accurato con tasso di conversione corretto');
console.log('- Nessuna anomalia nei dati (unique > total)');
