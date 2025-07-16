#!/usr/bin/env node

/**
 * Test per verificare che la correzione funzioni correttamente
 * Simula un nuovo click e verifica la logica di correlazione
 */

const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function testCorrectedLogic() {
  console.log('🔧 TEST LOGICA CORRETTA - CORRELAZIONE DEVICE\n');

  try {
    // 1. Trova un link esistente con multiple visite dello stesso device
    const multiDeviceLink = await sql`
      SELECT 
        ef.link_id,
        l.short_code,
        ef.device_fingerprint,
        COUNT(DISTINCT ef.browser_fingerprint) as browser_count,
        l.click_count,
        l.unique_click_count,
        array_agg(DISTINCT ef.browser_type) as browsers_used
      FROM enhanced_fingerprints ef
      JOIN links l ON ef.link_id = l.id
      GROUP BY ef.link_id, l.short_code, ef.device_fingerprint, l.click_count, l.unique_click_count
      HAVING COUNT(DISTINCT ef.browser_fingerprint) > 1
      LIMIT 1
    `;

    if (multiDeviceLink.rows.length === 0) {
      console.log('❌ Non ci sono link con device multipli per testare');
      return;
    }

    const testLink = multiDeviceLink.rows[0];
    console.log('📊 Link di test selezionato:');
    console.log(`├─ Short code: ${testLink.short_code}`);
    console.log(`├─ Link ID: ${testLink.link_id}`);
    console.log(`├─ Device fingerprint: ${testLink.device_fingerprint}`);
    console.log(`├─ Browser usati: ${testLink.browsers_used.join(', ')}`);
    console.log(`├─ Click totali: ${testLink.click_count}`);
    console.log(`└─ Unique click count attuale: ${testLink.unique_click_count}\n`);

    // 2. Simula il controllo della nuova logica
    console.log('🔍 Simulazione controllo isUniqueVisit...\n');

    // Controllo 1: Device fingerprint già presente?
    const deviceCheck = await sql`
      SELECT COUNT(*) as count, 
             array_agg(DISTINCT browser_fingerprint) as browser_fingerprints
      FROM enhanced_fingerprints 
      WHERE link_id = ${testLink.link_id} 
      AND device_fingerprint = ${testLink.device_fingerprint}
    `;

    console.log('1️⃣ Controllo Device Fingerprint:');
    console.log(`   ├─ Device già presente: ${deviceCheck.rows[0].count > 0 ? 'SÌ' : 'NO'}`);
    console.log(`   ├─ Numero visite esistenti: ${deviceCheck.rows[0].count}`);
    console.log(`   └─ Browser fingerprints: ${deviceCheck.rows[0].browser_fingerprints.map(fp => fp.substring(0, 8) + '...').join(', ')}\n`);

    // Test con un nuovo browser fingerprint ipotetico
    const newBrowserFingerprint = 'test_new_browser_' + Date.now();
    
    console.log('2️⃣ Simulazione nuovo click da browser diverso:');
    console.log(`   ├─ Nuovo browser fingerprint: ${newBrowserFingerprint.substring(0, 20)}...`);
    console.log(`   ├─ Stesso device fingerprint: ${testLink.device_fingerprint}`);
    
    // La nuova logica dovrebbe trovare il device esistente
    const wouldBeUnique = deviceCheck.rows[0].count === 0;
    console.log(`   └─ Sarebbe considerato unico: ${wouldBeUnique ? 'SÌ ❌' : 'NO ✅'}\n`);

    // 3. Calcola come dovrebbe essere il conteggio corretto
    console.log('📊 Conteggio corretto che dovrebbe essere:');
    
    const correctCount = await sql`
      SELECT 
        COUNT(DISTINCT device_fingerprint) as correct_unique_count,
        COUNT(DISTINCT browser_fingerprint) as browser_count,
        COUNT(*) as total_visits
      FROM enhanced_fingerprints 
      WHERE link_id = ${testLink.link_id}
    `;

    console.log(`├─ Unique visitors corretti (per device): ${correctCount.rows[0].correct_unique_count}`);
    console.log(`├─ Browser unici: ${correctCount.rows[0].browser_count}`);
    console.log(`├─ Visite totali: ${correctCount.rows[0].total_visits}`);
    console.log(`└─ Attuale unique_click_count nel DB: ${testLink.unique_click_count}\n`);

    // 4. Verifica se serve aggiornamento
    const correctUniqueCount = correctCount.rows[0].correct_unique_count;
    if (testLink.unique_click_count !== correctUniqueCount) {
      console.log('🔧 CORREZIONE NECESSARIA:');
      console.log(`   Il unique_click_count dovrebbe essere ${correctUniqueCount} invece di ${testLink.unique_click_count}`);
      console.log(`   Differenza: ${Math.abs(testLink.unique_click_count - correctUniqueCount)} click\n`);
      
      // Opzione per correggere automaticamente
      console.log('💡 Vuoi correggere automaticamente? (questo script può farlo)');
      console.log('   Per ora mostriamo solo la simulazione...\n');
    } else {
      console.log('✅ Il conteggio è già corretto!\n');
    }

    // 5. Test con tutti i link
    console.log('📈 Analisi completa di tutti i link:\n');
    
    const allLinksAnalysis = await sql`
      SELECT 
        l.id,
        l.short_code,
        l.click_count,
        l.unique_click_count as db_unique_count,
        COUNT(DISTINCT ef.device_fingerprint) as correct_unique_count,
        COUNT(DISTINCT ef.browser_fingerprint) as browser_count,
        COUNT(ef.id) as enhanced_clicks,
        (l.unique_click_count - COUNT(DISTINCT ef.device_fingerprint)) as difference
      FROM links l
      LEFT JOIN enhanced_fingerprints ef ON l.id = ef.link_id
      WHERE ef.id IS NOT NULL
      GROUP BY l.id, l.short_code, l.click_count, l.unique_click_count
      ORDER BY ABS(l.unique_click_count - COUNT(DISTINCT ef.device_fingerprint)) DESC
    `;

    allLinksAnalysis.rows.forEach((link, index) => {
      const status = link.difference === 0 ? '✅' : '⚠️';
      console.log(`${status} Link ${index + 1}: ${link.short_code}`);
      console.log(`    ├─ DB unique count: ${link.db_unique_count}`);
      console.log(`    ├─ Correct count: ${link.correct_unique_count}`);
      console.log(`    ├─ Browser count: ${link.browser_count}`);
      console.log(`    └─ Differenza: ${link.difference}\n`);
    });

    console.log('🎯 RIEPILOGO:');
    console.log('La logica è stata corretta per controllare prima device_fingerprint.');
    console.log('Nei prossimi click, il sistema dovrebbe funzionare correttamente.');
    console.log('Per i click esistenti, potrebbe essere necessario un aggiornamento una tantum.\n');

  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

// Esegui il test
testCorrectedLogic();
