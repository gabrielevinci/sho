// TEST FINALE: Verifica risoluzione problema "Statistiche Dettagliate e Generali non visualizzano i dati"
//
// PROBLEMA RISOLTO:
// ================
// Il problema era causato da DUE implementazioni diverse delle analytics:
// 1. Server-side (page.tsx): usava enhanced_fingerprints con calcoli proporzionali
// 2. Client-side (route.ts): usava clicks + enhanced_fingerprints + fingerprint_correlations
//
// SOLUZIONE IMPLEMENTATA:
// ======================
// Unificato tutto sulla logica della tabella clicks (più accurata) sia per SSR che API

console.log('=== TEST FINALE RISOLUZIONE PROBLEMA ===');

// Funzione per testare se il problema è risolto
async function testAnalyticsUnification() {
  console.log('🔍 Testando unificazione analytics...');
  
  try {
    // Prendi shortCode dall'URL corrente se siamo su una pagina analytics
    let shortCode = 'udUUmGe'; // Default dal log
    
    if (window.location.pathname.includes('/analytics/')) {
      const urlParts = window.location.pathname.split('/');
      const analyticsIndex = urlParts.indexOf('analytics');
      if (analyticsIndex >= 0 && urlParts[analyticsIndex + 1]) {
        shortCode = urlParts[analyticsIndex + 1];
      }
    }
    
    console.log(`🔗 Testando con shortCode: ${shortCode}`);
    
    // Test 1: API route (client-side)
    console.log('\n=== TEST 1: API Route (Client-side) ===');
    const apiResponse = await fetch(`/api/analytics/${shortCode}?filterType=all`);
    
    if (!apiResponse.ok) {
      console.log('❌ API non disponibile:', apiResponse.status);
      if (apiResponse.status === 401) {
        console.log('🔒 Fai il login e ritorna su questa pagina');
        return;
      }
      return;
    }
    
    const apiData = await apiResponse.json();
    console.log('📊 Dati API (client-side):', {
      total_clicks: apiData.clickAnalytics?.total_clicks,
      unique_clicks: apiData.clickAnalytics?.unique_clicks,
      clicks_today: apiData.clickAnalytics?.clicks_today,
      unique_countries: apiData.clickAnalytics?.unique_countries,
      unique_devices: apiData.clickAnalytics?.unique_devices
    });
    
    // Test 2: Verifica dati iniziali nella pagina (server-side)
    console.log('\n=== TEST 2: Confronto con Dati Pagina (Server-side) ===');
    
    // Cerca elementi DOM con le statistiche per confrontare
    const elements = {
      totalClicks: document.querySelector('[class*="blue"] .text-2xl'),
      uniqueClicks: document.querySelector('[class*="green"] .text-2xl'),
      countries: document.querySelector('[class*="teal"] .text-2xl'),
      devices: document.querySelector('[class*="orange"] .text-2xl')
    };
    
    console.log('🎨 Valori mostrati nella pagina:');
    Object.entries(elements).forEach(([key, element]) => {
      const value = element ? element.textContent?.trim() : 'N/A';
      console.log(`- ${key}: ${value}`);
    });
    
    // Test 3: Confronto coerenza
    console.log('\n=== TEST 3: Verifica Coerenza ===');
    
    const pageTotal = elements.totalClicks?.textContent?.trim();
    const pageUnique = elements.uniqueClicks?.textContent?.trim();
    const apiTotal = apiData.clickAnalytics?.total_clicks?.toString();
    const apiUnique = apiData.clickAnalytics?.unique_clicks?.toString();
    
    const isConsistent = (pageTotal === apiTotal) && (pageUnique === apiUnique);
    
    console.log('🔍 Confronto valori:');
    console.log(`- Total clicks: Pagina="${pageTotal}" vs API="${apiTotal}" ${pageTotal === apiTotal ? '✅' : '❌'}`);
    console.log(`- Unique clicks: Pagina="${pageUnique}" vs API="${apiUnique}" ${pageUnique === apiUnique ? '✅' : '❌'}`);
    
    // Test 4: Test filtro temporale
    console.log('\n=== TEST 4: Test Filtro Today ===');
    const today = new Date().toISOString().split('T')[0];
    const todayResponse = await fetch(`/api/analytics/${shortCode}?filterType=today&startDate=${today}&endDate=${today}`);
    
    if (todayResponse.ok) {
      const todayData = await todayResponse.json();
      console.log('📅 Filtro Today:', {
        total_clicks: todayData.clickAnalytics?.total_clicks,
        clicks_today: todayData.clickAnalytics?.clicks_today,
        coerente: todayData.clickAnalytics?.total_clicks === todayData.clickAnalytics?.clicks_today ? '✅' : '❌'
      });
    }
    
    // Risultato finale
    console.log('\n=== RISULTATO FINALE ===');
    if (isConsistent) {
      console.log('✅ PROBLEMA RISOLTO: Le statistiche sono ora coerenti tra SSR e API!');
      console.log('✅ Statistiche Generali e Dettagliate dovrebbero ora visualizzare correttamente i dati');
    } else {
      console.log('❌ PROBLEMA PERSISTE: C\'è ancora incoerenza tra i dati');
      console.log('🔧 Potrebbe essere necessario un hard refresh (Ctrl+F5)');
    }
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

// Funzione per testare il comportamento dei filtri
async function testFilters(shortCode = 'udUUmGe') {
  console.log('🎛️ Testando filtri temporali...');
  
  const filters = ['all', 'today', 'week', 'month'];
  
  for (const filter of filters) {
    try {
      let url = `/api/analytics/${shortCode}?filterType=${filter}`;
      
      if (filter !== 'all') {
        const today = new Date();
        let startDate, endDate;
        
        switch (filter) {
          case 'today':
            startDate = endDate = today.toISOString().split('T')[0];
            break;
          case 'week':
            const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
            startDate = weekAgo.toISOString().split('T')[0];
            endDate = today.toISOString().split('T')[0];
            break;
          case 'month':
            const monthAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
            startDate = monthAgo.toISOString().split('T')[0];
            endDate = today.toISOString().split('T')[0];
            break;
        }
        
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log(`📊 Filtro ${filter}:`, {
          total_clicks: data.clickAnalytics?.total_clicks,
          unique_clicks: data.clickAnalytics?.unique_clicks
        });
      }
    } catch (error) {
      console.log(`❌ Errore filtro ${filter}:`, error.message);
    }
  }
}

// Rendi le funzioni disponibili globalmente
window.testAnalyticsUnification = testAnalyticsUnification;
window.testFilters = testFilters;

console.log('✅ Test caricato!');
console.log('🚀 Comandi disponibili:');
console.log('   - testAnalyticsUnification() : Verifica se il problema è risolto');
console.log('   - testFilters("shortCode") : Testa tutti i filtri temporali');
console.log('');
console.log('📋 PASSI PER TESTARE:');
console.log('1. Vai su http://localhost:3000/dashboard/analytics/udUUmGe');
console.log('2. Apri console browser (F12)');
console.log('3. Incolla questo script');
console.log('4. Esegui: testAnalyticsUnification()');
console.log('5. Se vedi ✅ PROBLEMA RISOLTO, le statistiche ora funzionano!');
