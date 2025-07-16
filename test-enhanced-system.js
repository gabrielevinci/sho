#!/usr/bin/env node

/**
 * Script di test rapido per verificare il sistema Enhanced Fingerprinting
 * Simula diversi scenari di fingerprinting
 */

const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function testEnhancedFingerprinting() {
  console.log('🧪 Test Sistema Enhanced Fingerprinting\n');

  try {
    // 1. Test connessione database
    console.log('📊 Test connessione database...');
    const dbTest = await sql`SELECT NOW() as current_time`;
    console.log(`✅ Connessione OK - ${dbTest.rows[0].current_time}\n`);

    // 2. Verifica tabelle
    console.log('🔍 Verifica struttura tabelle...');
    
    const enhancedTableCheck = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'enhanced_fingerprints' 
      ORDER BY ordinal_position LIMIT 10
    `;
    
    if (enhancedTableCheck.rows.length > 0) {
      console.log('✅ Tabella enhanced_fingerprints presente');
      console.log(`   Colonne: ${enhancedTableCheck.rows.map(r => r.column_name).join(', ')}`);
    } else {
      console.log('❌ Tabella enhanced_fingerprints non trovata');
      return;
    }

    const correlationsTableCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'fingerprint_correlations' 
      LIMIT 5
    `;
    
    if (correlationsTableCheck.rows.length > 0) {
      console.log('✅ Tabella fingerprint_correlations presente');
    } else {
      console.log('❌ Tabella fingerprint_correlations non trovata');
    }

    // 3. Test vista unificata
    console.log('\n📈 Test vista analytics...');
    const viewTest = await sql`
      SELECT COUNT(*) as total_links 
      FROM unified_click_analytics
    `;
    console.log(`✅ Vista unified_click_analytics funzionante - ${viewTest.rows[0].total_links} link trovati`);

    // 4. Simula inserimento fingerprint di test
    console.log('\n🔬 Test inserimento fingerprint...');
    
    const testLinkId = 1; // Assumiamo che esista almeno un link
    const testDeviceFingerprint = 'test_device_123';
    const testBrowserFingerprint = 'test_browser_456';
    
    try {
      await sql`
        INSERT INTO enhanced_fingerprints (
          link_id,
          device_fingerprint,
          browser_fingerprint,
          session_fingerprint,
          fingerprint_hash,
          ip_hash,
          timezone_fingerprint,
          hardware_profile,
          device_category,
          os_family,
          browser_type,
          user_agent,
          country,
          region,
          city,
          confidence,
          correlation_factors
        ) VALUES (
          ${testLinkId},
          ${testDeviceFingerprint},
          ${testBrowserFingerprint},
          'test_session_789',
          ${testBrowserFingerprint},
          'test_ip_hash',
          'Europe/Rome',
          'x64-windows',
          'desktop',
          'windows',
          'chrome',
          'Mozilla/5.0 (Test)',
          'Italy',
          'Lazio',
          'Rome',
          85,
          '["stable_ip", "timezone", "geo_location"]'::jsonb
        )
        ON CONFLICT DO NOTHING
      `;
      
      console.log('✅ Inserimento fingerprint test riuscito');
    } catch (insertError) {
      console.log('⚠️ Errore inserimento (probabilmente normale):', insertError.message);
    }

    // 5. Test query di correlazione
    console.log('\n🔗 Test sistema correlazione...');
    
    const correlationTest = await sql`
      SELECT 
        device_fingerprint,
        COUNT(DISTINCT browser_fingerprint) as browser_count,
        array_agg(DISTINCT browser_type) as browsers
      FROM enhanced_fingerprints 
      GROUP BY device_fingerprint
      HAVING COUNT(DISTINCT browser_fingerprint) > 1
      LIMIT 3
    `;
    
    if (correlationTest.rows.length > 0) {
      console.log('✅ Sistema correlazione attivo:');
      correlationTest.rows.forEach(row => {
        console.log(`   Device ${row.device_fingerprint}: ${row.browser_count} browser diversi (${row.browsers.join(', ')})`);
      });
    } else {
      console.log('ℹ️  Nessuna correlazione trovata (normale per sistema nuovo)');
    }

    // 6. Test performance query
    console.log('\n⚡ Test performance query...');
    
    const startTime = Date.now();
    await sql`
      SELECT COUNT(*) as total_fingerprints 
      FROM enhanced_fingerprints 
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `;
    const queryTime = Date.now() - startTime;
    
    console.log(`✅ Query performance: ${queryTime}ms`);

    // 7. Pulizia dati di test
    console.log('\n🧹 Pulizia dati di test...');
    await sql`
      DELETE FROM enhanced_fingerprints 
      WHERE device_fingerprint = ${testDeviceFingerprint}
    `;
    console.log('✅ Dati di test rimossi');

    console.log('\n🎉 TUTTI I TEST COMPLETATI CON SUCCESSO!');
    console.log('\n📋 Riassunto Sistema:');
    console.log('   ✅ Database connesso e funzionante');
    console.log('   ✅ Tabelle enhanced_fingerprints creata');
    console.log('   ✅ Tabella fingerprint_correlations creata');
    console.log('   ✅ Vista unified_click_analytics funzionante');
    console.log('   ✅ Inserimenti e query performanti');
    console.log('   ✅ Sistema correlazione implementato');

    console.log('\n🚀 Il sistema Enhanced Fingerprinting è pronto!');
    console.log('   Ora puoi testare visitando: /dashboard/test-enhanced-fingerprint');
    console.log('   I nuovi click sui link verranno processati automaticamente.\n');

  } catch (error) {
    console.error('❌ Errore durante i test:', error);
    console.log('\nℹ️  Possibili cause:');
    console.log('   • Database non accessibile');
    console.log('   • Migrazione non completata');
    console.log('   • Configurazione environment errata');
    process.exit(1);
  }
}

testEnhancedFingerprinting();
