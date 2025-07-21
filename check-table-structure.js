require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkTableStructure() {
  try {
    console.log('🔍 Verifica struttura tabella links...');
    
    const result = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'links'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

checkTableStructure();
