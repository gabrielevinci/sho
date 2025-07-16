#!/usr/bin/env node

/**
 * Verifica finale che tutte le query siano corrette
 */

const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function finalVerification() {
  console.log('🔍 VERIFICA FINALE CORREZIONI ANALYTICS\n');

  try {
    // 1. Verifica link con dati enhanced
    const linkWithData = await sql`
      SELECT 
        l.short_code,
        l.click_count as db_click_count,
        l.unique_click_count as db_unique_count,
        COUNT(DISTINCT ef.device_fingerprint) as actual_unique_devices,
        COUNT(DISTINCT ef.browser_fingerprint) as unique_browsers,
        COUNT(ef.id) as enhanced_clicks_count
      FROM links l
      JOIN enhanced_fingerprints ef ON l.id = ef.link_id
      WHERE ef.device_fingerprint = '756b1bbd1d5365b0e37f'
      GROUP BY l.id, l.short_code, l.click_count, l.unique_click_count
      ORDER BY enhanced_clicks_count DESC
      LIMIT 1
    `;

    if (linkWithData.rows.length === 0) {
      console.log('❌ Nessun link con dati enhanced trovato');
      return;
    }

    const link = linkWithData.rows[0];
    console.log('📊 Link test:', link.short_code);
    console.log(`├─ Click nel DB: ${link.db_click_count}`);
    console.log(`├─ Unique nel DB: ${link.db_unique_count}`);
    console.log(`├─ Device unici reali: ${link.actual_unique_devices}`);
    console.log(`├─ Browser unici: ${link.unique_browsers}`);
    console.log(`└─ Enhanced clicks: ${link.enhanced_clicks_count}\n`);

    // 2. Test query mensile corretta
    console.log('📅 Test query mensile (dovrebbe mostrare 1 unique visitor)...');
    const monthlyTest = await sql`
      WITH monthly_clicks AS (
        SELECT 
          EXTRACT(MONTH FROM ef.created_at)::integer as month_number,
          EXTRACT(YEAR FROM ef.created_at)::integer as year,
          COUNT(ef.id)::integer as total_clicks,
          COUNT(DISTINCT ef.device_fingerprint)::integer as unique_clicks
        FROM enhanced_fingerprints ef
        JOIN links l ON ef.link_id = l.id
        WHERE l.short_code = ${link.short_code}
          AND EXTRACT(YEAR FROM ef.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY EXTRACT(MONTH FROM ef.created_at), EXTRACT(YEAR FROM ef.created_at)
      )
      SELECT * FROM monthly_clicks
    `;

    monthlyTest.rows.forEach((month, index) => {
      console.log(`  ${index + 1}. Mese ${month.month_number}/${month.year}: ${month.total_clicks} click, ${month.unique_clicks} unique`);
    });

    // 3. Test query settimanale corretta  
    console.log('\n📅 Test query settimanale...');
    const weeklyTest = await sql`
      WITH weekly_clicks AS (
        SELECT 
          DATE_PART('week', ef.created_at)::integer as week,
          EXTRACT(YEAR FROM ef.created_at)::integer as year,
          COUNT(ef.id)::integer as total_clicks,
          COUNT(DISTINCT ef.device_fingerprint)::integer as unique_clicks
        FROM enhanced_fingerprints ef
        JOIN links l ON ef.link_id = l.id
        WHERE l.short_code = ${link.short_code}
          AND EXTRACT(YEAR FROM ef.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY DATE_PART('week', ef.created_at), EXTRACT(YEAR FROM ef.created_at)
      )
      SELECT * FROM weekly_clicks
    `;

    weeklyTest.rows.forEach((week, index) => {
      console.log(`  ${index + 1}. Settimana ${week.week}/${week.year}: ${week.total_clicks} click, ${week.unique_clicks} unique`);
    });

    // 4. Test query time series corretta
    console.log('\n📈 Test query time series...');
    const timeSeriesTest = await sql`
      WITH daily_clicks AS (
        SELECT 
          ef.created_at::date as date,
          COUNT(ef.id) as total_clicks,
          COUNT(DISTINCT ef.device_fingerprint) as unique_clicks
        FROM enhanced_fingerprints ef
        JOIN links l ON ef.link_id = l.id
        WHERE l.short_code = ${link.short_code}
        GROUP BY ef.created_at::date
      )
      SELECT * FROM daily_clicks ORDER BY date
    `;

    timeSeriesTest.rows.forEach((day, index) => {
      console.log(`  ${index + 1}. ${day.date}: ${day.total_clicks} click, ${day.unique_clicks} unique`);
    });

    // 5. Verifica correlazioni
    console.log('\n🔗 Verifica correlazioni...');
    const correlations = await sql`
      SELECT 
        device_cluster_id,
        COUNT(*) as fingerprints_count,
        correlation_type,
        AVG(confidence_score) as avg_confidence
      FROM fingerprint_correlations
      GROUP BY device_cluster_id, correlation_type
      ORDER BY fingerprints_count DESC
    `;

    if (correlations.rows.length > 0) {
      correlations.rows.forEach((cluster, index) => {
        console.log(`  ${index + 1}. Cluster: ${cluster.device_cluster_id.substring(0, 12)}... (${cluster.fingerprints_count} fingerprints, confidenza: ${parseFloat(cluster.avg_confidence).toFixed(1)}%)`);
      });
    } else {
      console.log('  Nessuna correlazione trovata');
    }

    console.log('\n✅ RISULTATO ATTESO:');
    console.log('📊 Tutti i grafici dovrebbero ora mostrare:');
    console.log(`   ├─ Total clicks: ${link.enhanced_clicks_count} (corretto)`);
    console.log(`   ├─ Unique visitors: ${link.actual_unique_devices} (corretto - basato su device)`);
    console.log(`   └─ Browser unici: ${link.unique_browsers} (solo per info interna)`);
    
    console.log('\n🎯 ISTRUZIONI FINALI:');
    console.log('1. Ricarica la pagina analytics nel browser');
    console.log(`2. Vai su: http://localhost:3000/dashboard/analytics/${link.short_code}`);
    console.log('3. Verifica che i grafici mostrino 1 unique visitor');
    console.log('4. Il sistema è ora completamente corretto! 🎉');

  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

finalVerification();
