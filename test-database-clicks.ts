/**
 * Test del sistema di tracking dei click con database reale
 */

import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config({ path: '.env.local' });

async function testClicksInDatabase() {
  try {
    console.log('🔍 Controllo click recenti nel database...\n');
    
    // Ottieni gli ultimi 10 click con tutte le informazioni
    const recentClicks = await sql`
      SELECT 
        c.id,
        c.clicked_at_rome,
        c.country,
        c.region,
        c.city,
        c.browser_name,
        c.os_name,
        c.device_type,
        c.language_device,
        c.ip_address,
        l.short_code,
        l.original_url
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      ORDER BY c.clicked_at_rome DESC
      LIMIT 10
    `;
    
    if (recentClicks.rows.length === 0) {
      console.log('📭 Nessun click trovato nel database');
      console.log('💡 Prova a cliccare su un link per testare il sistema');
      return;
    }
    
    console.log(`✅ Trovati ${recentClicks.rows.length} click recenti:\n`);
    
    recentClicks.rows.forEach((click, index) => {
      console.log(`--- Click #${index + 1} ---`);
      console.log(`🔗 Link: ${click.short_code} → ${click.original_url}`);
      console.log(`📅 Data: ${new Date(click.clicked_at_rome).toLocaleString('it-IT')}`);
      console.log(`🌍 Posizione: ${click.city}, ${click.region}, ${click.country}`);
      console.log(`🌐 Browser: ${click.browser_name} su ${click.os_name}`);
      console.log(`📱 Dispositivo: ${click.device_type}`);
      console.log(`🗣️ Lingua: ${click.language_device}`);
      console.log(`🔢 IP: ${click.ip_address}`);
      console.log('');
    });
    
    // Statistiche sui paesi
    console.log('📊 Statistiche per paese:');
    const countryStats = await sql`
      SELECT country, COUNT(*) as count 
      FROM clicks 
      WHERE clicked_at_rome >= NOW() - INTERVAL '7 days'
      AND country IS NOT NULL 
      AND country != 'Unknown'
      GROUP BY country 
      ORDER BY count DESC 
      LIMIT 5
    `;
    
    countryStats.rows.forEach(stat => {
      console.log(`   ${stat.country}: ${stat.count} click`);
    });
    
    // Statistiche sui browser
    console.log('\n🌐 Statistiche per browser:');
    const browserStats = await sql`
      SELECT browser_name, COUNT(*) as count 
      FROM clicks 
      WHERE clicked_at_rome >= NOW() - INTERVAL '7 days'
      AND browser_name IS NOT NULL 
      AND browser_name != 'Unknown'
      GROUP BY browser_name 
      ORDER BY count DESC 
      LIMIT 5
    `;
    
    browserStats.rows.forEach(stat => {
      console.log(`   ${stat.browser_name}: ${stat.count} click`);
    });
    
    // Verifica geolocalizzazione
    console.log('\n🌍 Verifica geolocalizzazione:');
    const geoStats = await sql`
      SELECT 
        COUNT(*) as total_clicks,
        COUNT(CASE WHEN country IS NOT NULL AND country != 'Unknown' THEN 1 END) as geo_clicks,
        ROUND(
          COUNT(CASE WHEN country IS NOT NULL AND country != 'Unknown' THEN 1 END) * 100.0 / COUNT(*), 
          1
        ) as geo_percentage
      FROM clicks 
      WHERE clicked_at_rome >= NOW() - INTERVAL '7 days'
    `;
    
    const geoStat = geoStats.rows[0];
    console.log(`   📊 Click totali: ${geoStat.total_clicks}`);
    console.log(`   🌍 Con geolocalizzazione: ${geoStat.geo_clicks} (${geoStat.geo_percentage}%)`);
    
  } catch (error) {
    console.error('❌ Errore nel test del database:', error);
  }
}

// Esegui il test
testClicksInDatabase();
