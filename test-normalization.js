const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

// Test simulato di un click da un paese con codici non normalizzati
async function testAutoNormalization() {
  try {
    console.log('🧪 Test normalizzazione automatica...\n');
    
    // Simula inserimento diretto di dati non normalizzati (come arriverebbe da API)
    const testData = {
      country_raw: 'US',  // Codice ISO
      region_raw: 'CA',   // Codice stato
      country_normalized: null,
      region_normalized: null
    };
    
    // Importa le funzioni di normalizzazione
    const { normalizeCountryName, normalizeRegionName } = require('./lib/database-helpers.ts');
    
    if (normalizeCountryName && normalizeRegionName) {
      testData.country_normalized = normalizeCountryName(testData.country_raw);
      testData.region_normalized = normalizeRegionName(testData.region_raw, testData.country_raw);
      
      console.log('✅ Test normalizzazione:');
      console.log(`   Paese: ${testData.country_raw} → ${testData.country_normalized}`);
      console.log(`   Regione: ${testData.region_raw} → ${testData.region_normalized}`);
    }
    
    // Test per Polonia
    const polandTest = {
      country: 'PL',
      region: '14'
    };
    
    if (normalizeCountryName && normalizeRegionName) {
      const normalizedCountryPL = normalizeCountryName(polandTest.country);
      const normalizedRegionPL = normalizeRegionName(polandTest.region, polandTest.country);
      
      console.log('\n🇵🇱 Test Polonia:');
      console.log(`   Paese: ${polandTest.country} → ${normalizedCountryPL}`);
      console.log(`   Regione: ${polandTest.region} → ${normalizedRegionPL}`);
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

testAutoNormalization().then(() => {
  console.log('\n✅ Test completato!');
  process.exit(0);
});
