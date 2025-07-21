/**
 * Analisi dei referrer attuali nel database
 */

import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function analyzeCurrentReferrers() {
  try {
    console.log('🔍 Analisi referrer attuali nel database...\n');
    
    const referrers = await sql`
      SELECT referrer, COUNT(*) as count
      FROM clicks 
      WHERE referrer IS NOT NULL
      GROUP BY referrer
      ORDER BY count DESC
      LIMIT 20
    `;
    
    console.log('📊 Referrer attuali:');
    referrers.rows.forEach((row, i) => {
      console.log(`${i+1}. "${row.referrer}" - ${row.count} click`);
    });
    
    console.log('\n🔍 Esempi di URL completi per vedere i parametri:');
    const recentClicks = await sql`
      SELECT referrer, ip_address, user_agent, clicked_at_rome
      FROM clicks 
      ORDER BY clicked_at_rome DESC
      LIMIT 5
    `;
    
    recentClicks.rows.forEach((row, i) => {
      console.log(`${i+1}. Referrer: ${row.referrer}`);
      console.log(`   User-Agent: ${row.user_agent?.substring(0, 80)}...`);
      console.log('');
    });
    
    // Controlla se ci sono già QR codes
    const qrClicks = await sql`
      SELECT COUNT(*) as count
      FROM clicks 
      WHERE referrer LIKE '%qr=%' OR referrer LIKE '%qr=1%'
    `;
    
    console.log(`🔍 Click da QR code già rilevati: ${qrClicks.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

analyzeCurrentReferrers();
