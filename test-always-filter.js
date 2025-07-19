import { sql } from '@vercel/postgres';

// Configura la variabile d'ambiente se non è già settata
if (!process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL = "postgres://neondb_owner:npg_Avg8n0iImOko@ep-bitter-wildflower-a2ysw8zc-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
}

async function testAlwaysFilter() {
  try {
    console.log('🧪 Test filtro "always" (tutti i dati dal momento della creazione)...\n');
    
    // Prima ottieni un link di esempio
    console.log('📋 Cerco un link esistente...');
    const linkQuery = await sql`
      SELECT short_code, original_url, user_id, workspace_id, created_at
      FROM links
      WHERE click_count > 0
      LIMIT 1
    `;
    
    if (linkQuery.rows.length === 0) {
      console.log('❌ Nessun link con click trovato');
      return;
    }
    
    const link = linkQuery.rows[0];
    const createdAt = new Date(link.created_at);
    const today = new Date();
    
    console.log(`✅ Link trovato: ${link.short_code} (${link.original_url})`);
    console.log(`   User ID: ${link.user_id}, Workspace ID: ${link.workspace_id}`);
    console.log(`   Creato il: ${createdAt.toISOString().split('T')[0]}`);
    console.log(`   Oggi è: ${today.toISOString().split('T')[0]}\n`);
    
    // Test 1: Verifica il range temporale per "always"
    console.log('🔍 Test 1: Range temporale dal momento della creazione');
    
    const startDateForSeries = createdAt.toISOString().split('T')[0];
    const endDateForSeries = today.toISOString().split('T')[0];
    
    console.log(`📅 Range calcolato: ${startDateForSeries} → ${endDateForSeries}`);
    
    // Test 2: Query completa per serie temporale "always"
    console.log('\n🔍 Test 2: Serie temporale completa con enhanced fingerprints');
    
    const timeSeriesQuery = `
      WITH date_series AS (
        SELECT generate_series(
          $4::date,
          $5::date,
          INTERVAL '1 day'
        )::date AS date
      ),
      enhanced_clicks AS (
        SELECT DISTINCT
          c.clicked_at_rome::date as click_date,
          COALESCE(fc.device_cluster_id, c.user_fingerprint) as unique_device
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        LEFT JOIN enhanced_fingerprints ef ON c.link_id = ef.link_id 
          AND (c.user_fingerprint = ef.fingerprint_hash OR c.user_fingerprint = ef.device_fingerprint)
        LEFT JOIN fingerprint_correlations fc ON ef.fingerprint_hash = fc.fingerprint_hash
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3
          AND c.clicked_at_rome::date >= $4::date
          AND c.clicked_at_rome::date <= $5::date
      )
      SELECT 
        ds.date::text as date,
        COALESCE(COUNT(c.click_date), 0) as total_clicks,
        COALESCE(COUNT(DISTINCT c.unique_device), 0) as unique_clicks
      FROM date_series ds
      LEFT JOIN enhanced_clicks c ON c.click_date = ds.date
      GROUP BY ds.date
      ORDER BY ds.date
    `;
    
    console.log('📝 Eseguendo query...');
    const { rows } = await sql.query(timeSeriesQuery, [
      link.user_id, 
      link.workspace_id, 
      link.short_code, 
      startDateForSeries, 
      endDateForSeries
    ]);
    
    console.log(`📊 Giorni totali nel range: ${rows.length}`);
    
    // Calcola statistiche di riepilogo
    const totalClicks = rows.reduce((sum, row) => sum + parseInt(row.total_clicks), 0);
    const totalUniqueClicks = rows.reduce((sum, row) => sum + parseInt(row.unique_clicks), 0);
    const daysWithActivity = rows.filter(row => parseInt(row.total_clicks) > 0).length;
    
    console.log(`📈 Click totali nel periodo: ${totalClicks}`);
    console.log(`👤 Click unici nel periodo: ${totalUniqueClicks}`);
    console.log(`📅 Giorni con attività: ${daysWithActivity}`);
    
    // Mostra gli ultimi 10 giorni con attività
    console.log('\n📊 Ultimi 10 giorni con attività:');
    const activeDays = rows.filter(row => parseInt(row.total_clicks) > 0).slice(-10);
    
    if (activeDays.length === 0) {
      console.log('   ❌ Nessun giorno con attività trovato');
    } else {
      activeDays.forEach(row => {
        console.log(`   • ${row.date}: ${row.total_clicks} click totali, ${row.unique_clicks} click unici`);
      });
    }
    
    // Test 3: Confronto con il vecchio metodo (solo ultimi 30 giorni)
    console.log('\n🔍 Test 3: Confronto con range limitato (ultimi 30 giorni)');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const limitedRangeQuery = `
      WITH date_series AS (
        SELECT generate_series(
          $4::date,
          $5::date,
          INTERVAL '1 day'
        )::date AS date
      ),
      enhanced_clicks AS (
        SELECT DISTINCT
          c.clicked_at_rome::date as click_date,
          COALESCE(fc.device_cluster_id, c.user_fingerprint) as unique_device
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        LEFT JOIN enhanced_fingerprints ef ON c.link_id = ef.link_id 
          AND (c.user_fingerprint = ef.fingerprint_hash OR c.user_fingerprint = ef.device_fingerprint)
        LEFT JOIN fingerprint_correlations fc ON ef.fingerprint_hash = fc.fingerprint_hash
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3
          AND c.clicked_at_rome::date >= $4::date
          AND c.clicked_at_rome::date <= $5::date
      )
      SELECT 
        COUNT(*) as total_days,
        COALESCE(SUM(CASE WHEN c.click_date IS NOT NULL THEN 1 ELSE 0 END), 0) as days_with_clicks,
        COALESCE(COUNT(c.click_date), 0) as total_clicks_30d,
        COALESCE(COUNT(DISTINCT c.unique_device), 0) as unique_clicks_30d
      FROM date_series ds
      LEFT JOIN enhanced_clicks c ON c.click_date = ds.date
    `;
    
    const limitedResult = await sql.query(limitedRangeQuery, [
      link.user_id, 
      link.workspace_id, 
      link.short_code, 
      thirtyDaysAgoStr, 
      endDateForSeries
    ]);
    
    const limited = limitedResult.rows[0];
    console.log(`📊 Ultimi 30 giorni: ${limited.total_clicks_30d} click totali, ${limited.unique_clicks_30d} click unici`);
    console.log(`🆚 Differenza con "always": +${totalClicks - parseInt(limited.total_clicks_30d)} click totali, +${totalUniqueClicks - parseInt(limited.unique_clicks_30d)} click unici`);
    
    console.log('\n✅ Test completato con successo!');
    console.log(`🎯 Il filtro "always" ora mostra ${rows.length} giorni invece di 30 giorni`);
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

testAlwaysFilter();
