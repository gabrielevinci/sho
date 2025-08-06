require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

// Utilizziamo lo shortCode che abbiamo trovato
const shortCode = 'CIIhbJv';

async function checkAllCities() {
  try {
    console.log(`Controllo di tutte le città per shortCode: ${shortCode}`);
    
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
    
    // Otteniamo tutti i valori di città dal database
    const allCitiesResult = await sql`
      SELECT city, COUNT(*) as count
      FROM clicks
      WHERE link_id = ${linkId}
        AND clicked_at_rome >= ${startDateISO}
        AND clicked_at_rome <= ${endDateISO}
      GROUP BY city
      ORDER BY count DESC
    `;
    
    console.log('\n=== TUTTE LE CITTÀ NEL DATABASE ===');
    let totalCount = 0;
    allCitiesResult.rows.forEach(row => {
      console.log(`"${row.city}": ${row.count} click`);
      totalCount += parseInt(row.count);
    });
    console.log(`Totale click: ${totalCount}`);
    
    // Otteniamo anche tutte le città con '%' per identificare quelle con URL encoding
    const encodedCitiesResult = await sql`
      SELECT city, COUNT(*) as count
      FROM clicks
      WHERE link_id = ${linkId}
        AND clicked_at_rome >= ${startDateISO}
        AND clicked_at_rome <= ${endDateISO}
        AND city LIKE '%\\%%'
      GROUP BY city
      ORDER BY count DESC
    `;
    
    console.log('\n=== CITTÀ CON URL ENCODING ===');
    if (encodedCitiesResult.rows.length === 0) {
      console.log('Nessuna città con URL encoding trovata.');
    } else {
      encodedCitiesResult.rows.forEach(row => {
        console.log(`"${row.city}": ${row.count} click`);
      });
    }
    
    // Otteniamo un elenco completo di tutti i record con città e browser
    console.log('\n=== DETTAGLI COMPLETI DEI CLICK ===');
    const clicksResult = await sql`
      SELECT 
        id, 
        city, 
        browser_name,
        device_type,
        ip_address,
        user_agent,
        clicked_at_rome
      FROM clicks 
      WHERE link_id = ${linkId} 
        AND clicked_at_rome >= ${startDateISO} 
        AND clicked_at_rome <= ${endDateISO}
      ORDER BY clicked_at_rome DESC
    `;
    
    console.log(`Totale record: ${clicksResult.rows.length}`);
    
    // Conteggio manuale delle città per verificare il problema
    const cityCounter = {};
    clicksResult.rows.forEach(click => {
      const city = click.city || 'Unknown';
      if (!cityCounter[city]) {
        cityCounter[city] = { count: 0, records: [] };
      }
      cityCounter[city].count++;
      if (cityCounter[city].records.length < 3) { // Solo i primi 3 record per ogni città
        cityCounter[city].records.push({
          id: click.id,
          browser: click.browser_name,
          device: click.device_type
        });
      }
    });
    
    console.log('\n=== CONTEGGIO MANUALE DELLE CITTÀ ===');
    let manualTotal = 0;
    for (const city in cityCounter) {
      console.log(`"${city}": ${cityCounter[city].count} click`);
      manualTotal += cityCounter[city].count;
      
      // Mostra alcuni record di esempio per ogni città
      if (cityCounter[city].records.length > 0) {
        console.log('  Esempi:');
        cityCounter[city].records.forEach(record => {
          console.log(`    ID: ${record.id}, Browser: ${record.browser}, Device: ${record.device}`);
        });
      }
    }
    console.log(`Totale click (conteggio manuale): ${manualTotal}`);
    
  } catch (error) {
    console.error('Errore durante il controllo delle città:', error);
  } finally {
    process.exit();
  }
}

checkAllCities();
