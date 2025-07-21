require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function fixFolderIdColumn() {
  try {
    console.log('🔄 Convertendo folder_id da INTEGER a UUID...');
    
    // Cambia il tipo di colonna da INTEGER a UUID
    await sql`
      ALTER TABLE links 
      ALTER COLUMN folder_id TYPE UUID USING NULL
    `;
    
    console.log('✅ Colonna folder_id convertita a UUID con successo!');
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

fixFolderIdColumn();
