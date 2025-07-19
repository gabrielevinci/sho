import { sql } from '@vercel/postgres';

// Configura la variabile d'ambiente se non è già settata
if (!process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL = "postgres://neondb_owner:npg_Avg8n0iImOko@ep-bitter-wildflower-a2ysw8zc-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
}

async function simpleTest() {
  try {
    console.log('🧪 Test semplice dati click...\n');
    
    // Test 1: Verifica click base
    console.log('1. Verifica click base:');
    const basicQuery = await sql`
      SELECT 
        clicked_at_rome::date as date,
        COUNT(*) as clicks
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      WHERE l.short_code = 'qskNsOk'
      GROUP BY clicked_at_rome::date
      ORDER BY date
    `;
    
    console.log(`   Giorni con click: ${basicQuery.rows.length}`);
    basicQuery.rows.forEach(row => {
      console.log(`   ${row.date}: ${row.clicks} click`);
    });
    
    // Test 2: Genera solo serie temporale senza join complessi
    console.log('\n2. Genera serie temporale:');
    const seriesQuery = await sql`
      SELECT generate_series('2025-06-04'::date, '2025-07-19'::date, INTERVAL '1 day')::date as date
      LIMIT 5
    `;
    
    console.log(`   Serie temporale (primi 5 giorni):`);
    seriesQuery.rows.forEach(row => {
      console.log(`   ${row.date}`);
    });
    
    console.log('\n✅ Test semplice completato!');
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

simpleTest();
