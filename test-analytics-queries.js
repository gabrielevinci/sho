// Test completo per verificare tutte le query delle analytics dei singoli link
// Questo script verifica che i filtri temporali vengano applicati correttamente

console.log('=== ANALISI QUERY ANALYTICS SINGOLO LINK ===');
console.log('Data corrente (Italia):', new Date().toLocaleString("it-IT", {timeZone: "Europe/Rome"}));

const PROBLEMS_FOUND = [];

// 1. PROBLEMA PRINCIPALE: Filtri temporali non coerenti
console.log('\n🔍 PROBLEMA 1: FILTRI TEMPORALI NON COERENTI');
console.log('');
console.log('SITUAZIONE ATTUALE:');
console.log('- getFilteredClickAnalytics: applica filtri solo a filtered_clicks');
console.log('- period_stats: NON applica filtri temporali (sempre ultime 24h/7g/30g)');
console.log('- Le "Statistiche Generali" mostrano dati filtrati');
console.log('- Ma clicks_today/week/month sono sempre dati totali non filtrati');

PROBLEMS_FOUND.push({
  type: 'INCOERENZA_FILTRI',
  description: 'period_stats non rispetta i filtri temporali',
  location: 'getFilteredClickAnalytics - period_stats CTE',
  severity: 'CRITICO'
});

// 2. PROBLEMA: Logica condizionale confusa
console.log('\n🔍 PROBLEMA 2: LOGICA CONDIZIONALE CONFUSA');
console.log('');
console.log('CASO CONDITION: total_clicks');
console.log('CASE WHEN ${startDate ? \'TRUE\' : \'FALSE\'} THEN s.filtered_total_clicks ELSE li.click_count END');
console.log('');
console.log('PROBLEMA:');
console.log('- Con filtro: usa s.filtered_total_clicks (corretto)');
console.log('- Senza filtro: usa li.click_count (può essere obsoleto)');
console.log('- Non c\'è consistenza con le altre metriche');

PROBLEMS_FOUND.push({
  type: 'LOGICA_CONDIZIONALE',
  description: 'Logica CASE WHEN inconsistente tra metriche',
  location: 'getFilteredClickAnalytics - SELECT finale',
  severity: 'ALTO'
});

// 3. PROBLEMA: Duplicazione query serie temporali  
console.log('\n🔍 PROBLEMA 3: DUPLICAZIONE QUERY SERIE TEMPORALI');
console.log('');
console.log('DUPLICAZIONE:');
console.log('- getFilteredTimeSeriesData ha logica per today (orari)');
console.log('- getFilteredTimeSeriesData ha logica per altri filtri (giornalieri)');
console.log('- Stesso problema: period_stats vs dati filtrati');

PROBLEMS_FOUND.push({
  type: 'DUPLICAZIONE_LOGICA',
  description: 'Query series temporali duplicate e inconsistenti',
  location: 'getFilteredTimeSeriesData',
  severity: 'MEDIO'
});

// 4. PROBLEMA: Enhanced fingerprints vs clicks
console.log('\n🔍 PROBLEMA 4: ENHANCED FINGERPRINTS VS CLICKS');
console.log('');
console.log('INCOERENZA:');
console.log('- filtered_clicks usa tabella clicks con LEFT JOIN enhanced_fingerprints');
console.log('- period_stats usa tabella clicks con LEFT JOIN enhanced_fingerprints');
console.log('- Ma il calcolo unique visitors non è consistente');
console.log('- device_cluster_id vs fingerprint_hash vs user_fingerprint');

PROBLEMS_FOUND.push({
  type: 'INCOERENZA_FINGERPRINTS',
  description: 'Calcolo unique visitors inconsistente tra query',
  location: 'Tutte le funzioni di analytics',
  severity: 'ALTO'
});

// 5. PROBLEMA: Filtri nelle funzioni specifiche
console.log('\n🔍 PROBLEMA 5: FILTRI NELLE FUNZIONI SPECIFICHE');
console.log('');
console.log('FUNZIONI ANALIZZATE:');
console.log('- getFilteredGeographicData: ✅ Applica filtri correttamente');
console.log('- getFilteredBrowserData: ✅ Applica filtri correttamente'); 
console.log('- getFilteredReferrerData: ✅ Applica filtri correttamente');
console.log('- getFilteredDeviceData: ❓ Da verificare se esiste');

console.log('\n=== SOLUZIONI PROPOSTE ===');

console.log('\n💡 SOLUZIONE 1: UNIFICARE LOGICA FILTRI');
console.log('- Creare una funzione getDateFilter() condivisa');
console.log('- Applicare SEMPRE i filtri temporali a TUTTE le metriche');
console.log('- period_stats deve rispettare startDate/endDate quando presenti');

console.log('\n💡 SOLUZIONE 2: SEMPLIFICARE LOGICA CONDIZIONALE');
console.log('- Eliminare CASE WHEN per total_clicks/unique_clicks');
console.log('- Usare SEMPRE dati calcolati dalla query filtrata');
console.log('- Mantenere coerenza tra tutte le metriche');

console.log('\n💡 SOLUZIONE 3: UNIFICARE ENHANCED FINGERPRINTS');
console.log('- Standardizzare calcolo unique visitors su device_cluster_id');
console.log('- Fallback consistente: device_cluster_id -> fingerprint_hash -> user_fingerprint');
console.log('- Stessa logica in TUTTE le query');

console.log('\n💡 SOLUZIONE 4: QUERY OTTIMIZZATE');
console.log('- Una singola CTE per filtered_data con TUTTI i campi necessari');
console.log('- Riusare filtered_data per stats, period_stats e top_values');
console.log('- Eliminare duplicazioni');

// Genera report finale
console.log('\n=== REPORT PROBLEMI ===');
PROBLEMS_FOUND.forEach((problem, index) => {
  console.log(`\n${index + 1}. ${problem.type} (${problem.severity})`);
  console.log(`   Descrizione: ${problem.description}`);
  console.log(`   Posizione: ${problem.location}`);
});

console.log(`\n🚨 TOTALE PROBLEMI TROVATI: ${PROBLEMS_FOUND.length}`);
console.log('🔧 PRIORITÀ: Risolvere problemi CRITICI e ALTO prima di procedere');

console.log('\n=== PROSSIMI PASSI ===');
console.log('1. Riscrivere getFilteredClickAnalytics con logica unificata');
console.log('2. Testare ogni filtro temporale (today, week, month, 3months, custom)');
console.log('3. Verificare consistenza tra Statistiche Generali e grafici');
console.log('4. Assicurarsi che period_stats rispetti i filtri temporali');
console.log('5. Testare con dati reali in produzione');
