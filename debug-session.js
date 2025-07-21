require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkUserAndWorkspace() {
  try {
    console.log('🔍 Checking users and workspaces...');
    
    // Verifica utenti esistenti
    const users = await sql`SELECT id, email FROM users LIMIT 5`;
    console.log('👥 Users found:', users.rows);
    
    if (users.rows.length > 0) {
      const userId = users.rows[0].id;
      console.log(`🔍 Checking workspaces for user: ${userId}`);
      
      // Verifica workspaces per questo utente
      const workspaces = await sql`
        SELECT id, name FROM workspaces WHERE user_id = ${userId} ORDER BY created_at ASC LIMIT 5
      `;
      console.log('🏢 Workspaces found:', workspaces.rows);
      
      if (workspaces.rows.length > 0) {
        const workspaceId = workspaces.rows[0].id;
        console.log(`🔍 Checking links for user ${userId} and workspace ${workspaceId}`);
        
        // Verifica links esistenti
        const links = await sql`
          SELECT id, short_code, original_url, user_id, workspace_id, folder_id 
          FROM links 
          WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
          LIMIT 10
        `;
        console.log('🔗 Links found:', links.rows);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserAndWorkspace();
