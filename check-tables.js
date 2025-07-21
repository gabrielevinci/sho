import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function checkTables() {
  try {
    console.log('Controllo tabelle esistenti...');
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('Tabelle esistenti:');
    result.rows.forEach(row => console.log('- ' + row.table_name));
    
    // Controlla specificatamente enhanced_fingerprints
    try {
      const enhancedCheck = await sql`SELECT COUNT(*) FROM enhanced_fingerprints LIMIT 1`;
      console.log('✅ Tabella enhanced_fingerprints esiste e funziona');
    } catch (error) {
      console.log('❌ Tabella enhanced_fingerprints NON esiste:', error.message);
    }
    
  } catch (error) {
    console.error('Errore generale:', error);
  }
  process.exit(0);
}

checkTables();
