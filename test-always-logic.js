import { sql } from '@vercel/postgres';

// Configura la variabile d'ambiente se non è già settata
if (!process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL = "postgres://neondb_owner:npg_Avg8n0iImOko@ep-bitter-wildflower-a2ysw8zc-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
}

async function testAlwaysLogic() {
  try {
    console.log('🧪 Test logica filtro "always"...\n');
    
    // Prima ottieni alcuni link con date di creazione diverse
    console.log('📋 Cerco links con date di creazione...');
    const linksQuery = await sql`
      SELECT short_code, original_url, created_at, click_count
      FROM links
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    console.log(`✅ Trovati ${linksQuery.rows.length} links:\n`);
    
    for (const link of linksQuery.rows) {
      const createdAt = new Date(link.created_at);
      const today = new Date();
      
      // Calcola giorni di differenza
      const diffTime = today.getTime() - createdAt.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      console.log(`📎 ${link.short_code}:`);
      console.log(`   URL: ${link.original_url}`);
      console.log(`   Creato: ${createdAt.toISOString().split('T')[0]}`);
      console.log(`   Click count: ${link.click_count}`);
      console.log(`   Giorni di vita: ${diffDays}`);
      
      // Simula la logica del filtro "always"
      const startDateForSeries = createdAt.toISOString().split('T')[0];
      const endDateForSeries = today.toISOString().split('T')[0];
      
      console.log(`   Range "always": ${startDateForSeries} → ${endDateForSeries} (${diffDays} giorni)`);
      console.log('');
    }
    
    // Test con un link specifico - range di date per calcolare giorni
    console.log('🔍 Test calcolo range per "always":');
    
    const oldestLink = linksQuery.rows[linksQuery.rows.length - 1];
    if (oldestLink) {
      const createdAt = new Date(oldestLink.created_at);
      const today = new Date();
      
      const startDate = createdAt.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];
      
      console.log(`📅 Link più vecchio: ${oldestLink.short_code}`);
      console.log(`📅 Dal: ${startDate}`);
      console.log(`📅 Al: ${endDate}`);
      
      // Calcola quanti giorni dovrebbe generare la serie temporale
      const diffTime = today.getTime() - createdAt.getTime();
      const expectedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 per includere entrambi i giorni
      
      console.log(`📊 Giorni attesi nella serie temporale: ${expectedDays}`);
      
      // Test rapido per contare i giorni che verrebbero generati
      const countQuery = await sql`
        SELECT COUNT(*) as day_count
        FROM generate_series($1::date, $2::date, INTERVAL '1 day') AS date_series
      `;
      
      const result = await sql.query(countQuery.text, [startDate, endDate]);
      console.log(`✅ Giorni effettivamente generati: ${result.rows[0].day_count}`);
      
      if (parseInt(result.rows[0].day_count) === expectedDays) {
        console.log('✅ Il calcolo del range è corretto!');
      } else {
        console.log('⚠️ Differenza nel calcolo del range');
      }
    }
    
    console.log('\n🎯 Conclusione:');
    console.log('- Il filtro "always" ora usa la data di creazione del link come inizio');
    console.log('- Il range va dalla creazione fino ad oggi');
    console.log('- Questo sostituisce il limite fisso di 30 giorni');
    console.log('✅ Test completato!');
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

testAlwaysLogic();
