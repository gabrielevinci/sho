require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

// Utilizziamo lo shortCode che abbiamo trovato
const shortCode = 'CIIhbJv';

async function findMissingRecords() {
  try {
    console.log(`Ricerca dei record mancanti per shortCode: ${shortCode}`);
    
    // Prima, otteniamo l'ID del link dal shortCode
    const linkResult = await sql`
      SELECT id FROM links WHERE short_code = ${shortCode}
    `;
    
    if (linkResult.rows.length === 0) {
      console.error(`Link non trovato per shortCode: ${shortCode}`);
      return;
    }
    
    const linkId = linkResult.rows[0].id;
    console.log(`ID link trovato: ${linkId}`);
    
    // Imposta date per l'intervallo di un mese
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const endDateISO = end.toISOString();
    
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    start.setHours(0, 0, 0, 0);
    const startDateISO = start.toISOString();
    
    console.log(`Periodo: ${startDateISO} - ${endDateISO}`);
    
    // Otteniamo tutti i record di click
    console.log('Recupero di tutti i record di click...');
    const allClicksResult = await sql`
      SELECT 
        id, 
        city, 
        browser_name,
        device_type,
        clicked_at_rome
      FROM clicks 
      WHERE link_id = ${linkId} 
        AND clicked_at_rome >= ${startDateISO} 
        AND clicked_at_rome <= ${endDateISO}
      ORDER BY clicked_at_rome DESC
    `;
    
    console.log(`Totale record di click: ${allClicksResult.rows.length}`);
    
    // Ottenere tutte le città uniche
    const cities = new Set();
    allClicksResult.rows.forEach(click => {
      cities.add(click.city || 'Unknown');
    });
    
    // Contare i click per ogni città
    const cityCounts = {};
    allClicksResult.rows.forEach(click => {
      const city = click.city || 'Unknown';
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    });
    
    // Ottieni i record mostrati nella query per città
    const cityQueryResult = await sql`
      SELECT 
        COALESCE(NULLIF(city, ''), 'Unknown') as city,
        COUNT(*) as count
      FROM clicks 
      WHERE link_id = ${linkId} 
        AND clicked_at_rome >= ${startDateISO} 
        AND clicked_at_rome <= ${endDateISO}
      GROUP BY COALESCE(NULLIF(city, ''), 'Unknown')
      ORDER BY count DESC 
    `;
    
    // Crea un set di città incluse nella query
    const citiesInQuery = new Set();
    cityQueryResult.rows.forEach(row => {
      citiesInQuery.add(row.city);
    });
    
    // Trova città mancanti confrontando tutti i record con quelli nella query
    console.log('\n=== ANALISI CITTÀ MANCANTI ===');
    let cityCount = 0;
    for (const [city, count] of Object.entries(cityCounts)) {
      console.log(`${city}: ${count} click${citiesInQuery.has(city) ? '' : ' (NON PRESENTE NELLA QUERY)'}`);
      cityCount += count;
    }
    console.log(`\nTotale click città (contati manualmente): ${cityCount}`);
    
    // Analisi avanzata: trova potenziali duplicati di città (URL encoded vs non encoded)
    console.log('\n=== ANALISI POTENZIALI DUPLICATI DI CITTÀ ===');
    const cityNames = Array.from(cities);
    const cityNameMap = new Map();
    
    cityNames.forEach(city => {
      try {
        // Prova a decodificare il nome della città
        let decodedCity = city;
        try {
          while (decodedCity !== decodeURIComponent(decodedCity)) {
            decodedCity = decodeURIComponent(decodedCity);
          }
        } catch (e) {
          // Ignora errori di decodifica
        }
        
        // Decodifiche manuali per città problematiche
        if (city.includes('%20') || city.includes('%C3%')) {
          decodedCity = city
            .replace(/%20/g, ' ')
            .replace(/%C3%A5/g, 'å')
            .replace(/%C3%A4/g, 'ä')
            .replace(/%C3%B6/g, 'ö')
            .replace(/%C3%A9/g, 'é')
            .replace(/%C3%A8/g, 'è')
            .replace(/%C3%A0/g, 'à')
            .replace(/%C3%B1/g, 'ñ')
            .replace(/%C3%A7/g, 'ç')
            .replace(/%C3%BC/g, 'ü')
            .replace(/%C3%A3/g, 'ã')
            .replace(/%C2%B0/g, '°');
        }
        
        // Aggiunge la città alla mappa
        const normalized = decodedCity.toLowerCase().trim();
        if (!cityNameMap.has(normalized)) {
          cityNameMap.set(normalized, []);
        }
        cityNameMap.get(normalized).push({
          original: city,
          decoded: decodedCity,
          count: cityCounts[city]
        });
      } catch (error) {
        console.error(`Errore nell'analizzare la città ${city}:`, error);
      }
    });
    
    // Mostra potenziali duplicati
    for (const [normalized, variants] of cityNameMap.entries()) {
      if (variants.length > 1) {
        console.log(`\nPotenziale duplicato trovato per "${normalized}":`);
        variants.forEach(variant => {
          console.log(`  - "${variant.original}" (${variant.count} click) → decodificato come "${variant.decoded}"`);
        });
      }
    }
    
    // Verifica i dati grezzi per determinare quali record sono problematici
    console.log('\n=== ESEMPI DI RECORD CON POTENZIALI PROBLEMI ===');
    const problematicCities = new Set(['S%C3%A3o%20Paulo', 'Los%20Angeles', 'Los%20Lunas', 'Council%20Bluffs', 'Frankfurt%20am%20Main']);
    
    let foundProblematic = false;
    allClicksResult.rows.forEach(click => {
      if (click.city && (click.city.includes('%') || problematicCities.has(click.city))) {
        console.log(`Record ID: ${click.id}, City: "${click.city}", Browser: "${click.browser_name}", Device: "${click.device_type}"`);
        foundProblematic = true;
      }
    });
    
    if (!foundProblematic) {
      console.log('Nessun record problematico trovato con encoding URL');
    }
    
  } catch (error) {
    console.error('Errore durante la ricerca dei record mancanti:', error);
  } finally {
    process.exit();
  }
}

findMissingRecords();
