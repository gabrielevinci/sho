#!/usr/bin/env node

/**
 * Script per testare le query SQL corrette per le statistiche
 */

const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function testAnalyticsQueries() {
  console.log('🔧 TEST QUERY ANALYTICS CORRETTE\n');

  try {
    const shortCode = 'W0oPLT1';
    const userId = '6c4b3ec8-7e5d-4a2b-89be-4c3cb04e9dfe'; // Sostituire con un vero userId
    const workspaceId = '1'; // Sostituire con un vero workspaceId

    // Test 1: Query base corretta (come nella pagina)
    console.log('📊 Test 1: Query base delle statistiche');
    const baseStats = await sql`
      WITH link_data AS (
        SELECT id, click_count, unique_click_count FROM links 
        WHERE short_code = ${shortCode}
      ),
      click_stats AS (
        SELECT 
          (SELECT click_count FROM link_data) as total_clicks,
          (SELECT unique_click_count FROM link_data) as unique_clicks,
          COUNT(DISTINCT ef.country) as unique_countries,
          COUNT(DISTINCT ef.device_category) as unique_devices,
          COUNT(CASE WHEN ef.created_at::date = CURRENT_DATE THEN 1 END) as clicks_today,
          COUNT(CASE WHEN ef.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as clicks_this_week
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
      )
      SELECT * FROM click_stats
    `;

    if (baseStats.rows.length > 0) {
      const stats = baseStats.rows[0];
      console.log('   ✅ RISULTATI:');
      console.log(`     📊 Total clicks (da tabella links): ${stats.total_clicks}`);
      console.log(`     👤 Unique clicks (da tabella links): ${stats.unique_clicks}`);
      console.log(`     🌍 Paesi unici: ${stats.unique_countries}`);
      console.log(`     📱 Device unici: ${stats.unique_devices}`);
      console.log(`     📅 Click oggi: ${stats.clicks_today}`);
      console.log(`     📅 Click questa settimana: ${stats.clicks_this_week}`);
    } else {
      console.log('   ❌ Nessun risultato');
    }

    // Test 2: Confronto con i vecchi calcoli
    console.log('\n🔍 Test 2: Confronto con calcoli precedenti');
    const oldStats = await sql`
      WITH link_data AS (
        SELECT id FROM links 
        WHERE short_code = ${shortCode}
      )
      SELECT 
        COUNT(ef.id) as old_total_clicks,
        COUNT(DISTINCT ef.device_fingerprint) as old_unique_clicks
      FROM enhanced_fingerprints ef
      WHERE ef.link_id IN (SELECT id FROM link_data)
    `;

    if (oldStats.rows.length > 0) {
      const old = oldStats.rows[0];
      const current = baseStats.rows[0];
      console.log('   📊 CONFRONTO:');
      console.log(`     Vecchio metodo - Total: ${old.old_total_clicks}, Unique: ${old.old_unique_clicks}`);
      console.log(`     Nuovo metodo - Total: ${current.total_clicks}, Unique: ${current.unique_clicks}`);
      
      if (current.total_clicks >= old.old_total_clicks) {
        console.log('   ✅ I nuovi contatori sono >= ai vecchi (normale)');
      } else {
        console.log('   ⚠️  I nuovi contatori sono < ai vecchi (anomalo)');
      }
    }

    // Test 3: Verifica coerenza tabella links
    console.log('\n🔍 Test 3: Verifica coerenza tabella links');
    const linkData = await sql`
      SELECT 
        short_code,
        click_count,
        unique_click_count,
        created_at
      FROM links 
      WHERE short_code = ${shortCode}
    `;

    if (linkData.rows.length > 0) {
      const link = linkData.rows[0];
      console.log('   📋 DATI LINK:');
      console.log(`     Short code: ${link.short_code}`);
      console.log(`     Click count: ${link.click_count}`);
      console.log(`     Unique click count: ${link.unique_click_count}`);
      console.log(`     Creato: ${new Date(link.created_at).toLocaleString('it-IT')}`);
    }

  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

// Esegui lo script
testAnalyticsQueries()
  .then(() => {
    console.log('\n🎉 Test completato!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Errore fatale:', error);
    process.exit(1);
  });
