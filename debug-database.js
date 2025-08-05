const { Client } = require('pg');

async function debugDatabase() {
  const client = new Client({
    connectionString: 'postgres://neondb_owner:npg_QyK8rfnM2TBZ@ep-bitter-wildflower-a2ysw8zc-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();
    console.log('✅ Connesso al database Neon');

    // Prima, troviamo l'ID del link per shortCode 'CIIhbJv'
    const linkQuery = `SELECT id FROM links WHERE short_code = $1`;
    const linkResult = await client.query(linkQuery, ['CIIhbJv']);
    
    if (linkResult.rows.length === 0) {
      console.log('❌ Link non trovato');
      return;
    }

    const linkId = linkResult.rows[0].id;
    console.log('🔍 Link ID trovato:', linkId);

    // Eseguiamo contemporaneamente la query diretta E la chiamata API
    console.log('🔍 Eseguo query simultanee...');
    
    const query24h = `
      WITH clicks_ranked AS (
        SELECT
          id,
          clicked_at_rome,
          click_fingerprint_hash,
          ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
        FROM
          clicks
        WHERE
          link_id = $1 AND
          clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '24 hours')
      )
      SELECT
        serie_oraria.ora AT TIME ZONE 'Europe/Rome' AS ora_italiana,
        COALESCE(COUNT(cr.id), 0) AS click_totali,
        COALESCE(SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END), 0) AS click_unici
      FROM
        generate_series(
          DATE_TRUNC('hour', NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '24 hours'),
          DATE_TRUNC('hour', NOW() AT TIME ZONE 'Europe/Rome'),
          '1 hour'
        ) AS serie_oraria(ora)
      LEFT JOIN
        clicks_ranked cr ON DATE_TRUNC('hour', cr.clicked_at_rome) = serie_oraria.ora
      GROUP BY
        serie_oraria.ora
      ORDER BY
        serie_oraria.ora ASC;
    `;

    // Esegui simultaneamente query diretta e API call
    const [dbResult, apiResponse] = await Promise.all([
      client.query(query24h, [linkId]),
      fetch('http://localhost:3001/api/links/CIIhbJv/stats?filter=24h')
        .then(res => {
          console.log('API Response status:', res.status);
          return res.json();
        })
        .catch(err => {
          console.log('API Error:', err.message);
          return null;
        })
    ]);
    
    console.log('\n📊 CONFRONTO SIMULTANEO:');
    console.log('Database rows:', dbResult.rows.length);
    console.log('API response:', typeof apiResponse, apiResponse ? 'SUCCESS' : 'FAILED');
    
    if (!apiResponse) {
      console.log('❌ API non raggiungibile - confronto solo database');
      
      console.log('\n🎯 ULTIME 5 ORE - DATABASE:');
      const dbLastRows = dbResult.rows.slice(-5);
      dbLastRows.forEach((row, index) => {
        const actualIndex = dbResult.rows.length - 5 + index;
        console.log(`${actualIndex}: ${row.ora_italiana} | Click: ${row.click_totali} | Unici: ${row.click_unici}`);
      });

      console.log('\n🔢 CLICK TOTALI - DATABASE:');
      const dbClicks = dbResult.rows.map(row => parseInt(row.click_totali));
      console.log(dbClicks);
      
      return;
    }
    
    console.log('API rows:', apiResponse.length);
    
    // Confronta gli ultimi 5 elementi
    console.log('\n🎯 ULTIME 5 ORE - DATABASE:');
    const dbLastRows = dbResult.rows.slice(-5);
    dbLastRows.forEach((row, index) => {
      const actualIndex = dbResult.rows.length - 5 + index;
      console.log(`${actualIndex}: ${row.ora_italiana} | Click: ${row.click_totali} | Unici: ${row.click_unici}`);
    });

    console.log('\n🎯 ULTIME 5 ORE - API:');
    const apiLastRows = apiResponse.slice(-5);
    apiLastRows.forEach((row, index) => {
      const actualIndex = apiResponse.length - 5 + index;
      console.log(`${actualIndex}: ${row.ora_italiana} | Click: ${row.click_totali} | Unici: ${row.click_unici}`);
    });

    // Confronta i click totali
    const dbClicks = dbResult.rows.map(row => parseInt(row.click_totali));
    const apiClicks = apiResponse.map(row => parseInt(row.click_totali));
    
    console.log('\n� CLICK TOTALI - DATABASE:');
    console.log(dbClicks);
    console.log('\n🔢 CLICK TOTALI - API:');
    console.log(apiClicks);
    
    // Trova le differenze
    console.log('\n❌ DIFFERENZE:');
    let hasDifferences = false;
    for (let i = 0; i < Math.min(dbClicks.length, apiClicks.length); i++) {
      if (dbClicks[i] !== apiClicks[i]) {
        console.log(`Indice ${i}: DB=${dbClicks[i]}, API=${apiClicks[i]} ❌`);
        hasDifferences = true;
      }
    }
    
    if (!hasDifferences) {
      console.log('✅ Nessuna differenza trovata - i dati sono identici!');
    }

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await client.end();
    console.log('🔌 Connessione chiusa');
  }
}

// Esegui il debug
debugDatabase();
