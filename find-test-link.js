/**
 * Script per trovare link reali nel database per il test
 */

import { sql } from '@vercel/postgres';

async function findTestLink() {
  console.log('🔍 Ricerca link per test...\n');

  try {
    // Trova un link con dati
    const links = await sql`
      SELECT 
        l.user_id,
        l.workspace_id, 
        l.short_code,
        l.click_count,
        l.unique_click_count,
        COUNT(ef.id) as enhanced_records
      FROM links l
      LEFT JOIN enhanced_fingerprints ef ON l.id = ef.link_id  
      WHERE l.click_count > 0
      GROUP BY l.user_id, l.workspace_id, l.short_code, l.click_count, l.unique_click_count
      ORDER BY l.click_count DESC
      LIMIT 5
    `;

    console.log('📊 Link disponibili per il test:');
    links.rows.forEach((link, index) => {
      console.log(`${index + 1}. user_id: ${link.user_id}, workspace_id: ${link.workspace_id}, short_code: ${link.short_code}`);
      console.log(`   Click totali: ${link.click_count}, Click unici: ${link.unique_click_count}`);
      console.log(`   Record enhanced_fingerprints: ${link.enhanced_records}\n`);
    });

    if (links.rows.length > 0) {
      const bestLink = links.rows[0];
      console.log('💡 Consiglio: usa questi parametri per il test:');
      console.log(`   testUserId = '${bestLink.user_id}'`);
      console.log(`   testWorkspaceId = '${bestLink.workspace_id}'`);
      console.log(`   testShortCode = '${bestLink.short_code}'`);
    } else {
      console.log('❌ Nessun link con dati trovato.');
    }

  } catch (error) {
    console.error('❌ Errore nella ricerca:', error);
  }
}

// Esegui la ricerca
findTestLink().then(() => {
  console.log('✅ Ricerca completata');
}).catch(console.error);
