#!/usr/bin/env node

/**
 * Script per mostrare i link pronti per il test finale
 */

const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function showTestLinks() {
  console.log('🎯 LINK PRONTI PER IL TEST FINALE\n');

  try {
    const testLinks = await sql`
      SELECT 
        l.short_code,
        l.original_url,
        l.click_count,
        l.unique_click_count,
        COUNT(DISTINCT ef.device_fingerprint) as device_count,
        COUNT(DISTINCT ef.browser_fingerprint) as browser_count,
        string_agg(DISTINCT ef.browser_type, ', ') as browsers_used
      FROM links l
      LEFT JOIN enhanced_fingerprints ef ON l.id = ef.link_id
      GROUP BY l.id, l.short_code, l.original_url, l.click_count, l.unique_click_count
      ORDER BY browser_count DESC, l.created_at DESC
    `;

    console.log('📋 Tutti i link disponibili per il test:\n');
    
    testLinks.rows.forEach((link, index) => {
      const hasData = link.browser_count > 0;
      const status = hasData ? '🔗' : '⚪';
      
      console.log(`${status} ${index + 1}. ${link.short_code}`);
      console.log(`     ├─ URL originale: ${link.original_url}`);
      console.log(`     ├─ Click totali: ${link.click_count}`);
      console.log(`     ├─ Unique visitors: ${link.unique_click_count}`);
      if (hasData) {
        console.log(`     ├─ Device unici: ${link.device_count}`);
        console.log(`     ├─ Browser unici: ${link.browser_count}`);
        console.log(`     └─ Browser usati: ${link.browsers_used || 'N/A'}`);
      } else {
        console.log(`     └─ ⚪ Nessun dato enhanced (non ancora visitato)`);
      }
      console.log('');
    });

    // Trova il miglior link per il test
    const bestLink = testLinks.rows.find(link => link.browser_count > 1) || testLinks.rows[0];
    
    if (bestLink) {
      console.log('🎯 LINK RACCOMANDATO PER IL TEST:\n');
      console.log(`🔗 Link: http://localhost:3000/${bestLink.short_code}`);
      console.log(`📊 Stato attuale:`);
      console.log(`   ├─ Click totali: ${bestLink.click_count}`);
      console.log(`   ├─ Unique visitors: ${bestLink.unique_click_count}`);
      console.log(`   ├─ Device unici: ${bestLink.device_count || 0}`);
      console.log(`   └─ Browser unici: ${bestLink.browser_count || 0}`);
      
      console.log('\n📋 ISTRUZIONI TEST:');
      console.log('1. Copia questo link: http://localhost:3000/' + bestLink.short_code);
      console.log('2. Aprilo in un browser (es. Chrome)');
      console.log('3. Aprilo in un browser DIVERSO (es. Firefox, Edge)');
      console.log('4. Torna nel dashboard e controlla le statistiche');
      console.log('5. Verifica che:');
      console.log('   - click_count aumenti di 2 (uno per browser)');
      console.log('   - unique_click_count aumenti di 1 SOLO (stesso dispositivo)');
      console.log('   - Il sistema riconosca che è lo stesso utente fisico\n');
      
      console.log('🔧 PER VERIFICARE I RISULTATI:');
      console.log('   Vai su: http://localhost:3000/dashboard');
      console.log('   Oppure esegui: node test-final.js\n');
    }

    console.log('✅ Il sistema è ora completamente configurato per la correlazione basata su device_fingerprint!');

  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

showTestLinks();
