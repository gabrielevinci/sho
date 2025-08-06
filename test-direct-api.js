const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function testDirectAPI() {
  try {
    console.log('🧪 TEST DIRETTO API ANALYTICS...\n');
    
    // Test con gli stessi parametri che userebbe l'app
    const response = await fetch('http://localhost:3000/api/analytics?shortCode=test&days=9999');
    
    if (!response.ok) {
      console.error('❌ Errore API:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }
    
    const data = await response.json();
    
    console.log('=== RESPONSE API ===');
    console.log('Total clicks:', data.analytics.total_clicks);
    console.log('Unique clicks:', data.analytics.unique_clicks);
    
    console.log('\n=== CITTÀ ===');
    console.log(`Numero città: ${data.analytics.cities.length}`);
    data.analytics.cities.forEach((city, i) => {
      console.log(`${i+1}. "${city.city}" - ${city.count} click (${city.unique_count} unici)`);
    });
    
    console.log('\n=== BROWSER ===');
    console.log(`Numero browser: ${data.analytics.browsers.length}`);
    data.analytics.browsers.forEach((browser, i) => {
      console.log(`${i+1}. "${browser.browser}" - ${browser.count} click (${browser.unique_count} unici)`);
    });
    
    // Verifica totali
    const citiesSum = data.analytics.cities.reduce((sum, city) => sum + city.count, 0);
    const browsersSum = data.analytics.browsers.reduce((sum, browser) => sum + browser.count, 0);
    
    console.log('\n=== VERIFICA TOTALI ===');
    console.log(`Totale clicks: ${data.analytics.total_clicks}`);
    console.log(`Somma città: ${citiesSum}`);
    console.log(`Somma browser: ${browsersSum}`);
    
    if (citiesSum !== data.analytics.total_clicks) {
      console.log('❌ PROBLEMA CITTÀ: Somma non corrisponde al totale');
    } else {
      console.log('✅ CITTÀ: OK');
    }
    
    if (browsersSum !== data.analytics.total_clicks) {
      console.log('❌ PROBLEMA BROWSER: Somma non corrisponde al totale');
    } else {
      console.log('✅ BROWSER: OK');
    }
    
  } catch (error) {
    console.error('❌ Errore durante il test API:', error);
  } finally {
    process.exit(0);
  }
}

testDirectAPI();
