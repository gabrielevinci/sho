require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkFoldersStructure() {
  try {
    console.log('🔍 Verifica struttura tabella folders...');
    
    const result = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'folders'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.table(result.rows);
    
    // Vediamo anche alcune cartelle di esempio
    console.log('\n📂 Esempio di cartelle:');
    const folders = await sql`
      SELECT id, name, parent_folder_id, workspace_id, user_id
      FROM folders 
      LIMIT 5
    `;
    
    console.table(folders.rows);
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

checkFoldersStructure();
