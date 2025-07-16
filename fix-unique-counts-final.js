#!/usr/bin/env node

/**
 * Script per correggere definitivamente i contatori unique_click_count
 * Questo script assegna 1 unique visitor per ogni device_fingerprint unico per link
 */

const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function fixUniqueCountsFinal() {
  console.log('🔧 CORREZIONE FINALE CONTATORI UNIQUE_CLICK_COUNT\n');

  try {
    // Prima mostra la situazione attuale
    console.log('📊 Situazione attuale:');
    const currentSituation = await sql`
      SELECT 
        COUNT(*) as total_links,
        COUNT(*) FILTER (WHERE unique_click_count = 0) as links_with_zero_unique,
        COUNT(*) FILTER (WHERE unique_click_count > 0) as links_with_unique,
        SUM(click_count) as total_clicks,
        SUM(unique_click_count) as total_unique_clicks
      FROM links
      WHERE click_count > 0
    `;
    
    const current = currentSituation.rows[0];
    console.log(`   📋 Link totali con click: ${current.total_links}`);
    console.log(`   ❌ Link con 0 unique: ${current.links_with_zero_unique}`);
    console.log(`   ✅ Link con unique > 0: ${current.links_with_unique}`);
    console.log(`   📊 Click totali: ${current.total_clicks}`);
    console.log(`   👤 Unique totali attuali: ${current.total_unique_clicks}`);

    // Prendi tutti i link che hanno click
    const linksToFix = await sql`
      SELECT l.id, l.short_code, l.click_count, l.unique_click_count
      FROM links l
      WHERE l.click_count > 0
      ORDER BY l.id
    `;

    console.log(`\n🔄 Analizzando ${linksToFix.rows.length} link...`);

    let linksFixed = 0;
    
    for (const link of linksToFix.rows) {
      // Conta device fingerprint unici per questo link
      const uniqueDevicesResult = await sql`
        SELECT COUNT(DISTINCT device_fingerprint) as unique_devices
        FROM enhanced_fingerprints 
        WHERE link_id = ${link.id}
      `;
      
      const uniqueDevices = uniqueDevicesResult.rows[0]?.unique_devices || 0;
      
      // Se il numero di unique_click_count non corrisponde ai device unici, correggi
      if (link.unique_click_count !== uniqueDevices && uniqueDevices > 0) {
        await sql`
          UPDATE links 
          SET unique_click_count = ${uniqueDevices}
          WHERE id = ${link.id}
        `;
        
        console.log(`   🔧 ${link.short_code}: ${link.unique_click_count} → ${uniqueDevices} unique`);
        linksFixed++;
      }
    }
    
    console.log(`\n✅ Correzione completata: ${linksFixed} link sistemati`);
    
    // Mostra la situazione finale
    console.log('\n📊 Situazione finale:');
    const finalSituation = await sql`
      SELECT 
        COUNT(*) as total_links,
        COUNT(*) FILTER (WHERE unique_click_count = 0) as links_with_zero_unique,
        COUNT(*) FILTER (WHERE unique_click_count > 0) as links_with_unique,
        SUM(click_count) as total_clicks,
        SUM(unique_click_count) as total_unique_clicks
      FROM links
      WHERE click_count > 0
    `;
    
    const final = finalSituation.rows[0];
    console.log(`   📋 Link totali con click: ${final.total_links}`);
    console.log(`   ❌ Link con 0 unique: ${final.links_with_zero_unique}`);
    console.log(`   ✅ Link con unique > 0: ${final.links_with_unique}`);
    console.log(`   📊 Click totali: ${final.total_clicks}`);
    console.log(`   👤 Unique totali finali: ${final.total_unique_clicks}`);
    
  } catch (error) {
    console.error('❌ Errore durante la correzione:', error);
  }
}

// Esegui lo script
fixUniqueCountsFinal()
  .then(() => {
    console.log('\n🎉 Correzione terminata con successo!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Errore fatale:', error);
    process.exit(1);
  });
