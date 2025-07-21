/**
 * Migrazione per aggiungere campi di tracking avanzato alla tabella clicks
 */

import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function addAdvancedTrackingFields() {
  try {
    console.log('🚀 Aggiunta campi di tracking avanzato alla tabella clicks...\n');
    
    // Verifica se i campi esistono già
    const tableInfo = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clicks' 
      AND column_name IN ('source_type', 'source_detail')
    `;
    
    if (tableInfo.rows.length > 0) {
      console.log('✅ I campi di tracking avanzato esistono già');
      console.log('Campi trovati:', tableInfo.rows.map(r => r.column_name));
      return;
    }
    
    console.log('📝 Aggiunta colonne source_type e source_detail...');
    
    // Aggiungi le nuove colonne
    await sql`
      ALTER TABLE clicks 
      ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS source_detail VARCHAR(200)
    `;
    
    console.log('✅ Colonne aggiunte con successo');
    
    // Crea indici per prestazioni migliori
    console.log('📈 Creazione indici per prestazioni...');
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_clicks_source_type ON clicks(source_type)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_clicks_source_detail ON clicks(source_detail)
    `;
    
    console.log('✅ Indici creati con successo');
    
    // Popola i nuovi campi per i dati esistenti
    console.log('🔄 Popolamento campi per dati esistenti...');
    
    // Aggiorna i click diretti
    const directResult = await sql`
      UPDATE clicks 
      SET source_type = 'direct', source_detail = 'Direct Access'
      WHERE referrer = 'Direct' AND source_type IS NULL
    `;
    
    console.log(`   ✅ Aggiornati ${directResult.rowCount} click diretti`);
    
    // Aggiorna i click da Google
    const googleResult = await sql`
      UPDATE clicks 
      SET source_type = 'search_engine', source_detail = 'Google Organic'
      WHERE referrer LIKE '%google.%' AND source_type IS NULL
    `;
    
    console.log(`   ✅ Aggiornati ${googleResult.rowCount} click da Google`);
    
    // Aggiorna i click interni
    const internalResult = await sql`
      UPDATE clicks 
      SET source_type = 'internal', source_detail = 'Same Website'
      WHERE referrer LIKE '%sho-smoky.vercel.app%' AND source_type IS NULL
    `;
    
    console.log(`   ✅ Aggiornati ${internalResult.rowCount} click interni`);
    
    // Aggiorna altri referrer generici
    const otherResult = await sql`
      UPDATE clicks 
      SET source_type = 'unknown', source_detail = 'Legacy Data'
      WHERE source_type IS NULL AND referrer IS NOT NULL
    `;
    
    console.log(`   ✅ Aggiornati ${otherResult.rowCount} altri click`);
    
    // Verifica finale
    const finalCount = await sql`
      SELECT 
        source_type, 
        COUNT(*) as count
      FROM clicks 
      WHERE source_type IS NOT NULL
      GROUP BY source_type
      ORDER BY count DESC
    `;
    
    console.log('\n📊 Distribuzione source_type dopo migrazione:');
    finalCount.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.source_type}: ${row.count} click`);
    });
    
    console.log('\n🎉 Migrazione completata con successo!');
    
  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
  }
}

addAdvancedTrackingFields();
