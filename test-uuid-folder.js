require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function testLinkCreation() {
  try {
    console.log('🧪 Testing link creation with UUID folder_id...');
    
    // Test inserimento di un link con folder_id UUID
    const testUserId = 'a4d63585-d3ae-4084-a695-fdb53a796f89';
    const testWorkspaceId = 'a4d63585-d3ae-4084-a695-fdb53a796f89';
    const testFolderId = '5c1aca59-a2b8-4b22-b19e-593ceed8adf1'; // UUID di esempio
    
    console.log('📝 Inserting test link...');
    
    const result = await sql`
      INSERT INTO links (
        user_id, workspace_id, original_url, short_code, title, description, 
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        folder_id
      )
      VALUES (
        ${testUserId}, ${testWorkspaceId}, 'https://example.com', 'test123', 'Test Link', 'Test Description',
        'test-source', 'test-medium', 'test-campaign', 'test-term', 'test-content',
        ${testFolderId}
      )
      RETURNING id, short_code, folder_id
    `;
    
    console.log('✅ Link created successfully:', result.rows[0]);
    
    // Test query dei link
    console.log('🔍 Querying links...');
    const links = await sql`
      SELECT 
        l.id,
        l.short_code,
        l.original_url,
        l.title,
        l.description,
        l.created_at,
        l.folder_id,
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
      WHERE l.user_id = ${testUserId} AND l.workspace_id = ${testWorkspaceId}
      ORDER BY l.created_at DESC
    `;
    
    console.log('✅ Links queried successfully:', links.rows);
    
    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await sql`DELETE FROM links WHERE short_code = 'test123'`;
    
    console.log('🎉 All tests passed! UUID folder_id works correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testLinkCreation();
