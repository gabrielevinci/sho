require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

// Utilizziamo lo shortCode che abbiamo trovato
const shortCode = 'CIIhbJv';

async function testFixedQueries() {
  try {
    console.log(`Test delle query SQL corrette per shortCode: ${shortCode}`);
    
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
    
    // 2. Test nuova query città con completa normalizzazione
    console.log('\n=== TEST NUOVA QUERY CITTÀ ===');
    
    const fixedCityResult = await sql`
      WITH processed_clicks AS (
        SELECT 
          id, 
          link_id,
          clicked_at_rome,
          -- Completa normalizzazione di tutte le città con URL encoding
          CASE 
            WHEN city IS NULL OR city = '' THEN 'Unknown'
            WHEN city LIKE '%\\%%' THEN 
              (
                SELECT REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                    city,
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
                    '%C3%A3', 'ã'),
                    '%C2%B0', '°'),
                    '%2C', ','),
                    '%27', "'"),
                    '%28', '('),
                    '%29', ')'),
                    '%2D', '-'),
                    '%C3%BA', 'ú'),
                    '%C3%B3', 'ó'),
                    '%C3%AD', 'í')
              )
            ELSE city
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
      FROM processed_clicks
      GROUP BY normalized_city
      ORDER BY count DESC 
      LIMIT 15
    `;
    
    let fixedCityTotal = 0;
    console.log('Risultati query città corretta:');
    fixedCityResult.rows.forEach(row => {
      console.log(`${row.city}: ${row.count} click`);
      fixedCityTotal += parseInt(row.count);
    });
    console.log(`Totale click città (corretta): ${fixedCityTotal}`);
    
    // 3. Test nuova query browser con completa normalizzazione
    console.log('\n=== TEST NUOVA QUERY BROWSER ===');
    
    const fixedBrowserResult = await sql`
      WITH normalized_browsers AS (
        SELECT 
          link_id,
          clicked_at_rome,
          CASE 
            -- Chrome e varianti
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%chrome%' THEN 'Chrome'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%chromium%' THEN 'Chrome'
            
            -- Firefox e varianti
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%firefox%' THEN 'Firefox'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%mozilla%' AND LOWER(COALESCE(browser_name, '')) NOT LIKE '%seamonkey%' THEN 'Firefox'
            
            -- Safari e varianti
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%safari%' AND LOWER(COALESCE(browser_name, '')) NOT LIKE '%chrome%' THEN 'Safari'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%apple%' AND LOWER(COALESCE(browser_name, '')) LIKE '%webkit%' THEN 'Safari'
            
            -- Edge e varianti
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%edge%' THEN 'Microsoft Edge'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%edg/%' THEN 'Microsoft Edge'
            
            -- Opera e varianti
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%opera%' OR LOWER(COALESCE(browser_name, '')) LIKE '%opr/%' THEN 'Opera'
            
            -- Browser specifici per mobile e altri browser
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%samsung%' THEN 'Samsung Internet'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%brave%' THEN 'Brave'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%vivaldi%' THEN 'Vivaldi'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%yandex%' THEN 'Yandex Browser'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%ucbrowser%' THEN 'UC Browser'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%seamonkey%' THEN 'SeaMonkey'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%tor%' THEN 'Tor Browser'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%whatsapp%' THEN 'WhatsApp'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%instagram%' THEN 'Instagram'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%facebook%' THEN 'Facebook'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%snapchat%' THEN 'Snapchat'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%telegram%' THEN 'Telegram'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%tiktok%' THEN 'TikTok'
            WHEN LOWER(COALESCE(browser_name, '')) LIKE '%ie%' OR LOWER(COALESCE(browser_name, '')) LIKE '%internet explorer%' THEN 'Internet Explorer'
            
            -- Fallback
            WHEN browser_name IS NULL OR browser_name = '' THEN 'Sconosciuto'
            ELSE 
              -- Rimuovi numeri di versione per altri browser
              REGEXP_REPLACE(browser_name, ' [0-9.]+$', '')
          END as normalized_browser,
          click_fingerprint_hash,
          ip_address,
          user_agent
        FROM clicks 
        WHERE link_id = ${linkId} 
          AND clicked_at_rome >= ${startDateISO} 
          AND clicked_at_rome <= ${endDateISO}
      )
      SELECT 
        normalized_browser as browser,
        COUNT(*) as count
      FROM normalized_browsers
      GROUP BY normalized_browser
      ORDER BY count DESC 
      LIMIT 15
    `;
    
    let fixedBrowserTotal = 0;
    console.log('Risultati query browser corretta:');
    fixedBrowserResult.rows.forEach(row => {
      console.log(`${row.browser}: ${row.count} click`);
      fixedBrowserTotal += parseInt(row.count);
    });
    console.log(`Totale click browser (corretta): ${fixedBrowserTotal}`);
    
    // Verifica dei risultati
    console.log('\n=== RIEPILOGO RISULTATI ===');
    console.log(`Totale click: ${totalClicks}`);
    console.log(`Totale click città (corretta): ${fixedCityTotal}`);
    console.log(`Totale click browser (corretta): ${fixedBrowserTotal}`);
    
    // Verifica corrispondenza
    if (fixedCityTotal === totalClicks) {
      console.log('✅ La nuova query città è corretta! Tutti i click vengono contati.');
    } else {
      console.log(`❌ La nuova query città è ancora incompleta. Mancano ${totalClicks - fixedCityTotal} click.`);
    }
    
    if (fixedBrowserTotal === totalClicks) {
      console.log('✅ La nuova query browser è corretta! Tutti i click vengono contati.');
    } else {
      console.log(`❌ La nuova query browser è ancora incompleta. Mancano ${totalClicks - fixedBrowserTotal} click.`);
    }
    
  } catch (error) {
    console.error('Errore durante il test delle query corrette:', error);
  } finally {
    process.exit();
  }
}

testFixedQueries();
