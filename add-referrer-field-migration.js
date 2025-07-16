#!/usr/bin/env node

/**
 * Script per aggiungere il campo referrer alla tabella enhanced_fingerprints
 * e garantire coerenza nei dati analytics
 */

const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function addReferrerToEnhanced() {
  console.log('🔧 Aggiunta campo referrer a enhanced_fingerprints...\n');

  try {
    // 1. Aggiungi il campo referrer se non esiste
    console.log('📊 Controllo campo referrer...');
    
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'enhanced_fingerprints' 
      AND column_name = 'referrer'
    `;

    if (columnCheck.rows.length === 0) {
      console.log('➕ Aggiunta campo referrer...');
      await sql`
        ALTER TABLE enhanced_fingerprints 
        ADD COLUMN referrer TEXT
      `;
      console.log('✅ Campo referrer aggiunto con successo');
    } else {
      console.log('✅ Campo referrer già presente');
    }

    // 2. Crea indice per performance
    console.log('📈 Creazione indice per performance...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_enhanced_fingerprints_referrer 
      ON enhanced_fingerprints(referrer)
    `;
    console.log('✅ Indice creato');

    // 3. Controlla se la tabella clicks esiste
    console.log('🔍 Controllo tabella clicks...');
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'clicks'
    `;

    if (tableCheck.rows.length > 0) {
      console.log('🔄 Migrazione dati da tabella clicks...');
      
      // Aggiorna i referrer dalla tabella clicks
      const updateResult = await sql`
        UPDATE enhanced_fingerprints ef
        SET referrer = COALESCE(c.referrer, 'Direct')
        FROM clicks c
        WHERE ef.link_id = c.link_id 
        AND ef.referrer IS NULL
        AND c.referrer IS NOT NULL
      `;
      
      console.log(`✅ Aggiornati ${updateResult.count || 0} record dalla tabella clicks`);
    } else {
      console.log('ℹ️  Tabella clicks non trovata, skip migrazione dati');
    }

    // 4. Imposta 'Direct' per i record senza referrer
    console.log('🔄 Impostazione referrer predefinito...');
    const defaultUpdate = await sql`
      UPDATE enhanced_fingerprints 
      SET referrer = 'Direct' 
      WHERE referrer IS NULL
    `;
    console.log(`✅ Impostato referrer predefinito per ${defaultUpdate.count || 0} record`);

    // 5. Verifica finale
    console.log('📊 Verifica finale...');
    const verification = await sql`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN referrer IS NOT NULL THEN 1 END) as records_with_referrer,
        COUNT(CASE WHEN referrer = 'Direct' THEN 1 END) as direct_referrers,
        COUNT(CASE WHEN referrer != 'Direct' AND referrer IS NOT NULL THEN 1 END) as external_referrers
      FROM enhanced_fingerprints
    `;

    const stats = verification.rows[0];
    console.log('\n📈 STATISTICHE FINALI:');
    console.log(`   📊 Record totali: ${stats.total_records}`);
    console.log(`   ✅ Record con referrer: ${stats.records_with_referrer}`);
    console.log(`   🔗 Direct referrers: ${stats.direct_referrers}`);
    console.log(`   🌐 External referrers: ${stats.external_referrers}`);

    // 6. Test una query analytics tipica
    console.log('\n🧪 Test query analytics...');
    const testQuery = await sql`
      SELECT 
        referrer,
        COUNT(*) as clicks,
        COUNT(DISTINCT device_fingerprint) as unique_visitors
      FROM enhanced_fingerprints 
      GROUP BY referrer 
      ORDER BY clicks DESC 
      LIMIT 5
    `;

    console.log('📊 Top 5 referrer:');
    testQuery.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.referrer}: ${row.clicks} clicks (${row.unique_visitors} unique)`);
    });

    console.log('\n🎉 MIGRAZIONE COMPLETATA CON SUCCESSO!');
    console.log('\n✅ Il sistema analytics ora ha accesso completo ai dati referrer');
    console.log('✅ Tutte le query sono ora coerenti tra enhanced_fingerprints e clicks');
    console.log('✅ Le performance sono ottimizzate con indici appropriati\n');

  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    console.log('\nℹ️  Controlla che:');
    console.log('   • Il database sia accessibile');
    console.log('   • Le variabili d\'ambiente siano configurate');
    console.log('   • L\'utente abbia i permessi per ALTER TABLE');
    process.exit(1);
  }
}

// Esegui la migrazione se lo script viene chiamato direttamente
if (require.main === module) {
  addReferrerToEnhanced();
}

module.exports = { addReferrerToEnhanced };
