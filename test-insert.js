require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function testInsert() {
  try {
    console.log('🧪 Test inserimento diretto nella tabella links...');
    
    // Dati di test (tutti i tipi corretti)
    const userId = 'b9718f87-1a56-4c6e-b91d-ec5e2cef1ad6';
    const workspaceId = 'a4d63585-d3ae-4084-a695-fdb53a796f89';
    const folderId = '596f112d-3bd1-46b6-95a1-450e5f439024'; // UUID di una cartella esistente
    
    console.log('Dati di test:', { userId, workspaceId, folderId });
    
    // Test 1: Inserimento senza folder_id
    try {
      console.log('\n🔬 Test 1: Inserimento senza folder_id...');
      const result1 = await sql`
        INSERT INTO links (
          user_id, workspace_id, original_url, short_code, title, description
        )
        VALUES (
          ${userId}, ${workspaceId}, 'https://example.com', 'test1', 'Test 1', 'Test description'
        )
        RETURNING id, user_id, workspace_id, folder_id
      `;
      console.log('✅ Test 1 riuscito:', result1.rows[0]);
    } catch (error) {
      console.error('❌ Test 1 fallito:', error.message);
    }
    
    // Test 2: Inserimento con folder_id
    try {
      console.log('\n🔬 Test 2: Inserimento con folder_id...');
      const result2 = await sql`
        INSERT INTO links (
          user_id, workspace_id, original_url, short_code, title, description, folder_id
        )
        VALUES (
          ${userId}, ${workspaceId}, 'https://example.com', 'test2', 'Test 2', 'Test description', ${folderId}
        )
        RETURNING id, user_id, workspace_id, folder_id
      `;
      console.log('✅ Test 2 riuscito:', result2.rows[0]);
    } catch (error) {
      console.error('❌ Test 2 fallito:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Errore generale:', error);
  }
}

testInsert();
