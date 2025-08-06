require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

// Utilizzo lo shortCode che sappiamo essere valido
const shortCode = 'CIIhbJv';

async function testBrowserCard() {
  try {
    console.log(`Test card browser per shortCode: ${shortCode}`);
    
    // Ottieni l'ID del link dal shortCode
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
    
    // Recupera il conteggio totale dei click
    const totalClicksResult = await sql`
      SELECT COUNT(*) as total FROM clicks 
      WHERE link_id = ${linkId} 
      AND clicked_at_rome >= ${startDateISO} 
      AND clicked_at_rome <= ${endDateISO}
    `;
    
    const totalClicks = parseInt(totalClicksResult.rows[0].total);
    console.log(`Totale click: ${totalClicks}`);
    
    // Query browser originale senza normalizzazione
    console.log('\n=== BROWSER ORIGINALI DAL DATABASE ===');
    const originalBrowsersResult = await sql`
      SELECT 
        browser_name, 
        COUNT(*) as count 
      FROM clicks 
      WHERE link_id = ${linkId}
        AND clicked_at_rome >= ${startDateISO} 
        AND clicked_at_rome <= ${endDateISO}
      GROUP BY browser_name
      ORDER BY count DESC
    `;
    
    let totalOriginalBrowsers = 0;
    console.log('Browser originali nel database:');
    originalBrowsersResult.rows.forEach(row => {
      console.log(`${row.browser_name || 'Unknown'}: ${row.count} click`);
      totalOriginalBrowsers += parseInt(row.count);
    });
    console.log(`Totale click browser originali: ${totalOriginalBrowsers}`);
    
    // Query browser migliorata
    console.log('\n=== BROWSER NORMALIZZATI (QUERY CORRETTA) ===');
    const normalizedBrowsersResult = await sql`
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
          END as normalized_browser
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
    `;
    
    let totalNormalizedBrowsers = 0;
    console.log('Browser normalizzati:');
    normalizedBrowsersResult.rows.forEach(row => {
      console.log(`${row.browser}: ${row.count} click`);
      totalNormalizedBrowsers += parseInt(row.count);
    });
    console.log(`Totale click browser normalizzati: ${totalNormalizedBrowsers}`);
    
    // Verifica risultati
    console.log('\n=== RISULTATI TEST ===');
    console.log(`Totale click effettivi: ${totalClicks}`);
    console.log(`Totale click browser originali: ${totalOriginalBrowsers}`);
    console.log(`Totale click browser normalizzati: ${totalNormalizedBrowsers}`);
    
    if (totalNormalizedBrowsers === totalClicks) {
      console.log('✅ La query normalizzata per browser funziona correttamente!');
    } else {
      console.log('❌ La query normalizzata per browser NON funziona correttamente.');
      console.log(`   Mancano ${totalClicks - totalNormalizedBrowsers} click.`);
    }
    
    // Verifica se la query browser è stata aggiornata correttamente nel file database-helpers.ts
    console.log('\n=== VERIFICANDO IMPLEMENTAZIONE DELLA QUERY ===');
    console.log('Controllando se la query nel file database-helpers.ts è stata aggiornata correttamente...');
    console.log('Per correggere definitivamente la card browser, assicurati che la query normalizzata sia implementata nel file database-helpers.ts');
    
  } catch (error) {
    console.error('Errore durante il test della card browser:', error);
  } finally {
    process.exit();
  }
}

testBrowserCard();
