require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

// Utilizziamo lo shortCode che abbiamo trovato
const shortCode = 'CIIhbJv';

async function testDatabaseQueries() {
  try {
    console.log(`Test delle query SQL dirette per shortCode: ${shortCode}`);
    
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
    
    // 1. Recupera il conteggio totale dei click
    const totalClicksResult = await sql`
      SELECT COUNT(*) as total FROM clicks 
      WHERE link_id = ${linkId} 
      AND clicked_at_rome >= ${startDateISO} 
      AND clicked_at_rome <= ${endDateISO}
    `;
    
    const totalClicks = parseInt(totalClicksResult.rows[0].total);
    console.log(`Totale click: ${totalClicks}`);
    
    // 2. Test della query per le città
    console.log('\n=== TEST QUERY CITTÀ ===');
    
    // 2.1 Query città originale
    console.log('Esecuzione query città originale...');
    const originalCityResult = await sql`
      SELECT 
        COALESCE(NULLIF(city, ''), 'Unknown') as city,
        COUNT(*) as count
      FROM clicks 
      WHERE link_id = ${linkId} 
        AND clicked_at_rome >= ${startDateISO} 
        AND clicked_at_rome <= ${endDateISO}
      GROUP BY COALESCE(NULLIF(city, ''), 'Unknown')
      ORDER BY count DESC 
      LIMIT 15
    `;
    
    let originalCityTotal = 0;
    console.log('Risultati query città originale:');
    originalCityResult.rows.forEach(row => {
      console.log(`${row.city}: ${row.count} click`);
      originalCityTotal += parseInt(row.count);
    });
    console.log(`Totale click città (originale): ${originalCityTotal}`);
    
    // 2.2 Query città migliorata con CTE
    console.log('\nEsecuzione query città migliorata con CTE...');
    const improvedCityResult = await sql`
      WITH normalized_cities AS (
        SELECT 
          link_id,
          clicked_at_rome,
          CASE 
            -- Decodifica città specifiche trovate nel database
            WHEN city = 'Council%20Bluffs' THEN 'Council Bluffs'
            WHEN city = 'Frankfurt%20am%20Main' THEN 'Frankfurt am Main'
            WHEN city = 'Los%20Angeles' THEN 'Los Angeles'
            WHEN city = 'Los%20Lunas' THEN 'Los Lunas'
            WHEN city = 'Lule%C3%A5' THEN 'Luleå'
            WHEN city = 'S%C3%A3o%20Paulo' THEN 'São Paulo'
            WHEN city = 'San%20Jose' THEN 'San Jose'
            WHEN city = 'Santa%20Clara' THEN 'Santa Clara'
            -- Per altre città con encoding generico
            WHEN COALESCE(city, '') LIKE '%20%' OR COALESCE(city, '') LIKE '%C3%' THEN 
              REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                COALESCE(NULLIF(city, ''), 'Unknown'),
                '%20', ' '),
                '%C3%A5', 'å'),
                '%C3%A4', 'ä'),
                '%C3%B6', 'ö'),
                '%C3%A9', 'é'),
                '%C3%A8', 'è'),
                '%C3%A0', 'à'),
                '%C3%B1', 'ñ'),
                '%C3%A7', 'ç'),
                '%C3%BC', 'ü'),
                '%C3%A3', 'ã')
            ELSE COALESCE(NULLIF(city, ''), 'Unknown')
          END as normalized_city,
          click_fingerprint_hash,
          ip_address,
          user_agent
        FROM clicks 
        WHERE link_id = ${linkId} 
          AND clicked_at_rome >= ${startDateISO} 
          AND clicked_at_rome <= ${endDateISO}
      )
      SELECT 
        normalized_city as city,
        COUNT(*) as count
      FROM normalized_cities
      GROUP BY normalized_city
      ORDER BY count DESC 
      LIMIT 15
    `;
    
    let improvedCityTotal = 0;
    console.log('Risultati query città migliorata:');
    improvedCityResult.rows.forEach(row => {
      console.log(`${row.city}: ${row.count} click`);
      improvedCityTotal += parseInt(row.count);
    });
    console.log(`Totale click città (migliorata): ${improvedCityTotal}`);
    
    // 3. Test della query per i browser
    console.log('\n=== TEST QUERY BROWSER ===');
    
    // 3.1 Query browser originale
    console.log('Esecuzione query browser originale...');
    const originalBrowserResult = await sql`
      SELECT 
        COALESCE(NULLIF(browser_name, ''), 'Sconosciuto') as browser, 
        COUNT(*) as count
      FROM clicks 
      WHERE link_id = ${linkId} 
        AND clicked_at_rome >= ${startDateISO} 
        AND clicked_at_rome <= ${endDateISO}
      GROUP BY COALESCE(NULLIF(browser_name, ''), 'Sconosciuto')
      ORDER BY count DESC 
      LIMIT 15
    `;
    
    let originalBrowserTotal = 0;
    console.log('Risultati query browser originale:');
    originalBrowserResult.rows.forEach(row => {
      console.log(`${row.browser}: ${row.count} click`);
      originalBrowserTotal += parseInt(row.count);
    });
    console.log(`Totale click browser (originale): ${originalBrowserTotal}`);
    
    // 3.2 Query browser migliorata con normalizzazione
    console.log('\nEsecuzione query browser migliorata con normalizzazione...');
    const improvedBrowserResult = await sql`
      SELECT 
        CASE 
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%chrome%' THEN 'Chrome'
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%firefox%' THEN 'Firefox'
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%safari%' THEN 'Safari'
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%edge%' THEN 'Microsoft Edge'
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%opera%' THEN 'Opera'
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%samsung%' THEN 'Samsung Internet'
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%brave%' THEN 'Brave'
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%vivaldi%' THEN 'Vivaldi'
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%tor%' THEN 'Tor Browser'
          ELSE COALESCE(NULLIF(browser_name, ''), 'Sconosciuto')
        END as browser, 
        COUNT(*) as count
      FROM clicks 
      WHERE link_id = ${linkId} 
        AND clicked_at_rome >= ${startDateISO} 
        AND clicked_at_rome <= ${endDateISO}
      GROUP BY 
        CASE 
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%chrome%' THEN 'Chrome'
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%firefox%' THEN 'Firefox'
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%safari%' THEN 'Safari'
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%edge%' THEN 'Microsoft Edge'
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%opera%' THEN 'Opera'
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%samsung%' THEN 'Samsung Internet'
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%brave%' THEN 'Brave'
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%vivaldi%' THEN 'Vivaldi'
          WHEN LOWER(COALESCE(browser_name, '')) LIKE '%tor%' THEN 'Tor Browser'
          ELSE COALESCE(NULLIF(browser_name, ''), 'Sconosciuto')
        END
      ORDER BY count DESC 
      LIMIT 15
    `;
    
    let improvedBrowserTotal = 0;
    console.log('Risultati query browser migliorata:');
    improvedBrowserResult.rows.forEach(row => {
      console.log(`${row.browser}: ${row.count} click`);
      improvedBrowserTotal += parseInt(row.count);
    });
    console.log(`Totale click browser (migliorata): ${improvedBrowserTotal}`);
    
    // Verifica dei risultati
    console.log('\n=== RIEPILOGO RISULTATI ===');
    console.log(`Totale click: ${totalClicks}`);
    console.log(`Totale click città (originale): ${originalCityTotal}`);
    console.log(`Totale click città (migliorata): ${improvedCityTotal}`);
    console.log(`Totale click browser (originale): ${originalBrowserTotal}`);
    console.log(`Totale click browser (migliorata): ${improvedBrowserTotal}`);
    
    // Controlla se ci sono valori null nel database che potrebbero causare problemi
    console.log('\n=== VERIFICA DATI MANCANTI ===');
    
    const nullCityResult = await sql`
      SELECT COUNT(*) as count FROM clicks 
      WHERE link_id = ${linkId} 
        AND clicked_at_rome >= ${startDateISO} 
        AND clicked_at_rome <= ${endDateISO}
        AND (city IS NULL OR city = '')
    `;
    console.log(`Click con città NULL o vuota: ${nullCityResult.rows[0].count}`);
    
    const nullBrowserResult = await sql`
      SELECT COUNT(*) as count FROM clicks 
      WHERE link_id = ${linkId} 
        AND clicked_at_rome >= ${startDateISO} 
        AND clicked_at_rome <= ${endDateISO}
        AND (browser_name IS NULL OR browser_name = '')
    `;
    console.log(`Click con browser NULL o vuoto: ${nullBrowserResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Errore durante il test delle query:', error);
  } finally {
    process.exit();
  }
}

testDatabaseQueries();
