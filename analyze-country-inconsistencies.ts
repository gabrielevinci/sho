/**
 * Analisi delle inconsistenze nel campo country
 */

import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function analyzeCountryInconsistencies() {
  try {
    console.log('🔍 Analisi inconsistenze nel campo country...\n');
    
    // Trova tutti i valori country distinti
    const countries = await sql`
      SELECT country, COUNT(*) as count
      FROM clicks 
      WHERE country IS NOT NULL AND country != 'Unknown'
      GROUP BY country
      ORDER BY count DESC
    `;
    
    console.log('📊 Valori country trovati:');
    countries.rows.forEach((row, i) => {
      const isCode = /^[A-Z]{2}$/.test(row.country);
      const flag = isCode ? '🔤' : '🌍';
      console.log(`${i+1}. ${flag} ${row.country} - ${row.count} occorrenze`);
    });
    
    // Identifica codici paese vs nomi completi
    const countryCodes = countries.rows.filter(row => /^[A-Z]{2}$/.test(row.country));
    const countryNames = countries.rows.filter(row => !/^[A-Z]{2}$/.test(row.country) && row.country.length > 3);
    
    console.log(`\n📋 Riepilogo:`);
    console.log(`   🔤 Codici paese (2 lettere): ${countryCodes.length}`);
    console.log(`   🌍 Nomi completi: ${countryNames.length}`);
    
    if (countryCodes.length > 0) {
      console.log(`\n🔤 Codici paese da convertire:`);
      countryCodes.forEach((row, i) => {
        console.log(`   ${i+1}. ${row.country} - ${row.count} occorrenze`);
      });
    }
    
    // Mostra esempi di possibili duplicati
    console.log(`\n🔍 Possibili duplicati (stesso paese, formati diversi):`);
    const possibleDuplicates = [
      { code: 'US', names: ['United States', 'USA'] },
      { code: 'IT', names: ['Italy', 'Italia'] },
      { code: 'GB', names: ['United Kingdom', 'UK'] },
      { code: 'DE', names: ['Germany', 'Deutschland'] },
      { code: 'FR', names: ['France', 'Francia'] },
      { code: 'ES', names: ['Spain', 'España'] },
      { code: 'JP', names: ['Japan', 'Giappone'] },
      { code: 'CN', names: ['China', 'Cina'] },
      { code: 'BR', names: ['Brazil', 'Brasile'] },
      { code: 'AU', names: ['Australia'] }
    ];
    
    for (const duplicate of possibleDuplicates) {
      const foundCode = countries.rows.find(r => r.country === duplicate.code);
      const foundNames = countries.rows.filter(r => duplicate.names.includes(r.country));
      
      if (foundCode && foundNames.length > 0) {
        console.log(`   ⚠️ ${duplicate.code}: `);
        console.log(`      - Codice: ${foundCode.count} occorrenze`);
        foundNames.forEach(name => {
          console.log(`      - ${name.country}: ${name.count} occorrenze`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

analyzeCountryInconsistencies();
