// Test frontend di debug per analytics
console.log('=== TEST DEBUG ANALYTICS FRONTEND ===');

// Simula una chiamata come farebbe il frontend
async function testAnalyticsCall(shortCode = 'test') {
  try {
    console.log('🔄 Testando chiamata analytics...');
    
    // Test 1: Chiamata senza filtri (all)
    const response1 = await fetch(`/api/analytics/${shortCode}?filterType=all`);
    console.log('✅ Response status (all):', response1.status);
    
    if (!response1.ok) {
      const error1 = await response1.text();
      console.log('❌ Error response (all):', error1);
      return;
    }
    
    const data1 = await response1.json();
    console.log('📊 Analytics data (all):', {
      linkData: data1.linkData,
      clickAnalytics: data1.clickAnalytics,
      hasGeographicData: data1.geographicData?.length > 0,
      hasDeviceData: data1.deviceData?.length > 0
    });
    
    // Test 2: Chiamata con filtro today
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = startDate;
    
    const response2 = await fetch(`/api/analytics/${shortCode}?filterType=today&startDate=${startDate}&endDate=${endDate}`);
    console.log('✅ Response status (today):', response2.status);
    
    if (!response2.ok) {
      const error2 = await response2.text();
      console.log('❌ Error response (today):', error2);
      return;
    }
    
    const data2 = await response2.json();
    console.log('📊 Analytics data (today):', {
      total_clicks: data2.clickAnalytics?.total_clicks,
      clicks_today: data2.clickAnalytics?.clicks_today,
      unique_clicks: data2.clickAnalytics?.unique_clicks
    });
    
  } catch (error) {
    console.error('🚨 Errore durante il test:', error);
  }
}

// Funzione per testare disponibilità API
async function testAPIAvailability() {
  try {
    console.log('🔄 Testando disponibilità API...');
    
    const response = await fetch('/api/analytics/nonexistent');
    console.log('Response status:', response.status);
    
    const text = await response.text();
    console.log('Response body:', text);
    
  } catch (error) {
    console.error('Errore connessione API:', error);
  }
}

// Esegui i test
console.log('=== INIZIO TEST ===');
console.log('1. Usa testAPIAvailability() per testare la connessione API');
console.log('2. Usa testAnalyticsCall("YOUR_SHORTCODE") per testare con un link reale');
console.log('3. Controlla la console Network nel browser');

// Esporta le funzioni globalmente per uso in console
window.testAnalyticsCall = testAnalyticsCall;
window.testAPIAvailability = testAPIAvailability;
