// Test dell'endpoint reset-clicks
require('dotenv').config({ path: '.env.local' });

async function testResetAPI() {
  try {
    console.log('🧪 Test API endpoint reset-clicks');
    
    // Prima verifichiamo i dati del link
    const { sql } = require('@vercel/postgres');
    
    const linkResult = await sql`
      SELECT id, short_code, user_id, workspace_id, click_count, unique_click_count
      FROM links 
      WHERE short_code = 'fnpx6xa'
    `;
    
    if (linkResult.rows.length === 0) {
      console.log('❌ Link non trovato');
      return;
    }
    
    const link = linkResult.rows[0];
    console.log('🔍 Dati link prima del test:', link);
    
    // Conta i click nella tabella clicks
    const clicksBefore = await sql`
      SELECT COUNT(*) as count
      FROM clicks 
      WHERE link_id = ${link.id}
    `;
    console.log('📊 Click nella tabella clicks prima del reset:', clicksBefore.rows[0].count);
    
    // Test della chiamata API (simulata) 
    console.log('🔄 Useremo questi dati per testare l\'API:');
    console.log('- Short code:', link.short_code);
    console.log('- User ID:', link.user_id);
    console.log('- Workspace ID:', link.workspace_id);
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

testResetAPI();
