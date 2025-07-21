require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function simulateAppBehavior() {
  try {
    console.log('🎭 Simulazione comportamento dell\'applicazione...');
    
    // Simula esattamente i parametri che vengono dall'applicazione
    const userId = 'b9718f87-1a56-4c6e-b91d-ec5e2cef1ad6';  // UUID string
    const workspaceId = 'a4d63585-d3ae-4084-a695-fdb53a796f89';  // UUID string
    const originalUrl = 'https://google.com';
    const shortCode = 'test123';
    const title = 'Test Link';
    const description = 'Test Description';
    const utm_source = '';
    const utm_medium = '';
    const utm_campaign = '';
    const utm_term = '';
    const utm_content = '';
    const selectedFolderIds = ['596f112d-3bd1-46b6-95a1-450e5f439024']; // Array di UUID string
    
    console.log('📊 Parametri:', {
      userId: { value: userId, type: typeof userId },
      workspaceId: { value: workspaceId, type: typeof workspaceId },
      selectedFolderIds: { value: selectedFolderIds, type: typeof selectedFolderIds },
      selectedFolder: { 
        value: selectedFolderIds.length > 0 ? selectedFolderIds[0] : null, 
        type: typeof (selectedFolderIds.length > 0 ? selectedFolderIds[0] : null) 
      }
    });

    // Esegui la stessa query dell'applicazione
    console.log('\n🚀 Esecuzione query identica all\'applicazione...');
    
    const linkResult = await sql`
      INSERT INTO links (
        user_id, workspace_id, original_url, short_code, title, description, 
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        folder_id
      )
      VALUES (
        ${userId}, ${workspaceId}, ${originalUrl}, ${shortCode}, ${title}, ${description},
        ${utm_source}, ${utm_medium}, ${utm_campaign}, ${utm_term}, ${utm_content},
        ${selectedFolderIds.length > 0 ? selectedFolderIds[0] : null}
      )
      RETURNING id, user_id, workspace_id, folder_id
    `;

    console.log('✅ Successo! Link creato:', linkResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Errore durante la simulazione:', error.message);
    console.error('Dettagli completi dell\'errore:', error);
  }
}

simulateAppBehavior();
