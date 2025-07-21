require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function addClickColumns() {
  try {
    console.log('🔄 Aggiungendo colonne click_count e unique_click_count...');
    
    await sql`
      ALTER TABLE links 
      ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS unique_click_count INTEGER DEFAULT 0
    `;
    
    console.log('✅ Colonne aggiunte con successo!');
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

addClickColumns();
