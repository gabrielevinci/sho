#!/usr/bin/env node

/**
 * Script per correggere i conteggi unique_click_count esistenti
 * basandosi sulla logica corretta del device_fingerprint
 */

const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function fixUniqueClickCounts() {
  console.log('🔧 CORREZIONE UNIQUE CLICK COUNTS\n');

  try {
    // 1. Analisi stato attuale
    console.log('📊 Analisi stato attuale...\n');
    
    const currentState = await sql`
      SELECT 
        l.id,
        l.short_code,
        l.click_count,
        l.unique_click_count as current_unique_count,
        COUNT(DISTINCT ef.device_fingerprint) as correct_unique_count,
        COUNT(DISTINCT ef.browser_fingerprint) as browser_count,
        COUNT(ef.id) as enhanced_clicks,
        (l.unique_click_count - COUNT(DISTINCT ef.device_fingerprint)) as difference
      FROM links l
      LEFT JOIN enhanced_fingerprints ef ON l.id = ef.link_id
      WHERE ef.id IS NOT NULL
      GROUP BY l.id, l.short_code, l.click_count, l.unique_click_count
      ORDER BY l.id
    `;

    console.log('Link che necessitano correzione:');
    const linksToFix = [];
    
    currentState.rows.forEach((link, index) => {
      const needsFix = link.difference !== 0;
      const status = needsFix ? '🔧' : '✅';
      
      console.log(`${status} ${link.short_code}:`);
      console.log(`    ├─ Attuale unique_click_count: ${link.current_unique_count}`);
      console.log(`    ├─ Dovrebbe essere: ${link.correct_unique_count}`);
      console.log(`    ├─ Browser unici: ${link.browser_count}`);
      console.log(`    └─ Differenza: ${link.difference}\n`);
      
      if (needsFix) {
        linksToFix.push({
          id: link.id,
          shortCode: link.short_code,
          currentCount: link.current_unique_count,
          correctCount: link.correct_unique_count
        });
      }
    });

    if (linksToFix.length === 0) {
      console.log('✅ Tutti i conteggi sono già corretti!');
      return;
    }

    // 2. Correzione
    console.log(`🔧 Correzione di ${linksToFix.length} link...\n`);
    
    for (const link of linksToFix) {
      console.log(`Correggo ${link.shortCode}...`);
      
      await sql`
        UPDATE links 
        SET unique_click_count = ${link.correctCount}
        WHERE id = ${link.id}
      `;
      
      console.log(`├─ ${link.currentCount} → ${link.correctCount} ✅`);
    }

    // 3. Verifica finale
    console.log('\n📊 Verifica finale...\n');
    
    const finalState = await sql`
      SELECT 
        l.id,
        l.short_code,
        l.click_count,
        l.unique_click_count as updated_unique_count,
        COUNT(DISTINCT ef.device_fingerprint) as correct_unique_count,
        COUNT(DISTINCT ef.browser_fingerprint) as browser_count
      FROM links l
      LEFT JOIN enhanced_fingerprints ef ON l.id = ef.link_id
      WHERE ef.id IS NOT NULL
      GROUP BY l.id, l.short_code, l.click_count, l.unique_click_count
      ORDER BY l.id
    `;

    finalState.rows.forEach((link) => {
      const isCorrect = link.updated_unique_count === link.correct_unique_count;
      const status = isCorrect ? '✅' : '❌';
      
      console.log(`${status} ${link.short_code}:`);
      console.log(`    ├─ Click totali: ${link.click_count}`);
      console.log(`    ├─ Unique visitors: ${link.updated_unique_count}`);
      console.log(`    └─ Browser unici: ${link.browser_count}\n`);
    });

    console.log('🎉 CORREZIONE COMPLETATA!\n');
    console.log('📝 Riepilogo:');
    console.log(`├─ Link corretti: ${linksToFix.length}`);
    console.log(`├─ Sistema aggiornato alla logica device_fingerprint`);
    console.log(`└─ I prossimi click useranno automaticamente la logica corretta\n`);

    console.log('🧪 PROSSIMO STEP - TEST REALE:');
    console.log('1. Vai su uno dei tuoi link shortati');
    console.log('2. Aprilo da un browser diverso (stesso dispositivo)');
    console.log('3. Verifica che:');
    console.log('   - click_count aumenti di 1');
    console.log('   - unique_click_count rimanga invariato');
    console.log('   - Il sistema riconosca che è lo stesso dispositivo\n');

  } catch (error) {
    console.error('❌ Errore durante la correzione:', error);
  }
}

// Esegui la correzione
fixUniqueClickCounts();
