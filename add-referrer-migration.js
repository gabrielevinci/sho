/**
 * Script di validazione per verificare la coerenza dei dati analytics
 * Controlla che i conteggi nella tabella enhanced_fingerprints siano corretti
 */

const { sql } = require('@vercel/postgres');

async function validateAnalyticsData() {
  try {
    console.log('🔍 Validazione dati analytics...\n');
    
    // 1. Prima trova tutti i link disponibili
    const allLinks = await sql`
      SELECT short_code, title, original_url, created_at 
      FROM links 
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    console.log('🔗 Link disponibili:');
    allLinks.rows.forEach((link, index) => {
      console.log(`   ${index + 1}. ${link.short_code} - ${link.title || 'Senza titolo'}`);
    });
    
    if (allLinks.rows.length === 0) {
      console.log('❌ Nessun link trovato nel database');
      return;
    }
    
    // Usa il primo link trovato
    const shortCode = allLinks.rows[0].short_code;
    
    console.log(`📊 Analisi per link: ${shortCode}`);
    
    // Ottieni ID del link
    const linkResult = await sql`
      SELECT id, title, original_url, created_at 
      FROM links 
      WHERE short_code = ${shortCode}
      LIMIT 1
    `;
    
    if (linkResult.rows.length === 0) {
      console.log(`❌ Link con shortCode "${shortCode}" non trovato`);
      return;
    }
    
    const link = linkResult.rows[0];
    console.log(`📝 Link: ${link.title || 'Senza titolo'}`);
    console.log(`🔗 URL: ${link.original_url}`);
    console.log(`📅 Creato: ${new Date(link.created_at).toLocaleDateString('it-IT')}\n`);
    
    // 2. Conteggi dalla tabella enhanced_fingerprints
    const enhancedStats = await sql`
      SELECT 
        COUNT(*) as total_clicks,
        COUNT(DISTINCT device_fingerprint) as unique_devices,
        COUNT(DISTINCT browser_fingerprint) as unique_browsers,
        COUNT(DISTINCT country) as unique_countries,
        COUNT(DISTINCT device_category) as unique_device_types,
        COUNT(DISTINCT browser_type) as unique_browser_types
      FROM enhanced_fingerprints 
      WHERE link_id = ${link.id}
    `;
    
    const enhanced = enhancedStats.rows[0];
    
    console.log('📈 STATISTICHE ENHANCED_FINGERPRINTS:');
    console.log(`   Total clicks: ${enhanced.total_clicks}`);
    console.log(`   Unique devices: ${enhanced.unique_devices}`);
    console.log(`   Unique browsers: ${enhanced.unique_browsers}`);
    console.log(`   Unique countries: ${enhanced.unique_countries}`);
    console.log(`   Device types: ${enhanced.unique_device_types}`);
    console.log(`   Browser types: ${enhanced.unique_browser_types}\n`);
    
    // 3. Conteggi dalla tabella clicks (per confronto)
    const clicksStats = await sql`
      SELECT 
        COUNT(*) as total_clicks,
        COUNT(DISTINCT user_fingerprint) as unique_fingerprints,
        COUNT(DISTINCT country) as unique_countries,
        COUNT(DISTINCT device_type) as unique_device_types,
        COUNT(DISTINCT browser_name) as unique_browser_types
      FROM clicks 
      WHERE link_id = ${link.id}
    `;
    
    const clicks = clicksStats.rows[0];
    
    console.log('📊 STATISTICHE CLICKS (legacy):');
    console.log(`   Total clicks: ${clicks.total_clicks}`);
    console.log(`   Unique fingerprints: ${clicks.unique_fingerprints}`);
    console.log(`   Unique countries: ${clicks.unique_countries}`);
    console.log(`   Device types: ${clicks.unique_device_types}`);
    console.log(`   Browser types: ${clicks.unique_browser_types}\n`);
    
    // 4. Verifica correlazioni device_fingerprint
    const correlationData = await sql`
      SELECT 
        device_fingerprint,
        COUNT(*) as total_visits,
        COUNT(DISTINCT browser_fingerprint) as unique_browsers,
        array_agg(DISTINCT browser_type) as browser_types,
        array_agg(DISTINCT created_at::date) as visit_dates
      FROM enhanced_fingerprints 
      WHERE link_id = ${link.id}
      GROUP BY device_fingerprint
      ORDER BY total_visits DESC
    `;
    
    console.log('🔗 CORRELAZIONI DEVICE_FINGERPRINT:');
    correlationData.rows.forEach((row, index) => {
      console.log(`   Device ${index + 1}:`);
      console.log(`     - Device fingerprint: ${row.device_fingerprint.substring(0, 8)}...`);
      console.log(`     - Total visits: ${row.total_visits}`);
      console.log(`     - Unique browsers: ${row.unique_browsers}`);
      console.log(`     - Browser types: ${row.browser_types.join(', ')}`);
      console.log(`     - Visit dates: ${row.visit_dates.join(', ')}\n`);
    });
    
    // 5. Verifica se i conteggi sono corretti
    const expectedUniqueVisitors = correlationData.rows.length;
    const actualUniqueDevices = parseInt(enhanced.unique_devices);
    
    console.log('✅ VALIDAZIONE:');
    if (expectedUniqueVisitors === actualUniqueDevices) {
      console.log(`   ✅ Conteggio unique devices CORRETTO: ${actualUniqueDevices}`);
    } else {
      console.log(`   ❌ Conteggio unique devices ERRATO:`);
      console.log(`      Atteso: ${expectedUniqueVisitors}`);
      console.log(`      Attuale: ${actualUniqueDevices}`);
    }
    
    // 6. Suggerimenti
    console.log('\n💡 INTERPRETAZIONE:');
    console.log(`   - I "unique devices" dovrebbero essere ${expectedUniqueVisitors} (numero di device_fingerprint unici)`);
    console.log(`   - I "total clicks" dovrebbero essere ${enhanced.total_clicks} (ogni visita da qualsiasi browser)`);
    console.log(`   - I "unique browsers" dovrebbero essere ${enhanced.unique_browsers} (browser diversi usati)`);
    
    if (correlationData.rows.some(row => row.unique_browsers > 1)) {
      console.log(`   - ⚠️  Rilevati device con più browser (comportamento atteso per stesso utente)`);
    }
    
  } catch (error) {
    console.error('❌ Errore durante la validazione:', error);
  }
}

// Esegui la validazione se lo script viene chiamato direttamente
if (require.main === module) {
  validateAnalyticsData();
}

module.exports = { validateAnalyticsData };