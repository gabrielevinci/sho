// Test per verificare se ci sono dati nel database
const { sql } = require('@vercel/postgres');

async function checkDatabaseData() {
  try {
    console.log('🔍 Controllando dati nel database...');
    
    // 1. Controlla se ci sono link
    console.log('\n=== LINKS ===');
    const linksResult = await sql`
      SELECT short_code, original_url, click_count, unique_click_count, created_at
      FROM links 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    console.log(`Totale links trovati: ${linksResult.rows.length}`);
    linksResult.rows.forEach(link => {
      console.log(`- ${link.short_code}: ${link.click_count} clicks (${link.unique_click_count} unique)`);
    });
    
    // 2. Controlla se ci sono clicks
    console.log('\n=== CLICKS ===');
    const clicksResult = await sql`
      SELECT l.short_code, COUNT(*) as click_count, COUNT(DISTINCT c.user_fingerprint) as unique_count
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      GROUP BY l.short_code
      ORDER BY click_count DESC
      LIMIT 5
    `;
    console.log(`Links con clicks: ${clicksResult.rows.length}`);
    clicksResult.rows.forEach(link => {
      console.log(`- ${link.short_code}: ${link.click_count} clicks (${link.unique_count} unique)`);
    });
    
    // 3. Controlla enhanced fingerprints
    console.log('\n=== ENHANCED FINGERPRINTS ===');
    const fingerprintsResult = await sql`
      SELECT COUNT(*) as total_fingerprints,
             COUNT(DISTINCT fingerprint_hash) as unique_fingerprints
      FROM enhanced_fingerprints
    `;
    console.log(`Enhanced fingerprints: ${fingerprintsResult.rows[0]?.total_fingerprints || 0} totali, ${fingerprintsResult.rows[0]?.unique_fingerprints || 0} unici`);
    
    // 4. Controlla correlazioni fingerprint
    console.log('\n=== FINGERPRINT CORRELATIONS ===');
    const correlationsResult = await sql`
      SELECT COUNT(*) as total_correlations,
             COUNT(DISTINCT device_cluster_id) as unique_clusters
      FROM fingerprint_correlations
    `;
    console.log(`Correlazioni: ${correlationsResult.rows[0]?.total_correlations || 0} totali, ${correlationsResult.rows[0]?.unique_clusters || 0} cluster`);
    
    // 5. Esempio di query come quella dell'API
    if (clicksResult.rows.length > 0) {
      const testShortCode = clicksResult.rows[0].short_code;
      console.log(`\n=== TEST QUERY PER ${testShortCode} ===`);
      
      const testResult = await sql`
        WITH link_info AS (
          SELECT id, click_count, unique_click_count, created_at
          FROM links 
          WHERE short_code = ${testShortCode}
        )
        SELECT 
          l.short_code,
          l.click_count,
          l.unique_click_count,
          COUNT(c.id) as actual_clicks,
          COUNT(DISTINCT c.user_fingerprint) as actual_unique_clicks
        FROM link_info l
        LEFT JOIN clicks c ON c.link_id = l.id
        GROUP BY l.short_code, l.click_count, l.unique_click_count
      `;
      
      if (testResult.rows.length > 0) {
        const row = testResult.rows[0];
        console.log(`Link ${row.short_code}:`);
        console.log(`- click_count in tabella links: ${row.click_count}`);
        console.log(`- clicks effettivi nella tabella clicks: ${row.actual_clicks}`);
        console.log(`- unique_click_count in tabella links: ${row.unique_click_count}`);
        console.log(`- unique clicks effettivi: ${row.actual_unique_clicks}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Errore durante il controllo database:', error);
    console.error('Stack trace:', error.stack);
  }
}

module.exports = { checkDatabaseData };

if (require.main === module) {
  checkDatabaseData();
}
