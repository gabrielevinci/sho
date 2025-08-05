/**
 * Script di migrazione per aggiornare il sistema a fingerprinting robusto
 * Questo script deve essere eseguito una volta per inizializzare il nuovo sistema
 */

import { sql } from '@vercel/postgres';
import { createRobustFingerprintsTable } from '@/database/migrations/create-robust-fingerprints-table';

export async function migrateToRobustFingerprinting() {
  console.log('🚀 Starting migration to robust fingerprinting system...');
  
  try {
    // 1. Crea la tabella per i fingerprint robusti
    await createRobustFingerprintsTable();
    
    // 2. Aggiungi colonne alla tabella clicks se non esistono già
    await ensureClicksTableUpdated();
    
    // 3. Crea trigger per pulizia automatica
    await createCleanupTriggers();
    
    // 4. Ottimizza gli indici esistenti
    await optimizeExistingIndexes();
    
    console.log('✅ Migration to robust fingerprinting completed successfully!');
    
    return {
      success: true,
      message: 'Migration completed successfully',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Aggiorna la tabella clicks con eventuali colonne mancanti
 */
async function ensureClicksTableUpdated() {
  try {
    console.log('🔄 Updating clicks table schema...');
    
    // Aggiungi colonne per il tracking migliorato se non esistono
    const columns = [
      { name: 'geo_confidence', type: 'INTEGER DEFAULT 50' },
      { name: 'ip_confidence', type: 'INTEGER DEFAULT 50' },
      { name: 'fingerprint_version', type: 'VARCHAR(10) DEFAULT \'legacy\'' }
    ];
    
    for (const column of columns) {
      try {
        await sql`
          ALTER TABLE clicks 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
        `;
        console.log(`✅ Added column ${column.name} to clicks table`);
      } catch (error) {
        // Ignora errori se la colonna esiste già
        console.log(`ℹ️ Column ${column.name} already exists or failed to add`);
      }
    }
    
    // Aggiorna i record esistenti per marcarli come legacy
    await sql`
      UPDATE clicks 
      SET fingerprint_version = 'legacy' 
      WHERE fingerprint_version IS NULL
    `;
    
    console.log('✅ Clicks table updated successfully');
    
  } catch (error) {
    console.error('❌ Error updating clicks table:', error);
    throw error;
  }
}

/**
 * Crea trigger per pulizia automatica dei dati vecchi
 */
async function createCleanupTriggers() {
  try {
    console.log('🔄 Creating cleanup triggers...');
    
    // Trigger per pulizia automatica dei fingerprint robusti più vecchi di 1 anno
    await sql`
      CREATE OR REPLACE FUNCTION cleanup_old_robust_fingerprints()
      RETURNS trigger AS $$
      BEGIN
        DELETE FROM robust_fingerprints 
        WHERE created_at < NOW() - INTERVAL '1 year';
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Trigger che viene eseguito settimanalmente
    await sql`
      DROP TRIGGER IF EXISTS trigger_cleanup_robust_fingerprints ON robust_fingerprints;
      CREATE TRIGGER trigger_cleanup_robust_fingerprints
        AFTER INSERT ON robust_fingerprints
        FOR EACH STATEMENT
        EXECUTE FUNCTION cleanup_old_robust_fingerprints();
    `;
    
    console.log('✅ Cleanup triggers created successfully');
    
  } catch (error) {
    console.error('❌ Error creating cleanup triggers:', error);
    // Non bloccare la migrazione per questo
  }
}

/**
 * Ottimizza gli indici esistenti per migliorare le performance
 */
async function optimizeExistingIndexes() {
  try {
    console.log('🔄 Optimizing database indexes...');
    
    // Crea indici compositi per query comuni
    const indexQueries = [
      // Indice per query di analytics per link specifico
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clicks_link_date_fingerprint 
       ON clicks (link_id, clicked_at_rome DESC, click_fingerprint_hash)`,
      
      // Indice per query geografiche
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clicks_geo_comprehensive 
       ON clicks (country, region, city) WHERE country != 'Unknown'`,
      
      // Indice per rilevamento click duplicati rapidi
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clicks_recent_fingerprints 
       ON clicks (click_fingerprint_hash, clicked_at_rome DESC) 
       WHERE clicked_at_rome >= NOW() - INTERVAL '24 hours'`,
      
      // Indice per analisi IP
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clicks_ip_analysis 
       ON clicks (ip_address, clicked_at_rome DESC) 
       WHERE ip_address != 'unknown' AND ip_address != 'localhost'`
    ];
    
    for (const indexQuery of indexQueries) {
      try {
        await sql.query(indexQuery);
        console.log(`✅ Created/verified index`);
      } catch (error) {
        console.log(`ℹ️ Index creation skipped (may already exist): ${error}`);
      }
    }
    
    // Aggiorna statistiche delle tabelle per l'ottimizzatore di query
    await sql`ANALYZE clicks`;
    await sql`ANALYZE robust_fingerprints`;
    
    console.log('✅ Database indexes optimized successfully');
    
  } catch (error) {
    console.error('❌ Error optimizing indexes:', error);
    // Non bloccare la migrazione per questo
  }
}

/**
 * Verifica lo stato del sistema dopo la migrazione
 */
export async function verifyMigration() {
  try {
    console.log('🔍 Verifying migration status...');
    
    // Controlla se le tabelle esistono
    const tablesCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('clicks', 'robust_fingerprints')
    `;
    
    const hasClicksTable = tablesCheck.rows.some(row => row.table_name === 'clicks');
    const hasRobustTable = tablesCheck.rows.some(row => row.table_name === 'robust_fingerprints');
    
    // Controlla se ci sono dati nella tabella robust_fingerprints
    const robustCount = await sql`SELECT COUNT(*) as count FROM robust_fingerprints`;
    
    // Controlla se ci sono click recenti
    const recentClicks = await sql`
      SELECT COUNT(*) as count 
      FROM clicks 
      WHERE clicked_at_rome >= NOW() - INTERVAL '24 hours'
    `;
    
    const verificationResult = {
      hasClicksTable,
      hasRobustTable,
      robustFingerprintsCount: robustCount.rows[0].count,
      recentClicksCount: recentClicks.rows[0].count,
      systemStatus: hasClicksTable && hasRobustTable ? 'healthy' : 'needs_attention',
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Migration verification completed:', verificationResult);
    return verificationResult;
    
  } catch (error) {
    console.error('❌ Error verifying migration:', error);
    return {
      systemStatus: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Rollback della migrazione (se necessario)
 */
export async function rollbackMigration() {
  try {
    console.log('⚠️ Starting migration rollback...');
    
    // Rimuovi la tabella robust_fingerprints
    await sql`DROP TABLE IF EXISTS robust_fingerprints CASCADE`;
    
    // Rimuovi le colonne aggiunte alla tabella clicks
    const rollbackColumns = ['geo_confidence', 'ip_confidence', 'fingerprint_version'];
    
    for (const column of rollbackColumns) {
      try {
        await sql`ALTER TABLE clicks DROP COLUMN IF EXISTS ${column}`;
      } catch (error) {
        console.log(`ℹ️ Column ${column} removal skipped`);
      }
    }
    
    // Rimuovi i trigger
    await sql`DROP TRIGGER IF EXISTS trigger_cleanup_robust_fingerprints ON robust_fingerprints`;
    await sql`DROP FUNCTION IF EXISTS cleanup_old_robust_fingerprints()`;
    
    console.log('✅ Migration rollback completed');
    
    return {
      success: true,
      message: 'Rollback completed successfully',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}
