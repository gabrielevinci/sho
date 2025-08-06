require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

// Utilizziamo lo shortCode che abbiamo trovato
const shortCode = 'CIIhbJv';

async function testImprovedQuery() {
  try {
    console.log(`Test della query città migliorata per shortCode: ${shortCode}`);
    
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
    
    // Recupera il conteggio totale dei click
    const totalClicksResult = await sql`
      SELECT COUNT(*) as total FROM clicks 
      WHERE link_id = ${linkId} 
      AND clicked_at_rome >= ${startDateISO} 
      AND clicked_at_rome <= ${endDateISO}
    `;
    
    const totalClicks = parseInt(totalClicksResult.rows[0].total);
    console.log(`Totale click: ${totalClicks}`);
    
    // Test della query città migliorata con mappatura completa
    console.log('\n=== TEST QUERY CITTÀ FINALE ===');
    
    const finalCityResult = await sql`
      WITH city_mapping AS (
        SELECT 'Los%20Lunas' as encoded, 'Los Lunas' as decoded UNION ALL
        SELECT 'S%C3%A3o%20Paulo', 'São Paulo' UNION ALL
        SELECT 'Los%20Angeles', 'Los Angeles' UNION ALL
        SELECT 'Frankfurt%20am%20Main', 'Frankfurt am Main' UNION ALL
        SELECT 'Council%20Bluffs', 'Council Bluffs' UNION ALL
        SELECT 'Lule%C3%A5', 'Luleå' UNION ALL
        SELECT 'San%20Jose', 'San Jose' UNION ALL
        SELECT 'Santa%20Clara', 'Santa Clara'
      ),
      processed_clicks AS (
        SELECT 
          id, 
          link_id,
          clicked_at_rome,
          -- Completa normalizzazione di tutte le città usando la tabella di mappatura
          CASE 
            WHEN city IS NULL OR city = '' THEN 'Unknown'
            WHEN EXISTS (SELECT 1 FROM city_mapping WHERE encoded = city) THEN 
              (SELECT decoded FROM city_mapping WHERE encoded = city)
            WHEN city LIKE '%\\%%' THEN 
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
                '%C3%BC', 'ü')
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
    `;
    
    let finalCityTotal = 0;
    console.log('Risultati query città finale:');
    finalCityResult.rows.forEach(row => {
      console.log(`${row.city}: ${row.count} click`);
      finalCityTotal += parseInt(row.count);
    });
    console.log(`\nTotale click città: ${finalCityTotal}`);
    
    // Verifica se la query conta tutti i click
    if (finalCityTotal === totalClicks) {
      console.log('✅ SUCCESSO! La query città ora conta correttamente tutti i click.');
    } else {
      console.log(`❌ ERRORE: Mancano ancora ${totalClicks - finalCityTotal} click nella query città.`);
    }
    
  } catch (error) {
    console.error('Errore durante il test della query migliorata:', error);
  } finally {
    process.exit();
  }
}

testImprovedQuery();
