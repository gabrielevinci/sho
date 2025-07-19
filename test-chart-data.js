import { sql } from '@vercel/postgres';

// Configura la variabile d'ambiente se non è già settata
if (!process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL = "postgres://neondb_owner:npg_Avg8n0iImOko@ep-bitter-wildflower-a2ysw8zc-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
}

async function testChartData() {
  try {
    console.log('🧪 Test dati grafico per filtro "sempre"...\n');
    
    // Simula la stessa query che fa l'API per i dati della serie temporale
    const userId = 'b9718f87-1a56-4c6e-b91d-ec5e2cef1ad6';
    const workspaceId = 'a4d63585-d3ae-4084-a695-fdb53a796f89';
    const shortCode = 'qskNsOk';
    
    // Prima ottieni la data di creazione
    const linkQuery = await sql`
      SELECT created_at
      FROM links
      WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
      LIMIT 1
    `;
    
    const linkCreatedAt = new Date(linkQuery.rows[0].created_at);
    const today = new Date();
    
    const startDateForSeries = linkCreatedAt.toISOString().split('T')[0];
    const endDateForSeries = today.toISOString().split('T')[0];
    
    console.log(`📅 Range dati: ${startDateForSeries} → ${endDateForSeries}`);
    
    // Query per i dati della serie temporale (stessa dell'API)
    const query = `
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
    
    const { rows } = await sql.query(query, [userId, workspaceId, shortCode, startDateForSeries, endDateForSeries]);
    
    console.log(`📊 Punti dati generati: ${rows.length}`);
    console.log(`📊 Primi 5 punti dati:`);
    rows.slice(0, 5).forEach(row => {
      console.log(`   ${row.date}: ${row.total_clicks} click totali, ${row.unique_clicks} click unici`);
    });
    
    console.log(`📊 Ultimi 5 punti dati:`);
    rows.slice(-5).forEach(row => {
      console.log(`   ${row.date}: ${row.total_clicks} click totali, ${row.unique_clicks} click unici`);
    });
    
    // Calcola statistiche
    const totalClicks = rows.reduce((sum, row) => sum + parseInt(row.total_clicks), 0);
    const totalUniqueClicks = rows.reduce((sum, row) => sum + parseInt(row.unique_clicks), 0);
    const daysWithClicks = rows.filter(row => parseInt(row.total_clicks) > 0).length;
    
    console.log(`\n📈 Statistiche riepilogo:`);
    console.log(`   Total click nel periodo: ${totalClicks}`);
    console.log(`   Click unici nel periodo: ${totalUniqueClicks}`);
    console.log(`   Giorni con attività: ${daysWithClicks}/${rows.length}`);
    
    // Calcola l'intervallo per il grafico (come nel componente)
    const intervalForChart = Math.max(0, Math.floor(rows.length / 12));
    console.log(`\n📊 Intervallo calcolato per il grafico: ${intervalForChart}`);
    console.log(`   Etichette mostrate sul grafico: circa ${Math.ceil(rows.length / (intervalForChart + 1))}`);
    
    console.log('\n✅ Test dati grafico completato!');
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

testChartData();
