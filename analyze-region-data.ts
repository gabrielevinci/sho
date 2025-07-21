/**
 * Analisi dei dati region nel database per identificare valori numerici
 */

import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config({ path: '.env.local' });

async function analyzeRegionData() {
  try {
    console.log('🔍 Analisi dei dati region nel database...\n');
    
    // Controllo esempi di region nel database
    const regionExamples = await sql`
      SELECT DISTINCT region, country, city, COUNT(*) as count
      FROM clicks 
      WHERE region IS NOT NULL AND region != 'Unknown'
      GROUP BY region, country, city
      ORDER BY count DESC
      LIMIT 20
    `;
    
    console.log('📊 Esempi di valori region trovati:');
    regionExamples.rows.forEach((row, i) => {
      console.log(`${i+1}. Region: '${row.region}' | Country: ${row.country} | City: ${row.city} | Occorrenze: ${row.count}`);
    });
    
    // Controllo specifico per numeri
    const numericRegions = await sql`
      SELECT region, country, city, COUNT(*) as count
      FROM clicks 
      WHERE region ~ '^[0-9]+$'
      GROUP BY region, country, city
      ORDER BY count DESC
      LIMIT 10
    `;
    
    console.log('\n🔢 Regioni con valori numerici:');
    if (numericRegions.rows.length > 0) {
      numericRegions.rows.forEach((row, i) => {
        console.log(`${i+1}. Region: '${row.region}' | Country: ${row.country} | City: ${row.city} | Occorrenze: ${row.count}`);
      });
    } else {
      console.log('   Nessuna regione numerica trovata');
    }
    
    // Test di una chiamata alla API di geolocalizzazione per vedere i dati raw
    console.log('\n🧪 Test chiamata API geolocalizzazione...');
    
    const testIPs = ['8.8.8.8', '1.1.1.1', '208.67.222.222']; // Google, Cloudflare, OpenDNS
    
    for (const ip of testIPs) {
      try {
        const response = await fetch(`http://ipapi.co/${ip}/json/`, {
          headers: { 'User-Agent': 'ShorterLink/1.0' },
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`IP ${ip}:`);
          console.log(`  Country: ${data.country_name} (${data.country})`);
          console.log(`  Region: ${data.region} (${data.region_code})`);
          console.log(`  City: ${data.city}`);
          console.log('');
        }
      } catch (error) {
        console.log(`❌ Errore per IP ${ip}:`, error instanceof Error ? error.message : 'Errore sconosciuto');
      }
    }
    
  } catch (error) {
    console.error('❌ Errore nell\'analisi:', error);
  }
}

analyzeRegionData();
