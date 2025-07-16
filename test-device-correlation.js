#!/usr/bin/env node

/**
 * Test per verificare la correlazione corretta dei device fingerprint
 * Questo script testa se i click da browser diversi dello stesso dispositivo
 * vengono correttamente riconosciuti come stesso utente
 */

const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function testDeviceCorrelation() {
  console.log('🔍 TEST CORRELAZIONE DEVICE FINGERPRINT\n');

  try {
    // 1. Verifica i dati esistenti nella tabella enhanced_fingerprints
    console.log('📊 Analisi dati esistenti...\n');
    
    const fingerprintData = await sql`
      SELECT 
        link_id,
        device_fingerprint,
        browser_fingerprint,
        browser_type,
        ip_hash,
        confidence,
        created_at
      FROM enhanced_fingerprints 
      ORDER BY device_fingerprint, created_at
    `;

    console.log('📋 Dati Enhanced Fingerprints:');
    fingerprintData.rows.forEach((row, index) => {
      console.log(`${index + 1}. Device: ${row.device_fingerprint} | Browser: ${row.browser_fingerprint.substring(0, 8)}... | Type: ${row.browser_type} | IP: ${row.ip_hash} | Confidence: ${row.confidence}`);
    });

    // 2. Raggruppa per device_fingerprint per vedere la correlazione
    console.log('\n🔗 Analisi correlazione per device_fingerprint:\n');
    
    const correlationAnalysis = await sql`
      SELECT 
        device_fingerprint,
        link_id,
        COUNT(DISTINCT browser_fingerprint) as different_browsers,
        COUNT(*) as total_visits,
        array_agg(DISTINCT browser_type) as browser_types,
        array_agg(DISTINCT browser_fingerprint) as browser_fingerprints,
        STRING_AGG(DISTINCT browser_type, ', ') as browsers_used
      FROM enhanced_fingerprints 
      GROUP BY device_fingerprint, link_id
      ORDER BY different_browsers DESC, device_fingerprint
    `;

    correlationAnalysis.rows.forEach((row, index) => {
      console.log(`Device ${index + 1}: ${row.device_fingerprint}`);
      console.log(`  ├─ Link ID: ${row.link_id}`);
      console.log(`  ├─ Browser diversi: ${row.different_browsers}`);
      console.log(`  ├─ Visite totali: ${row.total_visits}`);
      console.log(`  ├─ Browser usati: ${row.browsers_used}`);
      console.log(`  └─ Browser fingerprints: ${row.browser_fingerprints.map(fp => fp.substring(0, 8) + '...').join(', ')}\n`);
    });

    // 3. Verifica se ci sono device con multiple browser (il nostro caso)
    const multiDeviceUsers = correlationAnalysis.rows.filter(row => row.different_browsers > 1);
    
    if (multiDeviceUsers.length > 0) {
      console.log('🎯 TROVATI UTENTI CON BROWSER MULTIPLI:\n');
      
      multiDeviceUsers.forEach((device, index) => {
        console.log(`Utente ${index + 1}:`);
        console.log(`  ├─ Device fingerprint: ${device.device_fingerprint}`);
        console.log(`  ├─ Ha usato ${device.different_browsers} browser diversi: ${device.browsers_used}`);
        console.log(`  └─ Su link ID: ${device.link_id}\n`);
      });

      // 4. Per ogni device multiplo, verifica come dovrebbe essere contato
      console.log('📊 VERIFICA CONTEGGIO UNIQUE VISITORS:\n');
      
      for (const device of multiDeviceUsers) {
        console.log(`📱 Device: ${device.device_fingerprint}`);
        
        // Controlla il conteggio attuale nel database
        const linkStats = await sql`
          SELECT 
            l.short_code,
            l.click_count,
            l.unique_click_count,
            COUNT(DISTINCT ef.device_fingerprint) as actual_unique_devices,
            COUNT(DISTINCT ef.browser_fingerprint) as actual_unique_browsers,
            COUNT(ef.id) as enhanced_clicks
          FROM links l
          LEFT JOIN enhanced_fingerprints ef ON l.id = ef.link_id
          WHERE l.id = ${device.link_id}
          GROUP BY l.id, l.short_code, l.click_count, l.unique_click_count
        `;

        if (linkStats.rows.length > 0) {
          const stats = linkStats.rows[0];
          console.log(`  ├─ Link: ${stats.short_code}`);
          console.log(`  ├─ Click totali: ${stats.click_count}`);
          console.log(`  ├─ Unique click count (DB): ${stats.unique_click_count}`);
          console.log(`  ├─ Device unici reali: ${stats.actual_unique_devices}`);
          console.log(`  ├─ Browser unici: ${stats.actual_unique_browsers}`);
          console.log(`  └─ Enhanced clicks: ${stats.enhanced_clicks}`);
          
          // Evidenzia il problema
          if (stats.unique_click_count > stats.actual_unique_devices) {
            console.log(`  ⚠️  PROBLEMA: unique_click_count (${stats.unique_click_count}) > device unici reali (${stats.actual_unique_devices})`);
            console.log(`      Il sistema sta contando ${stats.unique_click_count - stats.actual_unique_devices} click unici di troppo!`);
          } else if (stats.unique_click_count === stats.actual_unique_devices) {
            console.log(`  ✅ CORRETTO: unique_click_count corrisponde ai device unici reali`);
          }
        }
        console.log('');
      }

      // 5. Proposta di correzione
      console.log('🔧 AZIONE CORRETTIVA NECESSARIA:\n');
      console.log('La logica di isUniqueVisit() è stata aggiornata per controllare prima');
      console.log('il device_fingerprint invece del browser_fingerprint.');
      console.log('');
      console.log('Per testare la correzione:');
      console.log('1. Fai un nuovo click da un browser diverso dello stesso dispositivo');
      console.log('2. Verifica che unique_click_count NON aumenti');
      console.log('3. Verifica che click_count aumenti normalmente');

    } else {
      console.log('ℹ️  Non sono stati trovati device con browser multipli nei dati attuali.');
      console.log('   Prova a visitare lo stesso link short da browser diversi per testare la correlazione.');
    }

    // 6. Test della nuova logica (simula)
    console.log('\n🧪 TEST SIMULAZIONE NUOVA LOGICA:\n');
    
    if (multiDeviceUsers.length > 0) {
      const testDevice = multiDeviceUsers[0];
      console.log(`Simulazione per device: ${testDevice.device_fingerprint.substring(0, 12)}...`);
      
      // Simula un nuovo browser fingerprint per lo stesso device
      const existingCheck = await sql`
        SELECT COUNT(*) as count 
        FROM enhanced_fingerprints 
        WHERE link_id = ${testDevice.link_id} 
        AND device_fingerprint = ${testDevice.device_fingerprint}
      `;
      
      console.log(`├─ Device fingerprint già presente: ${existingCheck.rows[0].count > 0 ? 'SÌ' : 'NO'}`);
      console.log(`├─ Numero di browser già registrati: ${testDevice.different_browsers}`);
      console.log(`└─ Nuovo click da browser diverso verrebbe considerato: ${existingCheck.rows[0].count > 0 ? 'NON UNICO ✅' : 'UNICO ❌'}`);
    }

  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

// Esegui il test
testDeviceCorrelation();
