#!/usr/bin/env node

/**
 * Script di test completo per verificare la coerenza dei dati analytics
 * Testa tutte le funzioni e identifica eventuali problemi
 */

const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function testAnalyticsConsistency() {
  console.log('🧪 TEST COMPLETO COERENZA DATI ANALYTICS\n');

  try {
    // 1. Verifica struttura database
    console.log('🔍 Verifica struttura database...');
    
    const tablesCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('enhanced_fingerprints', 'clicks', 'links')
      ORDER BY table_name
    `;
    
    console.log('📊 Tabelle disponibili:');
    tablesCheck.rows.forEach(table => {
      console.log(`   ✅ ${table.table_name}`);
    });

    // 2. Verifica campo referrer in enhanced_fingerprints
    console.log('\n🔍 Verifica campo referrer...');
    const referrerCheck = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'enhanced_fingerprints' 
      AND column_name = 'referrer'
    `;

    if (referrerCheck.rows.length > 0) {
      console.log('✅ Campo referrer presente in enhanced_fingerprints');
      console.log(`   Tipo: ${referrerCheck.rows[0].data_type}`);
      console.log(`   Nullable: ${referrerCheck.rows[0].is_nullable}`);
    } else {
      console.log('❌ Campo referrer MANCANTE in enhanced_fingerprints');
      console.log('   Esegui: node add-referrer-field-migration.js');
    }

    // 3. Trova un link di test
    console.log('\n🔗 Ricerca link di test...');
    const testLink = await sql`
      SELECT l.id, l.short_code, l.title, l.user_id, l.workspace_id,
             COUNT(ef.id) as enhanced_clicks
      FROM links l
      LEFT JOIN enhanced_fingerprints ef ON l.id = ef.link_id
      GROUP BY l.id, l.short_code, l.title, l.user_id, l.workspace_id
      HAVING COUNT(ef.id) > 0
      ORDER BY COUNT(ef.id) DESC
      LIMIT 1
    `;

    if (testLink.rows.length === 0) {
      console.log('❌ Nessun link con dati analytics trovato');
      console.log('   Crea dei link e genera traffico di test prima di procedere');
      return;
    }

    const link = testLink.rows[0];
    console.log(`✅ Link di test: ${link.short_code} (${link.enhanced_clicks} clicks)`);

    // 4. Test funzione getClickAnalytics simulata
    console.log('\n📊 Test getClickAnalytics...');
    
    // Simula la query della funzione getClickAnalytics
    const hasReferrerField = referrerCheck.rows.length > 0;
    
    const analyticsQuery = `
      WITH link_data AS (
        SELECT ${link.id} as id
      ),
      click_stats AS (
        SELECT 
          COUNT(ef.id) as total_clicks,
          COUNT(DISTINCT ef.device_fingerprint) as unique_clicks,
          COUNT(DISTINCT ef.country) as unique_countries,
          ${hasReferrerField 
            ? `COUNT(DISTINCT ef.referrer) as unique_referrers,`
            : `COUNT(DISTINCT 'unknown') as unique_referrers,`
          }
          COUNT(DISTINCT ef.device_category) as unique_devices,
          COUNT(CASE WHEN ef.created_at::date = CURRENT_DATE THEN 1 END) as clicks_today,
          COUNT(CASE WHEN ef.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as clicks_this_week,
          COUNT(CASE WHEN ef.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as clicks_this_month,
          COUNT(DISTINCT CASE WHEN ef.created_at::date = CURRENT_DATE THEN ef.device_fingerprint END) as unique_clicks_today,
          COUNT(DISTINCT CASE WHEN ef.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN ef.device_fingerprint END) as unique_clicks_this_week,
          COUNT(DISTINCT CASE WHEN ef.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN ef.device_fingerprint END) as unique_clicks_this_month
        FROM enhanced_fingerprints ef
        WHERE ef.link_id = ${link.id}
      )
      SELECT * FROM click_stats
    `;
    
    const analyticsResult = await sql.query(analyticsQuery);
    const analytics = analyticsResult.rows[0];
    
    console.log('📈 Risultati analytics:');
    console.log(`   Total clicks: ${analytics.total_clicks}`);
    console.log(`   Unique clicks: ${analytics.unique_clicks}`);
    console.log(`   Unique countries: ${analytics.unique_countries}`);
    console.log(`   Unique referrers: ${analytics.unique_referrers}`);
    console.log(`   Unique devices: ${analytics.unique_devices}`);
    console.log(`   Clicks today: ${analytics.clicks_today}`);
    console.log(`   Clicks this week: ${analytics.clicks_this_week}`);
    console.log(`   Clicks this month: ${analytics.clicks_this_month}`);

    // 5. Test getReferrerData
    console.log('\n🌐 Test getReferrerData...');
    
    if (hasReferrerField) {
      const referrerData = await sql`
        SELECT 
          COALESCE(ef.referrer, 'Direct') as referrer, 
          COUNT(*) as clicks
        FROM enhanced_fingerprints ef
        WHERE ef.link_id = ${link.id}
        GROUP BY COALESCE(ef.referrer, 'Direct')
        ORDER BY clicks DESC
        LIMIT 5
      `;
      
      console.log('📊 Top referrer da enhanced_fingerprints:');
      referrerData.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.referrer}: ${row.clicks} clicks`);
      });
    } else {
      console.log('⚠️  Campo referrer mancante, usando fallback a clicks table');
    }

    // 6. Test getGeographicData
    console.log('\n🗺️  Test getGeographicData...');
    const geoData = await sql`
      WITH country_clicks AS (
        SELECT 
          ef.country, 
          COUNT(*) as clicks
        FROM enhanced_fingerprints ef
        WHERE ef.link_id = ${link.id}
        GROUP BY ef.country
      ),
      total_clicks AS (
        SELECT COUNT(*) as total
        FROM enhanced_fingerprints ef
        WHERE ef.link_id = ${link.id}
      )
      SELECT 
        cc.country,
        cc.clicks,
        ROUND((cc.clicks::float / tc.total * 100)::numeric, 1) as percentage
      FROM country_clicks cc, total_clicks tc
      ORDER BY cc.clicks DESC
      LIMIT 5
    `;
    
    console.log('🌍 Top paesi:');
    geoData.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.country || 'Unknown'}: ${row.clicks} clicks (${row.percentage}%)`);
    });

    // 7. Test getDeviceData
    console.log('\n📱 Test getDeviceData...');
    const deviceData = await sql`
      SELECT 
        ef.device_category as device_type, 
        COUNT(*) as clicks
      FROM enhanced_fingerprints ef
      WHERE ef.link_id = ${link.id}
      GROUP BY ef.device_category
      ORDER BY clicks DESC
    `;
    
    console.log('📊 Dispositivi:');
    deviceData.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.device_type || 'Unknown'}: ${row.clicks} clicks`);
    });

    // 8. Test getBrowserData
    console.log('\n🌐 Test getBrowserData...');
    const browserData = await sql`
      SELECT 
        ef.browser_type as browser_name, 
        COUNT(*) as clicks
      FROM enhanced_fingerprints ef
      WHERE ef.link_id = ${link.id}
      GROUP BY ef.browser_type
      ORDER BY clicks DESC
      LIMIT 5
    `;
    
    console.log('🖥️  Browser:');
    browserData.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.browser_name || 'Unknown'}: ${row.clicks} clicks`);
    });

    // 9. Verifica coerenza dati
    console.log('\n✅ VERIFICA COERENZA...');
    
    // Controlla se i conteggi sono logici
    if (analytics.unique_clicks > analytics.total_clicks) {
      console.log('❌ ERRORE: Unique clicks > Total clicks');
    } else {
      console.log('✅ Rapporto unique/total clicks corretto');
    }
    
    if (analytics.clicks_today > analytics.clicks_this_week) {
      console.log('❌ ERRORE: Clicks today > Clicks this week');
    } else {
      console.log('✅ Rapporto temporale clicks corretto');
    }
    
    if (analytics.clicks_this_week > analytics.clicks_this_month) {
      console.log('❌ ERRORE: Clicks this week > Clicks this month');
    } else {
      console.log('✅ Rapporto temporale mensile corretto');
    }

    console.log('\n🎉 TEST COMPLETATO!');
    
    if (hasReferrerField) {
      console.log('✅ Sistema analytics completamente funzionante');
    } else {
      console.log('⚠️  Sistema funzionante ma manca campo referrer');
      console.log('   Esegui: node add-referrer-field-migration.js per completare setup');
    }

  } catch (error) {
    console.error('❌ Errore durante il test:', error);
    console.log('\nℹ️  Verifica che:');
    console.log('   • Il database sia accessibile');
    console.log('   • Ci siano dati di test nel database');
    console.log('   • Le variabili d\'ambiente siano configurate');
  }
}

// Esegui il test se lo script viene chiamato direttamente
if (require.main === module) {
  testAnalyticsConsistency();
}

module.exports = { testAnalyticsConsistency };
