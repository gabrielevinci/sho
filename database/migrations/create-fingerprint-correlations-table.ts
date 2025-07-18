/**
 * Database Migration for Fingerprint Correlations Table
 * Crea la tabella fingerprint_correlations se non esiste
 */

import { sql } from '@vercel/postgres';

export async function createFingerprintCorrelationsTable() {
  try {
    console.log('🚀 Creazione tabella fingerprint_correlations...');

    // Crea la tabella per le correlazioni tra fingerprint
    await sql`
      CREATE TABLE IF NOT EXISTS fingerprint_correlations (
        id SERIAL PRIMARY KEY,
        device_cluster_id VARCHAR(24) NOT NULL,
        fingerprint_hash VARCHAR(64) NOT NULL,
        correlation_type VARCHAR(20) DEFAULT 'same_device',
        confidence_score INTEGER DEFAULT 100,
        first_correlated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_confirmed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Constraint unico per evitare duplicati
        UNIQUE(device_cluster_id, fingerprint_hash)
      )
    `;

    // Crea indici per ottimizzare le query
    await sql`CREATE INDEX IF NOT EXISTS idx_fingerprint_correlations_device_cluster ON fingerprint_correlations(device_cluster_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_fingerprint_correlations_fingerprint_hash ON fingerprint_correlations(fingerprint_hash)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_fingerprint_correlations_type ON fingerprint_correlations(correlation_type)`;

    console.log('✅ Tabella fingerprint_correlations creata con successo!');
    
  } catch (error) {
    console.error('❌ Errore durante la creazione della tabella fingerprint_correlations:', error);
    throw error;
  }
}

// Funzione per eliminare la tabella (per sviluppo)
export async function dropFingerprintCorrelationsTable() {
  try {
    console.log('🗑️ Eliminazione tabella fingerprint_correlations...');
    
    await sql`DROP TABLE IF EXISTS fingerprint_correlations CASCADE`;
    
    console.log('✅ Tabella fingerprint_correlations eliminata!');
  } catch (error) {
    console.error('❌ Errore durante l\'eliminazione della tabella fingerprint_correlations:', error);
    throw error;
  }
}

// Export per uso standalone
if (require.main === module) {
  createFingerprintCorrelationsTable()
    .then(() => {
      console.log('✨ Migrazione fingerprint_correlations completata!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migrazione fingerprint_correlations fallita:', error);
      process.exit(1);
    });
}
