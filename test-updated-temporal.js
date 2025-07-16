#!/usr/bin/env node

/**
 * Script di test per le funzioni temporali aggiornate
 */

const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function testUpdatedTemporalFunctions() {
  console.log('🔧 TEST FUNZIONI TEMPORALI AGGIORNATE\n');

  try {
    // Trova un link di test
    const testLink = await sql`
      SELECT l.id, l.short_code, l.user_id, l.workspace_id
      FROM links l
      LEFT JOIN enhanced_fingerprints ef ON l.id = ef.link_id
      GROUP BY l.id, l.short_code, l.user_id, l.workspace_id
      HAVING COUNT(ef.id) > 0
      ORDER BY COUNT(ef.id) DESC
      LIMIT 1
    `;

    if (testLink.rows.length === 0) {
      console.log('❌ Nessun link con dati trovato');
      return;
    }

    const link = testLink.rows[0];
    console.log(`🔗 Testing link: ${link.short_code}\n`);

    // Test 1: getHourlyData (nuova funzione)
    console.log('🕐 Test getHourlyData (ultime 24 ore)...');
    const hourlyData = await sql`
      WITH hour_series AS (
        SELECT generate_series(
          DATE_TRUNC('hour', NOW() - INTERVAL '23 hours'),
          DATE_TRUNC('hour', NOW()),
          INTERVAL '1 hour'
        ) AS hour
      ),
      hourly_clicks AS (
        SELECT 
          DATE_TRUNC('hour', ef.created_at) as hour,
          COUNT(*) as total_clicks,
          COUNT(DISTINCT ef.device_fingerprint) as unique_clicks
        FROM enhanced_fingerprints ef
        JOIN links l ON ef.link_id = l.id
        WHERE l.user_id = ${link.user_id} 
          AND l.workspace_id = ${link.workspace_id} 
          AND l.short_code = ${link.short_code}
          AND ef.created_at >= NOW() - INTERVAL '23 hours'
        GROUP BY DATE_TRUNC('hour', ef.created_at)
      )
      SELECT 
        TO_CHAR(hs.hour, 'YYYY-MM-DD"T"HH24:MI:SS') as date,
        COALESCE(hc.total_clicks, 0) as total_clicks,
        COALESCE(hc.unique_clicks, 0) as unique_clicks,
        hs.hour as full_datetime
      FROM hour_series hs
      LEFT JOIN hourly_clicks hc ON hs.hour = hc.hour
      ORDER BY hs.hour
    `;

    console.log(`📊 Hourly data: ${hourlyData.rows.length} ore`);
    const hoursWithClicks = hourlyData.rows.filter(row => row.total_clicks > 0);
    console.log(`📈 Ore con clicks: ${hoursWithClicks.length}`);
    
    if (hoursWithClicks.length > 0) {
      console.log('🕐 Prime 3 ore con clicks:');
      hoursWithClicks.slice(0, 3).forEach(row => {
        console.log(`   ${row.date}: ${row.total_clicks} total, ${row.unique_clicks} unique`);
      });
    }

    // Test 2: getTimeSeriesData con formato migliorato
    console.log('\n📅 Test getTimeSeriesData (formato migliorato)...');
    const timeSeriesData = await sql`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '29 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS date
      ),
      daily_clicks AS (
        SELECT 
          ef.created_at::date as date,
          COUNT(*) as total_clicks,
          COUNT(DISTINCT ef.device_fingerprint) as unique_clicks
        FROM enhanced_fingerprints ef
        JOIN links l ON ef.link_id = l.id
        WHERE l.user_id = ${link.user_id} 
          AND l.workspace_id = ${link.workspace_id} 
          AND l.short_code = ${link.short_code}
          AND ef.created_at >= CURRENT_DATE - INTERVAL '29 days'
          AND ef.created_at < CURRENT_DATE + INTERVAL '1 day'
        GROUP BY ef.created_at::date
      )
      SELECT 
        TO_CHAR(ds.date, 'YYYY-MM-DD') as date,
        COALESCE(dc.total_clicks, 0) as total_clicks,
        COALESCE(dc.unique_clicks, 0) as unique_clicks,
        ds.date as full_datetime
      FROM date_series ds
      LEFT JOIN daily_clicks dc ON ds.date = dc.date
      ORDER BY ds.date
    `;

    console.log(`📊 Time series: ${timeSeriesData.rows.length} giorni`);
    const daysWithClicks = timeSeriesData.rows.filter(row => row.total_clicks > 0);
    console.log(`📈 Giorni con clicks: ${daysWithClicks.length}`);

    if (daysWithClicks.length > 0) {
      console.log('📅 Formato date migliorato:');
      daysWithClicks.slice(0, 3).forEach(row => {
        console.log(`   Date: ${row.date} (${typeof row.date})`);
        console.log(`   Full datetime: ${row.full_datetime} (${typeof row.full_datetime})`);
      });
    }

    // Test 3: Verifica formato e consistenza
    console.log('\n✅ Verifica formati e consistenza...');
    
    // Verifica che le date siano nel formato corretto
    const dateFormatTest = timeSeriesData.rows[0];
    const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateFormatTest.date);
    console.log(`📅 Formato date YYYY-MM-DD: ${isValidFormat ? '✅' : '❌'}`);

    // Verifica che i dati orari siano nel formato ISO
    if (hoursWithClicks.length > 0) {
      const hourFormatTest = hoursWithClicks[0];
      const isValidHourFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(hourFormatTest.date);
      console.log(`🕐 Formato ore ISO: ${isValidHourFormat ? '✅' : '❌'}`);
    }

    // Test 4: Controllo range temporali corretti
    console.log('\n🔍 Controllo range temporali...');
    
    const today = new Date().toISOString().split('T')[0];
    const hasToday = timeSeriesData.rows.some(row => row.date === today);
    console.log(`📅 Include data odierna (${today}): ${hasToday ? '✅' : '❌'}`);

    const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const hasStartDate = timeSeriesData.rows.some(row => row.date === thirtyDaysAgo);
    console.log(`📅 Include data di 30 giorni fa (${thirtyDaysAgo}): ${hasStartDate ? '✅' : '❌'}`);

    console.log('\n🎉 Test delle funzioni temporali aggiornate completato!');

  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

// Esegui il test
if (require.main === module) {
  testUpdatedTemporalFunctions();
}

module.exports = { testUpdatedTemporalFunctions };
