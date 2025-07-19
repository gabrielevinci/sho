// Test per verificare che i dati mensili e settimanali vengano forniti correttamente
console.log('=== TEST DATI PERIODICI ===');

// Simula una chiamata all'API
const testURL = 'http://localhost:3000/api/analytics/TEST123?filterType=all'; // Usa uno shortCode di test

fetch(testURL)
  .then(response => {
    console.log('Response status:', response.status);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('\n=== VERIFICA STRUTTURA DATI ===');
    console.log('linkData presente:', !!data.linkData);
    console.log('clickAnalytics presente:', !!data.clickAnalytics);
    console.log('timeSeriesData presente:', !!data.timeSeriesData);
    console.log('monthlyData presente:', !!data.monthlyData);
    console.log('weeklyData presente:', !!data.weeklyData);
    
    if (data.monthlyData) {
      console.log('\n=== DATI MENSILI ===');
      console.log('Numero di mesi:', data.monthlyData.length);
      if (data.monthlyData.length > 0) {
        console.log('Primo mese:', data.monthlyData[0]);
        console.log('Ultimo mese:', data.monthlyData[data.monthlyData.length - 1]);
        
        // Verifica struttura
        const firstMonth = data.monthlyData[0];
        const hasRequiredFields = firstMonth.month && 
                                 typeof firstMonth.month_number === 'number' &&
                                 typeof firstMonth.year === 'number' &&
                                 typeof firstMonth.total_clicks === 'number' &&
                                 typeof firstMonth.unique_clicks === 'number';
        console.log('Struttura corretta:', hasRequiredFields);
      }
    }
    
    if (data.weeklyData) {
      console.log('\n=== DATI SETTIMANALI ===');
      console.log('Numero di settimane:', data.weeklyData.length);
      if (data.weeklyData.length > 0) {
        console.log('Prima settimana:', data.weeklyData[0]);
        console.log('Ultima settimana:', data.weeklyData[data.weeklyData.length - 1]);
        
        // Verifica struttura
        const firstWeek = data.weeklyData[0];
        const hasRequiredFields = typeof firstWeek.week === 'number' &&
                                 typeof firstWeek.year === 'number' &&
                                 firstWeek.week_start &&
                                 firstWeek.week_end &&
                                 typeof firstWeek.total_clicks === 'number' &&
                                 typeof firstWeek.unique_clicks === 'number';
        console.log('Struttura corretta:', hasRequiredFields);
      }
    }
    
    console.log('\n=== VERIFICA FUNZIONAMENTO ANALISI PERIODICA ===');
    if (data.monthlyData && data.weeklyData) {
      console.log('✅ Tutti i dati necessari per PeriodChart sono presenti');
      console.log('✅ Il componente Analisi Periodica dovrebbe ora funzionare correttamente');
    } else {
      console.log('❌ Mancano dati per il componente PeriodChart');
      if (!data.monthlyData) console.log('  - monthlyData mancante');
      if (!data.weeklyData) console.log('  - weeklyData mancante');
    }
  })
  .catch(error => {
    console.error('Errore nel test:', error.message);
    console.log('\nPossibili cause:');
    console.log('1. Server non avviato (npm run dev)');
    console.log('2. ShortCode di test non esistente');
    console.log('3. Errore nelle nuove query SQL');
    console.log('4. Problemi di autenticazione');
  });
