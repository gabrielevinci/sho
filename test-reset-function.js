require('dotenv').config({ path: '.env.local' });
const { resetLinkClicks } = require('./lib/reset-clicks-shared.ts');

async function testReset() {
  try {
    console.log('🧪 Test reset click per link fnpx6xa');
    
    // Simula un utente - dobbiamo trovare l'user_id corretto
    const { sql } = require('@vercel/postgres');
    
    const linkResult = await sql`
      SELECT id, user_id, workspace_id, click_count, unique_click_count
      FROM links 
      WHERE short_code = 'fnpx6xa'
    `;
    
    if (linkResult.rows.length === 0) {
      console.log('❌ Link non trovato');
      return;
    }
    
    const link = linkResult.rows[0];
    console.log('🔍 Dati link prima del reset:', link);
    
    // Conta i click nella tabella clicks
    const clicksBefore = await sql`
      SELECT COUNT(*) as count
      FROM clicks 
      WHERE link_id = ${link.id}
    `;
    console.log('📊 Click nella tabella clicks prima del reset:', clicksBefore.rows[0].count);
    
    // Esegui il reset
    const result = await resetLinkClicks('fnpx6xa', link.user_id, link.workspace_id);
    console.log('🔄 Risultato reset:', result);
    
    // Verifica dopo il reset
    const linkAfter = await sql`
      SELECT id, user_id, workspace_id, click_count, unique_click_count
      FROM links 
      WHERE short_code = 'fnpx6xa'
    `;
    console.log('🔍 Dati link dopo il reset:', linkAfter.rows[0]);
    
    const clicksAfter = await sql`
      SELECT COUNT(*) as count
      FROM clicks 
      WHERE link_id = ${link.id}
    `;
    console.log('📊 Click nella tabella clicks dopo il reset:', clicksAfter.rows[0].count);
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

testReset();
