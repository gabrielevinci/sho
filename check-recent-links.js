require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkRecentLinks() {
  try {
    console.log('🔍 Checking recent links in database...');
    
    // Ottieni tutti i link recenti con user_id e workspace_id
    const links = await sql`
      SELECT 
        l.id,
        l.short_code,
        l.original_url,
        l.title,
        l.user_id,
        l.workspace_id,
        l.folder_id,
        l.created_at,
        u.email as user_email,
        w.name as workspace_name
      FROM links l
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN workspaces w ON l.workspace_id = w.id
      ORDER BY l.created_at DESC
      LIMIT 10
    `;
    
    console.log(`📊 Found ${links.rows.length} links:`);
    
    links.rows.forEach((link, index) => {
      console.log(`\n${index + 1}. Link ID: ${link.id}`);
      console.log(`   Short Code: ${link.short_code}`);
      console.log(`   URL: ${link.original_url}`);
      console.log(`   Title: ${link.title || 'N/A'}`);
      console.log(`   User ID: ${link.user_id || '❌ NULL'}`);
      console.log(`   User Email: ${link.user_email || '❌ NULL'}`);
      console.log(`   Workspace ID: ${link.workspace_id || '❌ NULL'}`);
      console.log(`   Workspace Name: ${link.workspace_name || '❌ NULL'}`);
      console.log(`   Folder ID: ${link.folder_id || 'N/A'}`);
      console.log(`   Created: ${link.created_at}`);
    });
    
    // Statistiche sui campi vuoti
    const nullUserIds = links.rows.filter(link => !link.user_id).length;
    const nullWorkspaceIds = links.rows.filter(link => !link.workspace_id).length;
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total links: ${links.rows.length}`);
    console.log(`   Links with NULL user_id: ${nullUserIds}`);
    console.log(`   Links with NULL workspace_id: ${nullWorkspaceIds}`);
    
    if (nullUserIds > 0 || nullWorkspaceIds > 0) {
      console.log('❌ Found links with missing user_id or workspace_id!');
    } else {
      console.log('✅ All links have proper user_id and workspace_id!');
    }
    
  } catch (error) {
    console.error('❌ Error checking links:', error);
  }
}

checkRecentLinks();
