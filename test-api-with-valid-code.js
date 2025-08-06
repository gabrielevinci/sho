require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

// Utilizziamo lo shortCode che abbiamo trovato
const shortCode = 'CIIhbJv';
const today = new Date();
const oneMonthAgo = new Date();
oneMonthAgo.setMonth(today.getMonth() - 1);

// Formatta le date correttamente
const startDateISO = oneMonthAgo.toISOString();
const endDateISO = new Date(today.setHours(23, 59, 59, 999)).toISOString();

console.log(`Test API per shortCode: ${shortCode}`);
console.log(`Periodo: ${startDateISO} - ${endDateISO}`);

async function testApi() {
  try {
    // Costruire l'URL con i parametri di query
    const url = `http://localhost:3000/api/analytics?shortCode=${shortCode}&startDateISO=${encodeURIComponent(startDateISO)}&endDateISO=${encodeURIComponent(endDateISO)}`;
    console.log(`URL: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Errore API: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`Risposta: ${text}`);
      return;
    }

    const data = await response.json();
    console.log('=== RISPOSTA API ===');
    
    // Stampa il numero totale di click
    console.log(`Totale click: ${data.totalClicks}`);
    
    // Stampa le statistiche per città
    console.log('\n=== STATISTICHE CITTÀ ===');
    if (data.cityStats && data.cityStats.length > 0) {
      let totalCityClicks = 0;
      data.cityStats.forEach(stat => {
        console.log(`${stat.name}: ${stat.clicks} click`);
        totalCityClicks += stat.clicks;
      });
      console.log(`Totale click città: ${totalCityClicks}`);
      if (totalCityClicks !== data.totalClicks) {
        console.log(`⚠️ ATTENZIONE: Il totale dei click per città (${totalCityClicks}) non corrisponde al totale click (${data.totalClicks})`);
      }
    } else {
      console.log('Nessuna statistica per città disponibile');
    }
    
    // Stampa le statistiche per browser
    console.log('\n=== STATISTICHE BROWSER ===');
    if (data.browserStats && data.browserStats.length > 0) {
      let totalBrowserClicks = 0;
      data.browserStats.forEach(stat => {
        console.log(`${stat.name}: ${stat.clicks} click`);
        totalBrowserClicks += stat.clicks;
      });
      console.log(`Totale click browser: ${totalBrowserClicks}`);
      if (totalBrowserClicks !== data.totalClicks) {
        console.log(`⚠️ ATTENZIONE: Il totale dei click per browser (${totalBrowserClicks}) non corrisponde al totale click (${data.totalClicks})`);
      }
    } else {
      console.log('Nessuna statistica per browser disponibile');
    }

    // Stampa anche le statistiche dei paesi per confronto
    console.log('\n=== STATISTICHE PAESI ===');
    if (data.countryStats && data.countryStats.length > 0) {
      let totalCountryClicks = 0;
      data.countryStats.forEach(stat => {
        console.log(`${stat.name}: ${stat.clicks} click`);
        totalCountryClicks += stat.clicks;
      });
      console.log(`Totale click paesi: ${totalCountryClicks}`);
      if (totalCountryClicks !== data.totalClicks) {
        console.log(`⚠️ ATTENZIONE: Il totale dei click per paese (${totalCountryClicks}) non corrisponde al totale click (${data.totalClicks})`);
      }
    } else {
      console.log('Nessuna statistica per paese disponibile');
    }
  } catch (error) {
    console.error('Errore durante il test dell\'API:', error);
  }
}

testApi();
