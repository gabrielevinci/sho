/**
 * Script per standardizzare i nomi dei paesi nel database
 * Converte codici ISO (US, IT, etc.) in nomi completi (United States, Italy, etc.)
 */

import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config({ path: '.env.local' });

// Mappa completa dei codici ISO paese ai nomi leggibili
const COUNTRY_CODE_TO_NAME: { [code: string]: string } = {
  // Paesi più comuni
  'US': 'United States',
  'IT': 'Italy',
  'GB': 'United Kingdom',
  'DE': 'Germany',
  'FR': 'France',
  'ES': 'Spain',
  'JP': 'Japan',
  'CN': 'China',
  'IN': 'India',
  'BR': 'Brazil',
  'AU': 'Australia',
  'CA': 'Canada',
  'RU': 'Russia',
  'MX': 'Mexico',
  'KR': 'South Korea',
  'NL': 'Netherlands',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'BE': 'Belgium',
  'PT': 'Portugal',
  'PL': 'Poland',
  'CZ': 'Czech Republic',
  'HU': 'Hungary',
  'RO': 'Romania',
  'BG': 'Bulgaria',
  'HR': 'Croatia',
  'SK': 'Slovakia',
  'SI': 'Slovenia',
  'EE': 'Estonia',
  'LV': 'Latvia',
  'LT': 'Lithuania',
  'IE': 'Ireland',
  'IS': 'Iceland',
  'MT': 'Malta',
  'CY': 'Cyprus',
  'LU': 'Luxembourg',
  'TR': 'Turkey',
  'GR': 'Greece',
  'IL': 'Israel',
  'SA': 'Saudi Arabia',
  'AE': 'United Arab Emirates',
  'EG': 'Egypt',
  'ZA': 'South Africa',
  'NG': 'Nigeria',
  'KE': 'Kenya',
  'MA': 'Morocco',
  'TN': 'Tunisia',
  'AR': 'Argentina',
  'CL': 'Chile',
  'CO': 'Colombia',
  'PE': 'Peru',
  'VE': 'Venezuela',
  'UY': 'Uruguay',
  'EC': 'Ecuador',
  'BO': 'Bolivia',
  'PY': 'Paraguay',
  'TH': 'Thailand',
  'VN': 'Vietnam',
  'MY': 'Malaysia',
  'SG': 'Singapore',
  'ID': 'Indonesia',
  'PH': 'Philippines',
  'TW': 'Taiwan',
  'HK': 'Hong Kong',
  'NZ': 'New Zealand',
  'UA': 'Ukraine',
  'BY': 'Belarus',
  'MD': 'Moldova',
  'RS': 'Serbia',
  'BA': 'Bosnia and Herzegovina',
  'ME': 'Montenegro',
  'MK': 'North Macedonia',
  'AL': 'Albania',
  'XK': 'Kosovo',
  'AM': 'Armenia',
  'AZ': 'Azerbaijan',
  'GE': 'Georgia',
  'KZ': 'Kazakhstan',
  'UZ': 'Uzbekistan',
  'KG': 'Kyrgyzstan',
  'TJ': 'Tajikistan',
  'TM': 'Turkmenistan',
  'AF': 'Afghanistan',
  'PK': 'Pakistan',
  'BD': 'Bangladesh',
  'LK': 'Sri Lanka',
  'NP': 'Nepal',
  'BT': 'Bhutan',
  'MV': 'Maldives',
  'MM': 'Myanmar',
  'LA': 'Laos',
  'KH': 'Cambodia',
  'BN': 'Brunei',
  'MO': 'Macau',
  'MN': 'Mongolia',
  'KP': 'North Korea'
};

// Funzione per normalizzare il nome del paese
function normalizeCountryName(country: string): string {
  if (!country || country === 'Unknown') {
    return 'Unknown';
  }
  
  // Se è un codice ISO a 2 lettere, convertilo
  if (country.length === 2 && /^[A-Z]{2}$/.test(country)) {
    return COUNTRY_CODE_TO_NAME[country] || country;
  }
  
  // Se è già un nome completo, restituiscilo così com'è
  return country;
}

