#!/usr/bin/env node

/**
 * Script di test specifico per i dati temporali dell'andamento
 */

const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function testTemporalData() {
  console.log('📊 TEST DATI TEMPORALI ANDAMENTO\n');

  try {
    // Trova un link di test
    const testLink = await sql`
      SELECT l.id, l.short_code, l.user_id, l.workspace_id,
             COUNT(ef.id) as total_clicks,
             MIN(ef.created_at) as first_click,
             MAX(ef.created_at) as last_click
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
    console.log(`🔗 Link di test: ${link.short_code}`);
    console.log(`📊 Total clicks: ${link.total_clicks}`);
    console.log(`📅 Primo click: ${new Date(link.first_click).toLocaleString('it-IT')}`);
    console.log(`📅 Ultimo click: ${new Date(link.last_click).toLocaleString('it-IT')}`);

    // Test 1: getTimeSeriesData (ultimi 30 giorni)
    console.log('\n📈 Test getTimeSeriesData (ultimi 30 giorni)...');
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
        GROUP BY ef.created_at::date
      )
      SELECT 
        ds.date::text as date,
        COALESCE(dc.total_clicks, 0) as total_clicks,
        COALESCE(dc.unique_clicks, 0) as unique_clicks
      FROM date_series ds
      LEFT JOIN daily_clicks dc ON ds.date = dc.date
      ORDER BY ds.date
    `;

    console.log(`📊 Time series data: ${timeSeriesData.rows.length} giorni`);
    const nonZeroDays = timeSeriesData.rows.filter(row => row.total_clicks > 0);
    console.log(`📈 Giorni con clicks: ${nonZeroDays.length}`);
    
    if (nonZeroDays.length > 0) {
      console.log('📅 Primi 5 giorni con clicks:');
      nonZeroDays.slice(0, 5).forEach(row => {
        console.log(`   ${row.date}: ${row.total_clicks} total, ${row.unique_clicks} unique`);
      });
    }

    // Test 2: getMonthlyData (anno corrente)
    console.log('\n📊 Test getMonthlyData (anno corrente)...');
    const monthlyData = await sql`
      WITH month_series AS (
        SELECT 
          generate_series(1, 12) as month_number,
          EXTRACT(YEAR FROM CURRENT_DATE) as year,
          TO_CHAR(make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, generate_series(1, 12), 1), 'Month') as month
      ),
      monthly_clicks AS (
        SELECT 
          EXTRACT(MONTH FROM ef.created_at)::integer as month_number,
          EXTRACT(YEAR FROM ef.created_at)::integer as year,
          COUNT(ef.id)::integer as total_clicks,
          COUNT(DISTINCT ef.device_fingerprint)::integer as unique_clicks
        FROM enhanced_fingerprints ef
        JOIN links l ON ef.link_id = l.id
        WHERE l.user_id = ${link.user_id} 
          AND l.workspace_id = ${link.workspace_id} 
          AND l.short_code = ${link.short_code}
          AND EXTRACT(YEAR FROM ef.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY EXTRACT(MONTH FROM ef.created_at), EXTRACT(YEAR FROM ef.created_at)
      )
      SELECT 
        TRIM(ms.month) as month,
        ms.month_number::integer,
        ms.year::integer,
        COALESCE(mc.total_clicks, 0) as total_clicks,
        COALESCE(mc.unique_clicks, 0) as unique_clicks
      FROM month_series ms
      LEFT JOIN monthly_clicks mc ON ms.month_number = mc.month_number AND ms.year = mc.year
      ORDER BY ms.month_number
    `;

    console.log(`📊 Monthly data: ${monthlyData.rows.length} mesi`);
    const nonZeroMonths = monthlyData.rows.filter(row => row.total_clicks > 0);
    console.log(`📈 Mesi con clicks: ${nonZeroMonths.length}`);
    
    if (nonZeroMonths.length > 0) {
      console.log('📅 Mesi con clicks:');
      nonZeroMonths.forEach(row => {
        console.log(`   ${row.month} ${row.year}: ${row.total_clicks} total, ${row.unique_clicks} unique`);
      });
    }

    // Test 3: getWeeklyData (anno corrente)
    console.log('\n📊 Test getWeeklyData (anno corrente)...');
    const weeklyData = await sql`
      WITH week_series AS (
        SELECT 
          generate_series(1, 52) as week,
          EXTRACT(YEAR FROM CURRENT_DATE) as year,
          (DATE_TRUNC('year', CURRENT_DATE) + (generate_series(1, 52) - 1) * INTERVAL '1 week')::date as week_start,
          (DATE_TRUNC('year', CURRENT_DATE) + (generate_series(1, 52) - 1) * INTERVAL '1 week' + INTERVAL '6 days')::date as week_end
      ),
      weekly_clicks AS (
        SELECT 
          DATE_PART('week', ef.created_at)::integer as week,
          EXTRACT(YEAR FROM ef.created_at)::integer as year,
          COUNT(ef.id)::integer as total_clicks,
          COUNT(DISTINCT ef.device_fingerprint)::integer as unique_clicks
        FROM enhanced_fingerprints ef
        JOIN links l ON ef.link_id = l.id
        WHERE l.user_id = ${link.user_id} 
          AND l.workspace_id = ${link.workspace_id} 
          AND l.short_code = ${link.short_code}
          AND EXTRACT(YEAR FROM ef.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY DATE_PART('week', ef.created_at), EXTRACT(YEAR FROM ef.created_at)
      )
      SELECT 
        ws.week::integer,
        ws.year::integer,
        ws.week_start::text,
        ws.week_end::text,
        COALESCE(wc.total_clicks, 0) as total_clicks,
        COALESCE(wc.unique_clicks, 0) as unique_clicks
      FROM week_series ws
      LEFT JOIN weekly_clicks wc ON ws.week = wc.week AND ws.year = wc.year
      WHERE ws.week <= DATE_PART('week', CURRENT_DATE)
      ORDER BY ws.week
    `;

    console.log(`📊 Weekly data: ${weeklyData.rows.length} settimane`);
    const nonZeroWeeks = weeklyData.rows.filter(row => row.total_clicks > 0);
    console.log(`📈 Settimane con clicks: ${nonZeroWeeks.length}`);
    
    if (nonZeroWeeks.length > 0) {
      console.log('📅 Settimane con clicks:');
      nonZeroWeeks.forEach(row => {
        console.log(`   Settimana ${row.week}: ${row.total_clicks} total, ${row.unique_clicks} unique (${row.week_start} - ${row.week_end})`);
      });
    }

    // Test 4: Verifica range temporali dei dati
    console.log('\n🔍 Analisi range temporali...');
    const rangeAnalysis = await sql`
      SELECT 
        MIN(ef.created_at) as min_date,
        MAX(ef.created_at) as max_date,
        COUNT(*) as total_records,
        COUNT(DISTINCT ef.created_at::date) as unique_days,
        DATE_PART('week', CURRENT_DATE) as current_week,
        EXTRACT(YEAR FROM CURRENT_DATE) as current_year,
        EXTRACT(MONTH FROM CURRENT_DATE) as current_month
      FROM enhanced_fingerprints ef
      JOIN links l ON ef.link_id = l.id
      WHERE l.user_id = ${link.user_id} 
        AND l.workspace_id = ${link.workspace_id} 
        AND l.short_code = ${link.short_code}
    `;

    const range = rangeAnalysis.rows[0];
    console.log(`📅 Range dati: ${new Date(range.min_date).toLocaleDateString('it-IT')} - ${new Date(range.max_date).toLocaleDateString('it-IT')}`);
    console.log(`📊 Record totali: ${range.total_records}`);
    console.log(`📅 Giorni unici: ${range.unique_days}`);
    console.log(`📅 Settimana corrente: ${range.current_week} del ${range.current_year}`);
    console.log(`📅 Mese corrente: ${range.current_month}`);

    // Test 5: Verifica problemi specifici
    console.log('\n🔧 Diagnosi problemi...');
    
    // Controlla se i dati sono troppo vecchi
    const daysDiff = Math.floor((new Date() - new Date(range.max_date)) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) {
      console.log(`⚠️  PROBLEMA: I dati più recenti sono di ${daysDiff} giorni fa`);
      console.log(`   I grafici degli ultimi 30 giorni potrebbero essere vuoti`);
    }

    // Controlla se l'anno dei dati è diverso dall'anno corrente
    const dataYear = new Date(range.max_date).getFullYear();
    const currentYear = new Date().getFullYear();
    if (dataYear !== currentYear) {
      console.log(`⚠️  PROBLEMA: I dati sono dell'anno ${dataYear}, ma stiamo cercando nell'anno ${currentYear}`);
      console.log(`   I grafici mensili e settimanali potrebbero essere vuoti`);
    }

    console.log('\n✅ Test completato!');

  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

// Esegui il test
if (require.main === module) {
  testTemporalData();
}

module.exports = { testTemporalData };
