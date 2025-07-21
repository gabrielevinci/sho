/**
 * Analisi delle inconsistenze nei nomi dei paesi nel database
 * Identifica paesi con nomi diversi (es: "US" vs "United States")
 */

import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config({ path: '.env.local' });

async function analyzeCountryInconsistencies() {
  try {
    console.log('🔍 Analisi delle inconsistenze nei nomi dei paesi...\n');
    
    // Ottieni tutti i valori distinti di country con le loro occorrenze
    const countryValues = await sql`
      SELECT country, COUNT(*) as count, 
             array_agg(DISTINCT region) as regions,
             array_agg(DISTINCT city) as cities
      FROM clicks 
      WHERE country IS NOT NULL AND country != 'Unknown'
      GROUP BY country
      ORDER BY count DESC
    `;
    
    console.log('📊 Valori country trovati nel database:');
    countryValues.rows.forEach((row, i) => {
      const cities = row.cities.slice(0, 3).join(', ') + (row.cities.length > 3 ? '...' : '');
      console.log(`${i+1}. "${row.country}" - ${row.count} click (città: ${cities})`);
    });
    
    // Identifica possibili duplicati/inconsistenze
    console.log('\n🔍 Analisi duplicati potenziali:');
    
    const possibleDuplicates = [];
    const countries = countryValues.rows.map(r => ({ name: r.country, count: r.count }));
    
    for (let i = 0; i < countries.length; i++) {
      for (let j = i + 1; j < countries.length; j++) {
        const country1 = countries[i].name;
        const country2 = countries[j].name;
        
        // Controlli per possibili duplicati
        if (
          // Stesso paese con formati diversi (es: US vs United States)
          (country1 === 'US' && country2 === 'United States') ||
          (country1 === 'United States' && country2 === 'US') ||
          (country1 === 'GB' && country2 === 'United Kingdom') ||
          (country1 === 'United Kingdom' && country2 === 'GB') ||
          (country1 === 'IT' && country2 === 'Italy') ||
          (country1 === 'Italy' && country2 === 'IT') ||
          (country1 === 'DE' && country2 === 'Germany') ||
          (country1 === 'Germany' && country2 === 'DE') ||
          (country1 === 'FR' && country2 === 'France') ||
          (country1 === 'France' && country2 === 'FR') ||
          (country1 === 'JP' && country2 === 'Japan') ||
          (country1 === 'Japan' && country2 === 'JP') ||
          (country1 === 'BR' && country2 === 'Brazil') ||
          (country1 === 'Brazil' && country2 === 'BR') ||
          (country1 === 'AU' && country2 === 'Australia') ||
          (country1 === 'Australia' && country2 === 'AU') ||
          (country1 === 'CA' && country2 === 'Canada') ||
          (country1 === 'Canada' && country2 === 'CA')
        ) {
          possibleDuplicates.push({
            country1: { name: country1, count: countries[i].count },
            country2: { name: country2, count: countries[j].count }
          });
        }
      }
    }
    
    if (possibleDuplicates.length > 0) {
      console.log('⚠️ Duplicati identificati:');
      possibleDuplicates.forEach((dup, i) => {
        console.log(`${i+1}. "${dup.country1.name}" (${dup.country1.count}) vs "${dup.country2.name}" (${dup.country2.count})`);
      });
    } else {
      console.log('✅ Nessun duplicato ovvio identificato');
    }
    
    // Controlla i codici paese a 2 lettere
    console.log('\n🔤 Codici paese a 2 lettere:');
    const twLetterCodes = countryValues.rows.filter(row => 
      row.country.length === 2 && /^[A-Z]{2}$/.test(row.country)
    );
    
    if (twLetterCodes.length > 0) {
      twLetterCodes.forEach((row, i) => {
        console.log(`${i+1}. "${row.country}" - ${row.count} click`);
      });
    } else {
      console.log('✅ Nessun codice paese a 2 lettere trovato');
    }
    
  } catch (error) {
    console.error('❌ Errore nell\'analisi:', error);
  }
}

// Esegui l'analisi
analyzeCountryInconsistencies();