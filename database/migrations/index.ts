/**
 * Esportazione centralizzata di tutte le migrazioni
 */

// Migrazioni fingerprint e correlazioni
export { createFingerprintCorrelationsTable } from './create-fingerprint-correlations-table';
export { createAdvancedFingerprintTables } from './create-advanced-fingerprint-tables';

// Migrazioni analytics
export { createUnifiedClickAnalyticsView } from './create-unified-click-analytics-view';

// Migrazione reset tabelle principali
export { resetLinksAndClicksTables } from './reset-links-clicks-tables';

// Funzione per eseguire il reset delle tabelle principali
export async function runTableReset() {
  const { resetLinksAndClicksTables } = await import('./reset-links-clicks-tables');
  
  console.log('🚀 Avvio reset delle tabelle principali...');
  
  try {
    await resetLinksAndClicksTables();
    console.log('🎉 Reset delle tabelle completato con successo!');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Errore durante il reset delle tabelle:', error);
    return { success: false, error };
  }
}

// Funzione per eseguire tutte le migrazioni in sequenza
export async function runAllMigrations() {
  const { createFingerprintCorrelationsTable } = await import('./create-fingerprint-correlations-table');
  const { createAdvancedFingerprintTables } = await import('./create-advanced-fingerprint-tables');
  const { createUnifiedClickAnalyticsView } = await import('./create-unified-click-analytics-view');
  
  console.log('🚀 Avvio sequenza di migrazione database...');
  
  try {
    // Migrazione 1: Tabella correlazioni fingerprint
    await createFingerprintCorrelationsTable();
    console.log('✅ Migrazione 1 completata: tabelle correlazioni fingerprint');
    
    // Migrazione 2: Tabelle fingerprint avanzato
    await createAdvancedFingerprintTables();
    console.log('✅ Migrazione 2 completata: tabelle fingerprint avanzato');
    
    // Migrazione 3: Vista analytics unificata
    await createUnifiedClickAnalyticsView();
    console.log('✅ Migrazione 3 completata: vista analytics unificata');
    
    console.log('🎉 Tutte le migrazioni completate con successo!');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Errore durante l\'esecuzione delle migrazioni:', error);
    return { success: false, error };
  }
}

// Esegui migrazioni se chiamato direttamente
if (require.main === module) {
  runAllMigrations()
    .then(result => {
      if (result.success) {
        console.log('✨ Migrazioni database completate!');
        process.exit(0);
      } else {
        console.error('💥 Migrazioni fallite:', result.error);
        process.exit(1);
      }
    });
}
