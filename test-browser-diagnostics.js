// DIAGNOSTICA COMPLETA ANALYTICS - Da eseguire nella console del browser
// 
// ISTRUZIONI:
// 1. Vai su una pagina di analytics di un link (es: /dashboard/analytics/abc123)
// 2. Apri la console del browser (F12)
// 3. Incolla questo script e premi Invio
// 4. Esegui: diagnoseAnalytics()

console.log('=== DIAGNOSTICA ANALYTICS ===');

async function diagnoseAnalytics() {
  console.log('🔍 Avvio diagnostica completa...');
  
  // 1. Verifica URL corrente
  const currentPath = window.location.pathname;
  console.log('📍 URL corrente:', currentPath);
  
  // Estrai shortCode dall'URL
  const pathParts = currentPath.split('/');
  const shortCodeIndex = pathParts.indexOf('analytics');
  const shortCode = shortCodeIndex >= 0 && pathParts[shortCodeIndex + 1] 
    ? pathParts[shortCodeIndex + 1] 
    : null;
  
  if (!shortCode) {
    console.error('❌ Non riesco a determinare lo shortCode dall\'URL');
    console.log('💡 Assicurati di essere su una pagina /dashboard/analytics/[shortCode]');
    return;
  }
  
  console.log('🔗 ShortCode trovato:', shortCode);
  
  // 2. Test connessione API base
  console.log('\n=== TEST 1: Connessione API ===');
  try {
    const testResponse = await fetch(`/api/analytics/${shortCode}`);
    console.log('✅ Status response:', testResponse.status);
    console.log('✅ Headers:', [...testResponse.headers.entries()]);
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.log('❌ Errore API:', errorText);
      
      if (testResponse.status === 401) {
        console.log('🔒 Problema di autenticazione - riprova dopo il login');
        return;
      }
      if (testResponse.status === 404) {
        console.log('🔍 Link non trovato - verifica che lo shortCode sia corretto');
        return;
      }
      return;
    }
    
    const responseData = await testResponse.json();
    console.log('📊 Dati ricevuti dall\'API:', {
      hasLinkData: !!responseData.linkData,
      hasClickAnalytics: !!responseData.clickAnalytics,
      hasGeographicData: !!responseData.geographicData,
      hasDeviceData: !!responseData.deviceData,
      hasTimeSeriesData: !!responseData.timeSeriesData
    });
    
    // 3. Verifica dettagli statistiche
    console.log('\n=== TEST 2: Analisi Statistiche ===');
    if (responseData.clickAnalytics) {
      const analytics = responseData.clickAnalytics;
      console.log('📈 Click Analytics:', {
        total_clicks: analytics.total_clicks,
        unique_clicks: analytics.unique_clicks,
        clicks_today: analytics.clicks_today,
        clicks_this_week: analytics.clicks_this_week,
        clicks_this_month: analytics.clicks_this_month,
        unique_countries: analytics.unique_countries,
        unique_devices: analytics.unique_devices,
        unique_browsers: analytics.unique_browsers
      });
      
      // Controlla se i dati sono vuoti o inconsistenti
      if (analytics.total_clicks === 0) {
        console.log('⚠️  PROBLEMA: total_clicks è 0 - questo link potrebbe non avere click');
      } else if (analytics.total_clicks < 0) {
        console.log('❌ PROBLEMA: total_clicks è negativo - errore nella query');
      }
      
      if (analytics.unique_clicks > analytics.total_clicks) {
        console.log('❌ PROBLEMA: unique_clicks > total_clicks - errore logico');
      }
      
      if (analytics.clicks_today > analytics.total_clicks) {
        console.log('❌ PROBLEMA: clicks_today > total_clicks - errore nei filtri temporali');
      }
    } else {
      console.log('❌ PROBLEMA: clickAnalytics mancanti nella risposta API');
    }
    
    // 4. Verifica dati geografici
    console.log('\n=== TEST 3: Dati Geografici ===');
    if (responseData.geographicData && responseData.geographicData.length > 0) {
      console.log('🌍 Dati geografici:', responseData.geographicData.slice(0, 3));
      
      const totalPercentage = responseData.geographicData.reduce((sum, item) => sum + (item.percentage || 0), 0);
      if (totalPercentage > 100.1) {
        console.log('❌ PROBLEMA: Percentuali geografiche sommano più di 100%');
      }
    } else {
      console.log('⚠️  Nessun dato geografico trovato');
    }
    
    // 5. Verifica elementi DOM
    console.log('\n=== TEST 4: Elementi Frontend ===');
    const statsElements = {
      totalClicks: document.querySelector('[data-testid="total-clicks"], .stat-total-clicks'),
      uniqueClicks: document.querySelector('[data-testid="unique-clicks"], .stat-unique-clicks'),
      clicksToday: document.querySelector('[data-testid="clicks-today"], .stat-clicks-today'),
      countries: document.querySelector('[data-testid="countries"], .stat-countries'),
      statisticsGeneral: document.querySelector('[class*="statistic"], [class*="general"]'),
      statisticsDetailed: document.querySelector('[class*="detailed"], [class*="chart"]')
    };
    
    console.log('🎨 Elementi DOM trovati:');
    Object.entries(statsElements).forEach(([key, element]) => {
      if (element) {
        console.log(`✅ ${key}: trovato - testo: "${element.textContent?.slice(0, 50)}..."`);
      } else {
        console.log(`❌ ${key}: NON trovato`);
      }
    });
    
    // 6. Test filtri
    console.log('\n=== TEST 5: Test Filtri Temporali ===');
    
    // Test filtro today
    const today = new Date().toISOString().split('T')[0];
    const todayResponse = await fetch(`/api/analytics/${shortCode}?filterType=today&startDate=${today}&endDate=${today}`);
    
    if (todayResponse.ok) {
      const todayData = await todayResponse.json();
      console.log('📅 Filtro TODAY:', {
        total_clicks: todayData.clickAnalytics?.total_clicks,
        clicks_today: todayData.clickAnalytics?.clicks_today,
        confronto: todayData.clickAnalytics?.total_clicks === todayData.clickAnalytics?.clicks_today ? '✅ Coerente' : '❌ Incoerente'
      });
    } else {
      console.log('❌ Errore nel test filtro today');
    }
    
    console.log('\n=== RISULTATO DIAGNOSTICA ===');
    console.log('🔍 Diagnostica completata. Controlla i risultati sopra per identificare problemi.');
    
  } catch (error) {
    console.error('❌ Errore durante la diagnostica:', error);
  }
}

// Funzione helper per testare un shortCode specifico
async function testSpecificShortCode(shortCode) {
  console.log(`🔍 Test rapido per shortCode: ${shortCode}`);
  
  try {
    const response = await fetch(`/api/analytics/${shortCode}`);
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Dati ricevuti:', {
        total_clicks: data.clickAnalytics?.total_clicks,
        unique_clicks: data.clickAnalytics?.unique_clicks,
        hasData: !!(data.clickAnalytics?.total_clicks > 0)
      });
    } else {
      const error = await response.text();
      console.log('Errore:', error);
    }
  } catch (error) {
    console.error('Errore fetch:', error);
  }
}

// Rendi disponibili le funzioni globalmente
window.diagnoseAnalytics = diagnoseAnalytics;
window.testSpecificShortCode = testSpecificShortCode;

console.log('✅ Script caricato!');
console.log('🚀 Usa diagnoseAnalytics() per iniziare la diagnostica');
console.log('🔧 Usa testSpecificShortCode("abc123") per testare un link specifico');
