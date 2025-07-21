import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testDatabase() {
  try {
    console.log('🔍 Controllo ultimi click nel database...\n');
    
    const recentClicks = await sql`
      SELECT id, country, region, city, clicked_at_rome, source_type
      FROM clicks 
      ORDER BY clicked_at_rome DESC 
      LIMIT 10
    `;
    
    console.log('📊 Ultimi 10 click:');
    recentClicks.rows.forEach((row, i) => {
      const date = new Date(row.clicked_at_rome).toLocaleString('it-IT');
      console.log(`${i+1}. ID: ${row.id} | ${row.country} | ${row.region} | ${row.city} | ${date} | ${row.source_type || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
  process.exit(0);
}

testDatabase();
