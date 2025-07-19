// Script per testare rapidamente l'API analytics dal browser
// 
// ISTRUZIONI:
// 1. Vai su http://localhost:3000/dashboard
// 2. Apri la console del browser (F12) 
// 3. Incolla questo script e premi Invio
// 4. Esegui: testAPI()

console.log('=== TEST API ANALYTICS ===');

async function testAPI() {
  console.log('🔄 Testando API analytics...');
  
  try {
    // Test con un shortCode dal log (udUUmGe)
    const shortCode = 'udUUmGe';
    console.log(`🔗 Testando shortCode: ${shortCode}`);
    
    const response = await fetch(`/api/analytics/${shortCode}?filterType=all`);
    console.log('📞 Response status:', response.status);
    console.log('📞 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API Response ricevuta!');
    
    // Analizza i dati
    console.log('\n=== ANALISI DATI ===');
    console.log('🔗 Link Data:', {
      short_code: data.linkData?.short_code,
      original_url: data.linkData?.original_url,
      click_count: data.linkData?.click_count
    });
    
    console.log('📊 Click Analytics:', {
      total_clicks: data.clickAnalytics?.total_clicks,
      unique_clicks: data.clickAnalytics?.unique_clicks,
      clicks_today: data.clickAnalytics?.clicks_today,
      clicks_this_week: data.clickAnalytics?.clicks_this_week,
      unique_countries: data.clickAnalytics?.unique_countries,
      unique_devices: data.clickAnalytics?.unique_devices
    });
    
    console.log('🌍 Geographic Data:', {
      count: data.geographicData?.length || 0,
      first_few: data.geographicData?.slice(0, 2)
    });
    
    console.log('💻 Device Data:', {
      count: data.deviceData?.length || 0,
      first_few: data.deviceData?.slice(0, 2)
    });
    
    console.log('📈 Time Series Data:', {
      count: data.timeSeriesData?.length || 0,
      first_few: data.timeSeriesData?.slice(0, 2)
    });
    
    // Test con filtro today 
    console.log('\n=== TEST FILTRO TODAY ===');
    const today = new Date().toISOString().split('T')[0];
    const todayResponse = await fetch(`/api/analytics/${shortCode}?filterType=today&startDate=${today}&endDate=${today}`);
    
    if (todayResponse.ok) {
      const todayData = await todayResponse.json();
      console.log('📅 Today Filter Results:', {
        total_clicks: todayData.clickAnalytics?.total_clicks,
        clicks_today: todayData.clickAnalytics?.clicks_today,
        matches: todayData.clickAnalytics?.total_clicks === todayData.clickAnalytics?.clicks_today ? '✅' : '❌'
      });
    } else {
      console.log('❌ Today filter failed:', todayResponse.status);
    }
    
    // Verifica elementi DOM della pagina
    console.log('\n=== VERIFICA DOM ===');
    const currentUrl = window.location.href;
    console.log('📍 Current URL:', currentUrl);
    
    if (currentUrl.includes('/analytics/')) {
      console.log('✅ Sei su una pagina analytics');
      
      // Cerca elementi statistiche
      const elements = {
        statsCards: document.querySelectorAll('[class*="stat"], [class*="card"]'),
        numbers: document.querySelectorAll('[class*="number"], [class*="count"]'),
        charts: document.querySelectorAll('[class*="chart"], canvas, svg'),
        loadingElements: document.querySelectorAll('[class*="loading"], [class*="spinner"]'),
        errorElements: document.querySelectorAll('[class*="error"], [class*="warning"]')
      };
      
      console.log('🎨 Elementi DOM trovati:');
      Object.entries(elements).forEach(([key, nodeList]) => {
        console.log(`- ${key}: ${nodeList.length} elementi`);
      });
      
      // Cerca testo che potrebbe indicare problemi
      const bodyText = document.body.textContent || '';
      const indicators = {
        hasErrorText: bodyText.includes('error') || bodyText.includes('Error'),
        hasLoadingText: bodyText.includes('loading') || bodyText.includes('Loading'),
        hasNoDataText: bodyText.includes('No data') || bodyText.includes('nessun dato'),
        hasZeroValues: bodyText.includes('0 click') || bodyText.includes('0 unique')
      };
      
      console.log('📝 Indicatori di stato:');
      Object.entries(indicators).forEach(([key, value]) => {
        console.log(`- ${key}: ${value ? '✅' : '❌'}`);
      });
      
    } else {
      console.log('⚠️  Non sei su una pagina analytics');
      console.log('💡 Vai su /dashboard/analytics/[shortCode] per vedere i dati');
    }
    
    console.log('\n✅ Test completato! Controlla i risultati sopra.');
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

// Test rapido per un shortCode generico
async function quickTest(shortCode = 'test') {
  try {
    const response = await fetch(`/api/analytics/${shortCode}`);
    console.log(`📞 ${shortCode}: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`📊 Clicks: ${data.clickAnalytics?.total_clicks || 0}`);
    } else {
      const error = await response.text();
      console.log(`❌ Error: ${error}`);
    }
  } catch (error) {
    console.error('❌ Fetch error:', error);
  }
}

// Rendi disponibili le funzioni
window.testAPI = testAPI;
window.quickTest = quickTest;

console.log('✅ Script caricato!');
console.log('🚀 Usa testAPI() per il test completo');
console.log('⚡ Usa quickTest("shortCode") per un test rapido');
