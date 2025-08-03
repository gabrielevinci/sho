/**
 * Utility per misurare le performance del sistema di cache delle statistiche
 * Utilizzabile nelle DevTools del browser
 */

// Funzione per misurare il tempo di esecuzione
function measureTime<T>(fn: () => T, label: string): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.log(`⏱️  ${label}: ${(end - start).toFixed(2)}ms`);
  return result;
}

// Funzione per testare il cambio filtri
async function testFilterPerformance(statsHook: any, filters: string[]) {
  console.group('🚀 Performance Test - Filter Changes');
  
  for (const filter of filters) {
    if (filter === 'custom') continue;
    
    measureTime(() => {
      const stats = statsHook.getImmediateStats(filter);
      return stats;
    }, `Filter "${filter}" (immediate)`);
  }
  
  console.groupEnd();
}

// Funzione per simulare utilizzo intensivo
async function stressTest(statsHook: any) {
  console.group('💪 Stress Test - Multiple Filter Changes');
  
  const filters = ['sempre', '24h', '7d', '30d', '90d', '365d'];
  const iterations = 50;
  
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    const randomFilter = filters[Math.floor(Math.random() * filters.length)];
    statsHook.getImmediateStats(randomFilter);
  }
  
  const end = performance.now();
  const avgTime = (end - start) / iterations;
  
  console.log(`📊 ${iterations} cambio filtri completati in ${(end - start).toFixed(2)}ms`);
  console.log(`⚡ Tempo medio per cambio filtro: ${avgTime.toFixed(2)}ms`);
  
  console.groupEnd();
}

// Funzione per testare la cache
function analyzeCacheEfficiency(statsHook: any) {
  console.group('📈 Cache Analysis');
  
  const data = statsHook.allStatsData;
  if (data) {
    const dataSize = JSON.stringify(data).length;
    console.log(`💾 Dimensione dati in cache: ${(dataSize / 1024).toFixed(2)} KB`);
    console.log(`🔢 Numero di metriche temporali: ${Object.keys(data.allStats).length}`);
    console.log(`📊 Link info:`, data.link);
  }
  
  console.groupEnd();
}

// Funzione principale per eseguire tutti i test
async function runPerformanceTests(statsHook: any) {
  console.clear();
  console.log('🧪 STATS CACHE PERFORMANCE TESTS');
  console.log('================================');
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Analisi cache
  analyzeCacheEfficiency(statsHook);
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Test performance filtri
  const filters = ['sempre', '24h', '7d', '30d', '90d', '365d'];
  await testFilterPerformance(statsHook, filters);
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Stress test
  await stressTest(statsHook);
  
  console.log('✅ Tutti i test completati!');
}

// Esporta per uso globale nelle DevTools
if (typeof window !== 'undefined') {
  (window as any).StatsPerformanceTests = {
    runPerformanceTests,
    testFilterPerformance,
    stressTest,
    analyzeCacheEfficiency,
    measureTime
  };
  
  console.log('🔧 Performance tests disponibili in window.StatsPerformanceTests');
}

export {
  runPerformanceTests,
  testFilterPerformance,
  stressTest,
  analyzeCacheEfficiency,
  measureTime
};
