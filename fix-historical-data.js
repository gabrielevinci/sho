const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

// Funzioni di normalizzazione (ricopiate da database-helpers.ts)
function normalizeCountryName(countryCode) {
  const countryMap = {
    'US': 'United States',
    'IT': 'Italy',
    'GB': 'United Kingdom',
    'DE': 'Germany', 
    'FR': 'France',
    'ES': 'Spain',
    'CA': 'Canada',
    'AU': 'Australia',
    'JP': 'Japan',
    'CN': 'China',
    'IN': 'India',
    'BR': 'Brazil',
    'MX': 'Mexico',
    'RU': 'Russia',
    'KR': 'South Korea',
    'NL': 'Netherlands',
    'CH': 'Switzerland',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'BE': 'Belgium',
    'AT': 'Austria',
    'IE': 'Ireland',
    'PT': 'Portugal',
    'GR': 'Greece',
    'PL': 'Poland',
    'CZ': 'Czech Republic',
    'HU': 'Hungary',
    'RO': 'Romania',
    'BG': 'Bulgaria',
    'HR': 'Croatia',
    'SI': 'Slovenia',
    'SK': 'Slovakia',
    'LT': 'Lithuania',
    'LV': 'Latvia',
    'EE': 'Estonia',
    'MT': 'Malta',
    'CY': 'Cyprus',
    'LU': 'Luxembourg',
    'TR': 'Turkey',
    'IL': 'Israel',
    'SA': 'Saudi Arabia',
    'AE': 'United Arab Emirates',
    'EG': 'Egypt',
    'ZA': 'South Africa',
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
    'NZ': 'New Zealand'
  };

  return countryMap[countryCode] || countryCode;
}

function normalizeRegionName(regionCode, countryCode) {
  // Mappa per le regioni italiane
  const italianRegions = {
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
    '21': 'Trentino-Alto Adige',
    '34': 'Veneto',
    '36': 'Friuli-Venezia Giulia',
    '42': 'Liguria',
    '45': 'Emilia-Romagna',
    '52': 'Toscana',
    '55': 'Umbria',
    '57': 'Marche',
    '62': 'Lazio',
    '65': 'Abruzzo',
    '67': 'Molise',
    '72': 'Campania',
    '75': 'Puglia',
    '77': 'Basilicata',
    '78': 'Calabria',
    '82': 'Sicilia',
    '88': 'Sardegna'
  };

  // Stati americani
  const usStates = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
  };

  // Regioni polacche (voivodati)
  const polishRegions = {
    '02': 'Lower Silesian Voivodeship',
    '04': 'Kuyavian-Pomeranian Voivodeship', 
    '06': 'Lublin Voivodeship',
    '08': 'Lubusz Voivodeship',
    '10': 'Łódź Voivodeship',
    '12': 'Lesser Poland Voivodeship',
    '14': 'Masovian Voivodeship',
    '16': 'Opole Voivodeship',
    '18': 'Subcarpathian Voivodeship',
    '20': 'Podlaskie Voivodeship',
    '22': 'Pomeranian Voivodeship',
    '24': 'Silesian Voivodeship',
    '26': 'Świętokrzyskie Voivodeship',
    '28': 'Warmian-Masurian Voivodeship',
    '30': 'Greater Poland Voivodeship',
    '32': 'West Pomeranian Voivodeship'
  };

  // Se è un numero e il paese è Italia, usa la mappa italiana
  if (/^\d+$/.test(regionCode) && countryCode === 'IT') {
    return italianRegions[regionCode.padStart(2, '0')] || regionCode;
  }

  // Se è un numero e il paese è Polonia, usa la mappa polacca
  if (/^\d+$/.test(regionCode) && countryCode === 'Poland') {
    return polishRegions[regionCode.padStart(2, '0')] || regionCode;
  }

  // Se è un codice di stato USA
  if (countryCode === 'US' && usStates[regionCode]) {
    return usStates[regionCode];
  }

  // Se è un numero generico per qualsiasi paese, prova a convertirlo in "Unknown"
  // per evitare di mostrare numeri agli utenti
  if (/^\d+$/.test(regionCode)) {
    return 'Unknown Region';
  }

  return regionCode;
}

async function analyzeAndFixData() {
  try {
    console.log('🔍 Analisi dei dati attuali...\n');
    
    // 1. Trova tutti i record con problemi
    const problemRecords = await sql`
      SELECT id, country, region, city, clicked_at_rome
      FROM clicks 
      WHERE country ~ '^[A-Z]{2}$' OR region ~ '^[0-9]+$'
      ORDER BY clicked_at_rome DESC
    `;
    
    console.log(`⚠️ Trovati ${problemRecords.rows.length} record con problemi`);
    
    if (problemRecords.rows.length === 0) {
      console.log('✅ Nessun record problematico trovato!');
      return;
    }

    // 2. Mostra esempi dei problemi
    console.log('\n📋 Esempi di record problematici:');
    problemRecords.rows.slice(0, 10).forEach((row, i) => {
      console.log(`${i+1}. ID: ${row.id} | Paese: ${row.country} | Regione: ${row.region} | Città: ${row.city}`);
    });

    // 3. Chiedi conferma prima di procedere
    console.log(`\n🔧 Vuoi correggere questi ${problemRecords.rows.length} record? (Scrivi 'SI' per confermare)`);
    
    // Simuliamo la conferma per ora
    const confirm = 'SI';
    
    if (confirm === 'SI') {
      console.log('\n🚀 Inizio correzione...\n');
      
      let corrected = 0;
      
      for (const record of problemRecords.rows) {
        const originalCountry = record.country;
        const originalRegion = record.region;
        
        // Normalizza il paese
        const normalizedCountry = normalizeCountryName(originalCountry);
        
        // Normalizza la regione
        const normalizedRegion = normalizeRegionName(originalRegion, originalCountry);
        
        // Aggiorna solo se sono cambiati
        if (normalizedCountry !== originalCountry || normalizedRegion !== originalRegion) {
          await sql`
            UPDATE clicks 
            SET country = ${normalizedCountry}, region = ${normalizedRegion}
            WHERE id = ${record.id}
          `;
          
          corrected++;
          console.log(`✅ Corretto ID ${record.id}: ${originalCountry} → ${normalizedCountry}, ${originalRegion} → ${normalizedRegion}`);
        }
      }
      
      console.log(`\n🎉 Correzione completata! ${corrected} record aggiornati.`);
      
      // 4. Verifica finale
      const remainingProblems = await sql`
        SELECT COUNT(*) as count
        FROM clicks 
        WHERE country ~ '^[A-Z]{2}$' OR region ~ '^[0-9]+$'
      `;
      
      console.log(`\n📊 Record problematici rimanenti: ${remainingProblems.rows[0].count}`);
      
    } else {
      console.log('❌ Correzione annullata.');
    }
    
  } catch (error) {
    console.error('❌ Errore durante l\'analisi:', error);
  }
}

analyzeAndFixData().then(() => {
  console.log('\n✅ Script completato!');
  process.exit(0);
});
