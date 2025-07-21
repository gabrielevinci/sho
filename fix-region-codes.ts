/**
 * Script per correggere i codici regionali numerici nel database
 * Converte i codici come "82", "62" in nomi leggibili come "Sicilia", "Lazio"
 */

import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config({ path: '.env.local' });

// Mappa dei codici regione numerici italiani ai nomi leggibili
const ITALIAN_REGION_CODES: { [key: string]: string } = {
  '01': 'Piemonte',
  '02': 'Valle d\'Aosta',
  '03': 'Lombardia',
  '04': 'Trentino-Alto Adige',
  '05': 'Veneto',
  '06': 'Friuli-Venezia Giulia',
  '07': 'Liguria',
  '08': 'Emilia-Romagna',
  '09': 'Toscana',
  '10': 'Umbria',
  '11': 'Marche',
  '12': 'Lazio',
  '13': 'Abruzzo',
  '14': 'Molise',
  '15': 'Campania',
  '16': 'Puglia',
  '17': 'Basilicata',
  '18': 'Calabria',
  '19': 'Sicilia',
  '20': 'Sardegna',
  '62': 'Lazio',       // Roma - codice specifico
  '82': 'Sicilia',     // Palermo - codice specifico
  '67': 'Campania',    // Napoli - codice comune
  '25': 'Lombardia',   // Milano - codice comune
  '45': 'Emilia-Romagna', // Bologna - codice comune
  '50': 'Toscana',     // Firenze - codice comune
  '80': 'Piemonte'     // Torino - codice comune
};

// Mappa dei codici regione per altri paesi comuni
const REGION_CODE_MAPPINGS: { [country: string]: { [code: string]: string } } = {
  'US': {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
  },
  'GB': {
    'ENG': 'England',
    'SCT': 'Scotland', 
    'WLS': 'Wales',
    'NIR': 'Northern Ireland'
  },
  'AU': {
    'NSW': 'New South Wales',
    'VIC': 'Victoria',
    'QLD': 'Queensland',
    'WA': 'Western Australia',
    'SA': 'South Australia',
    'TAS': 'Tasmania',
    'ACT': 'Australian Capital Territory',
    'NT': 'Northern Territory'
  },
  'BR': {
    'SP': 'São Paulo',
    'RJ': 'Rio de Janeiro',
    'MG': 'Minas Gerais',
    'BA': 'Bahia',
    'PR': 'Paraná',
    'RS': 'Rio Grande do Sul',
    'PE': 'Pernambuco',
    'CE': 'Ceará',
    'PA': 'Pará',
    'SC': 'Santa Catarina'
  },
  'JP': {
    '13': 'Tokyo',
    '14': 'Kanagawa',
    '27': 'Osaka',
    '23': 'Aichi',
    '01': 'Hokkaido',
    '40': 'Fukuoka',
    '28': 'Hyogo',
    '11': 'Saitama',
    '12': 'Chiba',
    '26': 'Kyoto'
  }
};

function normalizeRegionName(region: string, countryCode: string): string {
  if (!region || region === 'Unknown') {
    return 'Unknown';
  }
  
  // Se è già un nome completo (contiene lettere minuscole o spazi), restituiscilo così com'è
  if (/[a-z\s]/.test(region) && region.length > 3) {
    return region;
  }
  
  // Controllo per codici regionali italiani
  if (countryCode === 'IT' && ITALIAN_REGION_CODES[region]) {
    return ITALIAN_REGION_CODES[region];
  }
  
  // Controllo per altri paesi
  if (REGION_CODE_MAPPINGS[countryCode] && REGION_CODE_MAPPINGS[countryCode][region]) {
    return REGION_CODE_MAPPINGS[countryCode][region];
  }
  
  return region;
}

async function fixRegionCodes() {
  try {
    console.log('🔧 Inizio correzione dei codici regionali nel database...\n');
    
    // Prima, vediamo quanti record hanno codici da correggere
    const problemRegions = await sql`
      SELECT DISTINCT region, country, COUNT(*) as count
      FROM clicks 
      WHERE region IS NOT NULL 
      AND region != 'Unknown'
      AND (
        region ~ '^[0-9]+$'  -- Solo numeri
        OR region ~ '^[A-Z]{2,3}$'  -- Codici maiuscoli 2-3 caratteri
      )
      GROUP BY region, country
      ORDER BY count DESC
    `;
    
    console.log('📊 Codici regionali da correggere:');
    problemRegions.rows.forEach((row, i) => {
      const normalized = normalizeRegionName(row.region, row.country);
      const changed = normalized !== row.region;
      console.log(`${i+1}. "${row.region}" (${row.country}) → "${normalized}" | ${row.count} occorrenze ${changed ? '✅' : '➖'}`);
    });
    
    if (problemRegions.rows.length === 0) {
      console.log('✅ Nessun codice regionale da correggere trovato!');
      return;
    }
    
    console.log(`\n🚀 Procedo con la correzione di ${problemRegions.rows.length} codici regionali...\n`);
    
    let totalUpdated = 0;
    
    // Correggi ogni tipo di codice regionale
    for (const problemRegion of problemRegions.rows) {
      const oldRegion = problemRegion.region;
      const country = problemRegion.country;
      const newRegion = normalizeRegionName(oldRegion, country);
      
      // Se la normalizzazione ha prodotto un cambiamento
      if (newRegion !== oldRegion) {
        console.log(`🔄 Aggiornamento: "${oldRegion}" → "${newRegion}" per paese ${country}`);
        
        const result = await sql`
          UPDATE clicks 
          SET region = ${newRegion}
          WHERE region = ${oldRegion} AND country = ${country}
        `;
        
        console.log(`   ✅ Aggiornati ${result.rowCount} record`);
        totalUpdated += result.rowCount || 0;
      } else {
        console.log(`   ➖ Nessun cambiamento per "${oldRegion}" (${country})`);
      }
    }
    
    console.log(`\n🎉 Correzione completata!`);
    console.log(`📊 Totale record aggiornati: ${totalUpdated}`);
    
    // Verifica finale
    console.log('\n🔍 Verifica finale - regioni rimaste dopo la correzione:');
    const remainingIssues = await sql`
      SELECT DISTINCT region, country, COUNT(*) as count
      FROM clicks 
      WHERE region IS NOT NULL 
      AND region != 'Unknown'
      AND region ~ '^[0-9]+$'  -- Solo numeri rimasti
      GROUP BY region, country
      ORDER BY count DESC
      LIMIT 10
    `;
    
    if (remainingIssues.rows.length === 0) {
      console.log('✅ Nessun codice numerico rimasto!');
    } else {
      console.log('⚠️ Codici numerici non mappati rimasti:');
      remainingIssues.rows.forEach((row, i) => {
        console.log(`${i+1}. "${row.region}" (${row.country}) - ${row.count} occorrenze`);
      });
    }
    
  } catch (error) {
    console.error('❌ Errore durante la correzione:', error);
  }
}

// Esegui la correzione
fixRegionCodes();
