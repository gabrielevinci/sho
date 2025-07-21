require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function testDirectLinkCreation() {
  try {
    console.log('🧪 Testing direct link creation...');
    
    const userId = 'b9718f87-1a56-4c6e-b91d-ec5e2cef1ad6';
    const workspaceId = 'a4d63585-d3ae-4084-a695-fdb53a796f89';
    
    console.log('📝 Creating test link with explicit user_id and workspace_id...');
    
    const result = await sql`
      INSERT INTO links (
        user_id, workspace_id, original_url, short_code, title, description, 
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        folder_id
      )
      VALUES (
        ${userId}, ${workspaceId}, 'https://test-direct.com', 'direct123', 'Direct Test Link', 'Direct Test Description',
        'direct-source', 'direct-medium', 'direct-campaign', 'direct-term', 'direct-content',
        NULL
      )
      RETURNING id, user_id, workspace_id, short_code
    `;
    
    console.log('✅ Link created successfully:', result.rows[0]);
    
    // Verifica che il link sia recuperabile con la query della dashboard
    console.log('🔍 Testing dashboard query...');
    const dashboardLinks = await sql`
      SELECT 
        l.id,
        l.short_code,
        l.original_url,
        l.title,
        l.description,
        l.created_at,
        l.folder_id,
        l.user_id,
        l.workspace_id,
        COALESCE(click_stats.total_clicks, 0)::integer as click_count,
        COALESCE(click_stats.unique_clicks, 0)::integer as unique_click_count
      FROM links l
      LEFT JOIN (
        SELECT 
          link_id,
          COUNT(*) as total_clicks,
          COUNT(DISTINCT click_fingerprint_hash) as unique_clicks
        FROM clicks 
        GROUP BY link_id
      ) click_stats ON l.id = click_stats.link_id
      WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId}
      ORDER BY l.created_at DESC
    `;
    
    console.log('✅ Dashboard query successful. Links found:', dashboardLinks.rows.length);
    dashboardLinks.rows.forEach(link => {
      console.log(`  - ${link.short_code}: user_id=${link.user_id}, workspace_id=${link.workspace_id}`);
    });
    
    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await sql`DELETE FROM links WHERE short_code = 'direct123'`;
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDirectLinkCreation();
