import { sql } from '@vercel/postgres';

// Configura la variabile d'ambiente se non è già settata
if (!process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL = "postgres://neondb_owner:npg_Avg8n0iImOko@ep-bitter-wildflower-a2ysw8zc-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
}

async function testTodayFilter() {
  try {
    console.log('🧪 Test filtro "ultime 24 ore"...\n');
    
    // Prima ottieni un link di esempio
    console.log('📋 Cerco un link esistente...');
    const linkQuery = await sql`
      SELECT short_code, original_url, user_id, workspace_id
      FROM links
      WHERE click_count > 0
      LIMIT 1
    `;
    
    if (linkQuery.rows.length === 0) {
      console.log('❌ Nessun link con click trovato');
      return;
    }
    
    const link = linkQuery.rows[0];
    console.log(`✅ Link trovato: ${link.short_code} (${link.original_url})`);
    console.log(`   User ID: ${link.user_id}, Workspace ID: ${link.workspace_id}\n`);
    
    // Test 1: Query per le ultime 24 ore con enhanced fingerprints
    console.log('🔍 Test 1: Click nelle ultime 24 ore con enhanced fingerprints');
    
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const testQuery = `
      WITH enhanced_clicks AS (
        SELECT DISTINCT
          c.id,
          c.clicked_at_rome,
          c.country,
          c.device_type,
          c.browser_name,
          COALESCE(fc.device_cluster_id, c.user_fingerprint) as unique_device
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        LEFT JOIN enhanced_fingerprints ef ON c.link_id = ef.link_id 
          AND (c.user_fingerprint = ef.fingerprint_hash OR c.user_fingerprint = ef.device_fingerprint)
        LEFT JOIN fingerprint_correlations fc ON ef.fingerprint_hash = fc.fingerprint_hash
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3
          AND c.clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '24 hours'
      )
      SELECT 
        COUNT(*) as total_clicks_24h,
        COUNT(DISTINCT unique_device) as unique_clicks_24h,
        COUNT(DISTINCT country) as unique_countries_24h,
        COUNT(DISTINCT device_type) as unique_devices_24h,
        COUNT(DISTINCT browser_name) as unique_browsers_24h
      FROM enhanced_clicks
    `;
    
    const { rows } = await sql.query(testQuery, [link.user_id, link.workspace_id, link.short_code]);
    const result = rows[0];
    
    console.log('📊 Risultati ultime 24 ore:');
    console.log(`   • Click totali: ${result.total_clicks_24h || 0}`);
    console.log(`   • Click unici: ${result.unique_clicks_24h || 0}`);
    console.log(`   • Paesi unici: ${result.unique_countries_24h || 0}`);
    console.log(`   • Dispositivi unici: ${result.unique_devices_24h || 0}`);
    console.log(`   • Browser unici: ${result.unique_browsers_24h || 0}\n`);
    
    // Test 2: Verifica la serie temporale oraria
    console.log('🔍 Test 2: Serie temporale oraria per ultime 24 ore');
    
    const timeSeriesQuery = `
      WITH hour_series AS (
        SELECT generate_series(
          DATE_TRUNC('hour', (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '23 hours'),
          DATE_TRUNC('hour', NOW() AT TIME ZONE 'Europe/Rome'),
          INTERVAL '1 hour'
        ) AS hour
      ),
      enhanced_clicks AS (
        SELECT DISTINCT
          c.clicked_at_rome,
          COALESCE(fc.device_cluster_id, c.user_fingerprint) as unique_device
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        LEFT JOIN enhanced_fingerprints ef ON c.link_id = ef.link_id 
          AND (c.user_fingerprint = ef.fingerprint_hash OR c.user_fingerprint = ef.device_fingerprint)
        LEFT JOIN fingerprint_correlations fc ON ef.fingerprint_hash = fc.fingerprint_hash
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3
          AND c.clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '24 hours'
      )
      SELECT 
        TO_CHAR(hs.hour, 'YYYY-MM-DD HH24:MI') as hour_label,
        COALESCE(COUNT(c.clicked_at_rome), 0) as total_clicks,
        COALESCE(COUNT(DISTINCT c.unique_device), 0) as unique_clicks
      FROM hour_series hs
      LEFT JOIN enhanced_clicks c ON DATE_TRUNC('hour', c.clicked_at_rome) = hs.hour
      GROUP BY hs.hour
      ORDER BY hs.hour DESC
      LIMIT 5
    `;
    
    const timeSeriesResult = await sql.query(timeSeriesQuery, [link.user_id, link.workspace_id, link.short_code]);
    
    console.log('📊 Ultime 5 ore con attività:');
    timeSeriesResult.rows.forEach(row => {
      console.log(`   • ${row.hour_label}: ${row.total_clicks} click totali, ${row.unique_clicks} click unici`);
    });
    
    console.log('\n✅ Test completato con successo!');
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

testTodayFilter();
