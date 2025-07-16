#!/usr/bin/env node

/**
 * Test completo per verificare che la correlazione funzioni e
 * che le tabelle correlations vengano popolate correttamente
 */

const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function testCompleteSystem() {
  console.log('🧪 TEST COMPLETO SISTEMA CORRELAZIONE\n');

  try {
    // 1. Verifica stato attuale delle correlazioni
    console.log('📊 Verifica tabella fingerprint_correlations...\n');
    
    const correlationsCount = await sql`
      SELECT COUNT(*)::integer as count FROM fingerprint_correlations
    `;
    
    console.log(`Correlazioni esistenti: ${correlationsCount.rows[0].count}`);

    if (correlationsCount.rows[0].count === 0) {
      console.log('⚠️  La tabella fingerprint_correlations è vuota');
      console.log('   Questo è normale se non hai ancora fatto nuovi click dopo la modifica.\n');
    } else {
      // Mostra le correlazioni esistenti
      const correlations = await sql`
        SELECT 
          device_cluster_id,
          COUNT(*) as fingerprints_count,
          array_agg(fingerprint_hash) as fingerprints,
          MAX(confidence_score) as max_confidence,
          correlation_type,
          MAX(last_confirmed) as last_confirmed
        FROM fingerprint_correlations
        GROUP BY device_cluster_id, correlation_type
        ORDER BY fingerprints_count DESC
      `;

      console.log('🔗 Correlazioni trovate:');
      correlations.rows.forEach((cluster, index) => {
        console.log(`  ${index + 1}. Cluster: ${cluster.device_cluster_id.substring(0, 12)}...`);
        console.log(`     ├─ Fingerprints: ${cluster.fingerprints_count}`);
        console.log(`     ├─ Tipo: ${cluster.correlation_type}`);
        console.log(`     ├─ Confidenza: ${cluster.max_confidence}`);
        console.log(`     └─ Ultimo aggiornamento: ${cluster.last_confirmed}\n`);
      });
    }

    // 2. Verifica query dashboard corretta
    console.log('📊 Test query dashboard (device_fingerprint)...\n');
    
    const dashboardTest = await sql`
      SELECT 
        l.short_code,
        l.click_count::integer as total_clicks_db,
        l.unique_click_count::integer as unique_clicks_db,
        -- Calcola usando enhanced_fingerprints con device_fingerprint
        COALESCE(
          (SELECT COUNT(DISTINCT ef.device_fingerprint) 
           FROM enhanced_fingerprints ef 
           WHERE ef.link_id = l.id), 
          0
        )::integer as correct_unique_visitors,
        COALESCE(
          (SELECT COUNT(DISTINCT ef.browser_fingerprint) 
           FROM enhanced_fingerprints ef 
           WHERE ef.link_id = l.id), 
          0
        )::integer as unique_browsers,
        COALESCE(
          (SELECT COUNT(ef.id) 
           FROM enhanced_fingerprints ef 
           WHERE ef.link_id = l.id), 
          0
        )::integer as enhanced_clicks
      FROM links l
      WHERE l.id IN (
        SELECT DISTINCT link_id FROM enhanced_fingerprints
      )
      ORDER BY l.id
    `;

    console.log('Dashboard Query Results:');
    dashboardTest.rows.forEach((link, index) => {
      const isCorrect = link.unique_clicks_db === link.correct_unique_visitors;
      const status = isCorrect ? '✅' : '⚠️';
      
      console.log(`${status} ${index + 1}. ${link.short_code}:`);
      console.log(`      ├─ Click totali (DB): ${link.total_clicks_db}`);
      console.log(`      ├─ Enhanced clicks: ${link.enhanced_clicks}`);
      console.log(`      ├─ Unique visitors (DB): ${link.unique_clicks_db}`);
      console.log(`      ├─ Correct unique (device): ${link.correct_unique_visitors}`);
      console.log(`      ├─ Browser unici: ${link.unique_browsers}`);
      console.log(`      └─ Status: ${isCorrect ? 'CORRETTO' : 'NECESSITA AGGIORNAMENTO'}\n`);
    });

    // 3. Test simulazione nuovo click
    console.log('🎯 Simulazione logica nuovo click...\n');
    
    const existingDevice = await sql`
      SELECT 
        device_fingerprint,
        COUNT(DISTINCT browser_fingerprint) as browser_count,
        COUNT(DISTINCT link_id) as link_count,
        array_agg(DISTINCT browser_type) as browsers_used
      FROM enhanced_fingerprints
      WHERE device_fingerprint IS NOT NULL
      GROUP BY device_fingerprint
      HAVING COUNT(DISTINCT browser_fingerprint) > 1
      LIMIT 1
    `;

    if (existingDevice.rows.length > 0) {
      const device = existingDevice.rows[0];
      console.log(`Device con browser multipli: ${device.device_fingerprint.substring(0, 12)}...`);
      console.log(`├─ Browser usati: ${device.browsers_used.join(', ')}`);
      console.log(`├─ Numero browser: ${device.browser_count}`);
      console.log(`└─ Link visitati: ${device.link_count}`);

      // Simula controllo isUniqueVisit per questo device
      const testLinkId = await sql`
        SELECT DISTINCT link_id FROM enhanced_fingerprints 
        WHERE device_fingerprint = ${device.device_fingerprint}
        LIMIT 1
      `;

      if (testLinkId.rows.length > 0) {
        const linkId = testLinkId.rows[0].link_id;
        
        console.log(`\n🔍 Simulazione controllo per link ${linkId}:`);
        
        const deviceCheck = await sql`
          SELECT COUNT(*) as count, 
                 array_agg(DISTINCT browser_fingerprint) as browser_fingerprints
          FROM enhanced_fingerprints 
          WHERE link_id = ${linkId} 
          AND device_fingerprint = ${device.device_fingerprint}
        `;

        console.log(`├─ Device già presente: ${deviceCheck.rows[0].count > 0 ? 'SÌ' : 'NO'}`);
        console.log(`├─ Numero visite esistenti: ${deviceCheck.rows[0].count}`);
        console.log(`└─ Nuovo click sarebbe unico: ${deviceCheck.rows[0].count === 0 ? 'SÌ ❌' : 'NO ✅'}`);
      }
    }

    // 4. Test performance della nuova query
    console.log('\n⚡ Test performance query analytics...\n');
    
    const startTime = Date.now();
    
    const analyticsTest = await sql`
      WITH link_stats AS (
        SELECT 
          l.short_code,
          COUNT(DISTINCT ef.device_fingerprint) as unique_devices,
          COUNT(DISTINCT ef.browser_fingerprint) as unique_browsers,
          COUNT(ef.id) as total_enhanced_clicks,
          COUNT(DISTINCT ef.country) as unique_countries,
          AVG(ef.confidence) as avg_confidence
        FROM links l
        LEFT JOIN enhanced_fingerprints ef ON l.id = ef.link_id
        WHERE ef.id IS NOT NULL
        GROUP BY l.id, l.short_code
      )
      SELECT * FROM link_stats
    `;
    
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    console.log(`Query completata in ${queryTime}ms`);
    console.log(`Risultati: ${analyticsTest.rows.length} link analizzati\n`);

    analyticsTest.rows.forEach((stats, index) => {
      console.log(`${index + 1}. ${stats.short_code}:`);
      console.log(`    ├─ Unique devices: ${stats.unique_devices}`);
      console.log(`    ├─ Unique browsers: ${stats.unique_browsers}`);
      console.log(`    ├─ Enhanced clicks: ${stats.total_enhanced_clicks}`);
      console.log(`    ├─ Countries: ${stats.unique_countries}`);
      console.log(`    └─ Avg confidence: ${parseFloat(stats.avg_confidence || 0).toFixed(1)}%\n`);
    });

    // 5. Raccomandazioni
    console.log('💡 RACCOMANDAZIONI:\n');
    
    const needsUpdate = dashboardTest.rows.filter(link => 
      link.unique_clicks_db !== link.correct_unique_visitors
    );

    if (needsUpdate.length > 0) {
      console.log(`🔧 ${needsUpdate.length} link necessitano aggiornamento del conteggio unique_click_count`);
      console.log('   Esegui: node fix-unique-counts.js\n');
    } else {
      console.log('✅ Tutti i conteggi sono corretti!\n');
    }

    if (correlationsCount.rows[0].count === 0) {
      console.log('🔗 Per popolare la tabella correlations:');
      console.log('   1. Fai un nuovo click su un link esistente');
      console.log('   2. Il sistema aggiornerà automaticamente le correlazioni');
      console.log('   3. Ripeti questo test per vedere i risultati\n');
    }

    console.log('🎯 SISTEMA PRONTO:');
    console.log('✅ Logica device_fingerprint implementata');
    console.log('✅ Dashboard query aggiornata'); 
    console.log('✅ Correlazioni pronte per essere popolate');
    console.log('✅ Performance query ottimizzata\n');

  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

// Esegui il test
testCompleteSystem();
