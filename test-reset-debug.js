require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkTables() {
  try {
    // Controlla la struttura della tabella clicks
    const clicksTable = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'clicks'
      ORDER BY ordinal_position
    `;
    
    console.log('Struttura tabella clicks:');
    console.table(clicksTable.rows);
    
    // Controlla la struttura della tabella links
    const linksTable = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'links'
      ORDER BY ordinal_position
    `;
    
    console.log('\nStruttura tabella links:');
    console.table(linksTable.rows);
    
    // Test di un link esistente
    const sampleLink = await sql`
      SELECT id, short_code, click_count, unique_click_count
      FROM links 
      LIMIT 1
    `;
    
    if (sampleLink.rows.length > 0) {
      const link = sampleLink.rows[0];
      console.log('\nLink di esempio:', link);
      
      // Conta i click per questo link
      const clickCount = await sql`
        SELECT COUNT(*) as count
        FROM clicks 
        WHERE link_id = ${link.id}
      `;
      
      console.log('Click nella tabella clicks per questo link:', clickCount.rows[0].count);
    }
    
  } catch (error) {
    console.error('Errore:', error);
  }
}

checkTables();
