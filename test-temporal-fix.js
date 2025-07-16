/**
 * Script di test per verificare che l'andamento temporale mostri 
 * i click totali corretti come nelle card "click totali"
 */

import { sql } from '@vercel/postgres';

async function testTemporalAnalytics() {
  console.log('🧪 Test: Andamento temporale vs Click totali\n');

  try {
    // Simula i parametri di un utente e link reale
    const testUserId = '1'; // Sostituisci con un userId valido
    const testWorkspaceId = '1'; // Sostituisci con un workspaceId valido  
    const testShortCode = 'test'; // Sostituisci con uno shortCode valido

    // 1. Ottieni i click totali dalla tabella links (come mostrato nelle card)
    const linkTotals = await sql`
      SELECT click_count, unique_click_count 
      FROM links 
      WHERE user_id = ${testUserId} 
        AND workspace_id = ${testWorkspaceId} 
        AND short_code = ${testShortCode}
    `;

    if (linkTotals.rows.length === 0) {
      console.log('❌ Link non trovato. Aggiorna i parametri di test.');
      return;
    }

    const actualTotalClicks = linkTotals.rows[0].click_count;
    const actualUniqueClicks = linkTotals.rows[0].unique_click_count;

    console.log('📊 Click totali dalla tabella links:');
    console.log(`  - Click totali: ${actualTotalClicks}`);
    console.log(`  - Click unici: ${actualUniqueClicks}\n`);

    // 2. Ottieni i dati dell'andamento temporale e somma tutti i valori
    const timeSeriesData = await sql`
      WITH link_data AS (
        SELECT id, click_count, unique_click_count FROM links 
        WHERE user_id = ${testUserId} AND workspace_id = ${testWorkspaceId} AND short_code = ${testShortCode}
      ),
      link_creation_date AS (
        SELECT (created_at AT TIME ZONE 'Europe/Rome')::date as creation_date
        FROM links
        WHERE user_id = ${testUserId} 
          AND workspace_id = ${testWorkspaceId} 
          AND short_code = ${testShortCode}
      ),
      current_date_italy AS (
        SELECT (NOW() AT TIME ZONE 'Europe/Rome')::date as current_date
      ),
      total_calculated AS (
        SELECT 
          COUNT(*) as total_from_enhanced,
          COUNT(DISTINCT ef.device_fingerprint) as unique_from_enhanced
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
      ),
      date_series AS (
        SELECT generate_series(
          (SELECT creation_date FROM link_creation_date),
          (SELECT current_date FROM current_date_italy),
          INTERVAL '1 day'
        )::date AS date
      ),
      daily_clicks AS (
        SELECT 
          ef.created_at::date as date,
          COUNT(ef.id) as raw_total_clicks,
          COUNT(DISTINCT ef.device_fingerprint) as raw_unique_clicks
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
        GROUP BY ef.created_at::date
      ),
      distribution_factors AS (
        SELECT 
          dc.date,
          CASE WHEN tc.total_from_enhanced > 0 
               THEN dc.raw_total_clicks::float / tc.total_from_enhanced 
               ELSE 0 END as total_distribution,
          CASE WHEN tc.unique_from_enhanced > 0 
               THEN dc.raw_unique_clicks::float / tc.unique_from_enhanced 
               ELSE 0 END as unique_distribution
        FROM daily_clicks dc, total_calculated tc
      )
      SELECT 
        TO_CHAR(ds.date, 'YYYY-MM-DD') as date,
        ROUND(COALESCE(df.total_distribution, 0) * (SELECT click_count FROM link_data))::integer as total_clicks,
        ROUND(COALESCE(df.unique_distribution, 0) * (SELECT unique_click_count FROM link_data))::integer as unique_clicks
      FROM date_series ds
      LEFT JOIN distribution_factors df ON ds.date = df.date
      ORDER BY ds.date
    `;

    // 3. Somma tutti i click dell'andamento temporale
    let sumTotalClicks = 0;
    let sumUniqueClicks = 0;
    
    timeSeriesData.rows.forEach(row => {
      sumTotalClicks += row.total_clicks;
      sumUniqueClicks += row.unique_clicks;
    });

    console.log('📈 Somma andamento temporale:');
    console.log(`  - Click totali: ${sumTotalClicks}`);
    console.log(`  - Click unici: ${sumUniqueClicks}\n`);

    // 4. Verifica che i totali coincidano
    const totalClicksMatch = sumTotalClicks === actualTotalClicks;
    const uniqueClicksMatch = sumUniqueClicks === actualUniqueClicks;

    console.log('✅ Risultati del test:');
    console.log(`  - Click totali corrispondono: ${totalClicksMatch ? '✅ SÌ' : '❌ NO'}`);
    console.log(`  - Click unici corrispondono: ${uniqueClicksMatch ? '✅ SÌ' : '❌ NO'}`);

    if (totalClicksMatch && uniqueClicksMatch) {
      console.log('\n🎉 SUCCESSO! L\'andamento temporale ora mostra i click totali corretti!');
    } else {
      console.log('\n⚠️  I totali non corrispondono. Verifica la logica di distribuzione.');
      
      if (!totalClicksMatch) {
        console.log(`   Differenza click totali: ${sumTotalClicks - actualTotalClicks}`);
      }
      if (!uniqueClicksMatch) {
        console.log(`   Differenza click unici: ${sumUniqueClicks - actualUniqueClicks}`);
      }
    }

    // 5. Mostra alcuni dati di esempio dell'andamento
    console.log('\n📅 Primi 5 giorni dell\'andamento temporale:');
    timeSeriesData.rows.slice(0, 5).forEach(row => {
      console.log(`  ${row.date}: ${row.total_clicks} totali, ${row.unique_clicks} unici`);
    });

  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
}

// Esegui il test
testTemporalAnalytics().then(() => {
  console.log('\n✅ Test completato');
}).catch(console.error);
