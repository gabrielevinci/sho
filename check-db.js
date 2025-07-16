const { sql } = require('@vercel/postgres');

async function checkDatabase() {
  try {
    console.log('=== VERIFICA DATABASE ===');
    
    // 1. Controlla la tabella links per il link ID 60
    const linkCheck = await sql`SELECT id, short_code, click_count, unique_click_count FROM links WHERE id = 60`;
    console.log('📊 TABELLA LINKS (ID 60):');
    console.log(linkCheck.rows[0]);
    
    // 2. Controlla tutti i click nella tabella clicks per questo link
    const clicksCheck = await sql`
      SELECT COUNT(*) as total_clicks, browser_name, COUNT(*) as count_per_browser
      FROM clicks 
      WHERE link_id = 60 
      GROUP BY browser_name
      ORDER BY browser_name
    `;
    console.log('\n📈 TABELLA CLICKS (per browser):');
    clicksCheck.rows.forEach(row => {
      console.log(`  ${row.browser_name}: ${row.count_per_browser} clicks`);
    });
    
    // 3. Totale clicks nella tabella clicks
    const totalClicksCheck = await sql`SELECT COUNT(*) as total FROM clicks WHERE link_id = 60`;
    console.log(`\n📊 TOTALE CLICKS TABELLA: ${totalClicksCheck.rows[0].total}`);
    
    // 4. Controlla enhanced_fingerprints
    const enhancedCheck = await sql`
      SELECT browser_type, visit_count, created_at 
      FROM enhanced_fingerprints 
      WHERE link_id = 60 
      ORDER BY created_at
    `;
    console.log('\n🔍 ENHANCED_FINGERPRINTS:');
    enhancedCheck.rows.forEach(row => {
      console.log(`  ${row.browser_type}: ${row.visit_count} visits - ${row.created_at}`);
    });
    
    // 5. Verifica se ci sono stati errori di inserimento
    const recentClicks = await sql`
      SELECT browser_name, clicked_at_rome 
      FROM clicks 
      WHERE link_id = 60 
      ORDER BY clicked_at_rome DESC 
      LIMIT 10
    `;
    console.log('\n⏰ ULTIMI CLICKS:');
    recentClicks.rows.forEach(row => {
      console.log(`  ${row.browser_name} - ${row.clicked_at_rome}`);
    });
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

checkDatabase();