async function standardizeCountryNames() {
  try {
    console.log('🌍 Inizio standardizzazione dei nomi dei paesi...\n');
    
    // Prima, analizza tutti i valori country nel database
    const currentCountries = await sql`
      SELECT DISTINCT country, COUNT(*) as count
      FROM clicks 
      WHERE country IS NOT NULL AND country != 'Unknown'
      GROUP BY country
      ORDER BY count DESC
    `;
    
    console.log('📊 Paesi attuali nel database:');
    currentCountries.rows.forEach((row, i) => {
      const normalized = normalizeCountryName(row.country);
      const willChange = normalized !== row.country;
      console.log(`${i+1}. "${row.country}" → "${normalized}" | ${row.count} record ${willChange ? '🔄' : '✅'}`);
    });
    
    // Identifica quali paesi necessitano di standardizzazione
    const needsUpdate = currentCountries.rows.filter(row => {
      const normalized = normalizeCountryName(row.country);
      return normalized !== row.country;
    });
    
    if (needsUpdate.length === 0) {
      console.log('\n✅ Tutti i paesi sono già standardizzati!');
      return;
    }
    
    console.log(`\n🚀 Procedo con la standardizzazione di ${needsUpdate.length} paesi...\n`);
    
    let totalUpdated = 0;
    
    // Aggiorna ogni paese che necessita di standardizzazione
    for (const countryRow of needsUpdate) {
      const oldCountry = countryRow.country;
      const newCountry = normalizeCountryName(oldCountry);
      
      console.log(`🔄 Aggiornamento: "${oldCountry}" → "${newCountry}"`);
      
      const result = await sql`
        UPDATE clicks 
        SET country = ${newCountry}
        WHERE country = ${oldCountry}
      `;
      
      console.log(`   ✅ Aggiornati ${result.rowCount} record`);
      totalUpdated += result.rowCount || 0;
    }
    
    console.log(`\n🎉 Standardizzazione completata!`);
    console.log(`📊 Totale record aggiornati: ${totalUpdated}`);
    
    // Verifica finale - mostra lo stato dopo l'aggiornamento
    console.log('\n🔍 Verifica finale - paesi nel database:');
    const finalCountries = await sql`
      SELECT DISTINCT country, COUNT(*) as count
      FROM clicks 
      WHERE country IS NOT NULL AND country != 'Unknown'
      GROUP BY country
      ORDER BY count DESC
    `;
    
    finalCountries.rows.forEach((row, i) => {
      console.log(`${i+1}. "${row.country}" - ${row.count} record`);
    });
    
    // Controlla se ci sono ancora codici ISO
    const remainingCodes = finalCountries.rows.filter(row => 
      row.country.length === 2 && /^[A-Z]{2}$/.test(row.country)
    );
    
    if (remainingCodes.length === 0) {
      console.log('\n✅ Nessun codice ISO rimasto - tutti i paesi sono ora in formato nome completo!');
    } else {
      console.log('\n⚠️ Codici ISO non mappati rimasti:');
      remainingCodes.forEach((row, i) => {
        console.log(`${i+1}. "${row.country}" - ${row.count} record (non presente nella mappa)`);
      });
    }
    
    // Verifica duplicati risolti
    console.log('\n🔍 Verifica risoluzione duplicati:');
    const duplicateCheck = await sql`
      SELECT country, COUNT(*) as total_count
      FROM clicks 
      WHERE country IN ('United States', 'US')
      GROUP BY country
    `;
    
    if (duplicateCheck.rows.length <= 1) {
      console.log('✅ Duplicati US/United States risolti!');
    } else {
      console.log('⚠️ Potrebbero esserci ancora duplicati da verificare manualmente');
    }
    
  } catch (error) {
    console.error('❌ Errore durante la standardizzazione:', error);
  }
}

// Esegui la standardizzazione
standardizeCountryNames();
