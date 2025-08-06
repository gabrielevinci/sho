const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function findValidShortCode() {
  try {
    console.log('🔍 Cerco shortCode validi nel database...\n');
    
    // Trova i link con più click
    const links = await sql`
      SELECT l.short_code, l.id, l.title, COUNT(c.id) as click_count
      FROM links l
      LEFT JOIN clicks c ON l.id = c.link_id
      GROUP BY l.id, l.short_code, l.title
      ORDER BY click_count DESC
      LIMIT 5
    `;
    
    console.log('=== LINK CON PIÙ CLICK ===');
    links.rows.forEach((link, i) => {
      console.log(`${i+1}. shortCode: "${link.short_code}" (ID: ${link.id}) - ${link.click_count} click - "${link.title || 'Senza titolo'}"`);
    });
    
    if (links.rows.length > 0) {
      const topLink = links.rows[0];
      console.log(`\n✅ Useremo shortCode: "${topLink.short_code}" per i test`);
      return topLink.short_code;
    } else {
      console.log('❌ Nessun link trovato nel database');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Errore durante la ricerca:', error);
    return null;
  }
}

findValidShortCode().then(shortCode => {
  if (shortCode) {
    console.log(`\nUsa questo shortCode per i test: ${shortCode}`);
  }
  process.exit(0);
});
