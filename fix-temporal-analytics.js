/**
 * Script per correggere le analytics temporali utilizzando i dati corretti dalla tabella links
 * Ridimensiona i grafici temporali per essere coerenti con i contatori reali
 */

const { sql } = require('@vercel/postgres');

async function fixTemporalAnalytics() {
  console.log('🔧 CORREZIONE ANALYTICS TEMPORALI');
  console.log('==================================');
  
  try {
    // Test con un link specifico per verificare il problema
    const testShortCode = 'mA0WVl'; // Sostituisci con il tuo shortCode
    
    console.log(`\n📊 Analizzando il link: ${testShortCode}`);
    
    // 1. Ottieni i dati reali dalla tabella links
    const linkData = await sql`
      SELECT id, click_count, unique_click_count, short_code
      FROM links 
      WHERE short_code = ${testShortCode}
    `;
    
    if (linkData.rows.length === 0) {
      console.log('❌ Link non trovato');
      return;
    }
    
    const link = linkData.rows[0];
    console.log(`\n📈 DATI REALI (tabella links):`);
    console.log(`   Click totali: ${link.click_count}`);
    console.log(`   Click unici: ${link.unique_click_count}`);
    
    // 2. Conta i dati nella tabella enhanced_fingerprints
    const enhancedData = await sql`
      SELECT 
        COUNT(*) as calculated_total,
        COUNT(DISTINCT device_fingerprint) as calculated_unique
      FROM enhanced_fingerprints 
      WHERE link_id = ${link.id}
    `;
    
    const calculated = enhancedData.rows[0];
    console.log(`\n📊 DATI CALCOLATI (enhanced_fingerprints):`);
    console.log(`   Click totali: ${calculated.calculated_total}`);
    console.log(`   Click unici: ${calculated.calculated_unique}`);
    
    // 3. Mostra la differenza
    const totalDiff = link.click_count - calculated.calculated_total;
    const uniqueDiff = link.unique_click_count - calculated.calculated_unique;
    
    console.log(`\n🔍 DIFFERENZE:`);
    console.log(`   Totali: ${totalDiff > 0 ? '+' : ''}${totalDiff}`);
    console.log(`   Unici: ${uniqueDiff > 0 ? '+' : ''}${uniqueDiff}`);
    
    // 4. Calcola i fattori di scaling per correggere i grafici
    const totalScalingFactor = calculated.calculated_total > 0 ? 
      link.click_count / calculated.calculated_total : 1;
    const uniqueScalingFactor = calculated.calculated_unique > 0 ? 
      link.unique_click_count / calculated.calculated_unique : 1;
    
    console.log(`\n📐 FATTORI DI SCALING:`);
    console.log(`   Totali: ${totalScalingFactor.toFixed(4)}`);
    console.log(`   Unici: ${uniqueScalingFactor.toFixed(4)}`);
    
    // 5. Test distribuzione temporale giornaliera
    console.log(`\n📅 DISTRIBUZIONE TEMPORALE (ultimi 7 giorni):`);
    const weeklyDistribution = await sql`
      SELECT 
        created_at::date as day,
        COUNT(*) as daily_total,
        COUNT(DISTINCT device_fingerprint) as daily_unique
      FROM enhanced_fingerprints 
      WHERE link_id = ${link.id}
        AND created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY created_at::date
      ORDER BY day
    `;
    
    weeklyDistribution.rows.forEach(row => {
      const scaledTotal = Math.round(row.daily_total * totalScalingFactor);
      const scaledUnique = Math.round(row.daily_unique * uniqueScalingFactor);
      console.log(`   ${row.day}: ${row.daily_total}→${scaledTotal} totali, ${row.daily_unique}→${scaledUnique} unici`);
    });
    
    // 6. Proposta soluzione SQL per i grafici
    console.log(`\n💡 SOLUZIONE PROPOSTA:`);
    console.log('   I grafici dovrebbero utilizzare una query che:');
    console.log('   1. Calcola la distribuzione temporale da enhanced_fingerprints');
    console.log('   2. Applica i fattori di scaling per essere coerenti con links.click_count');
    console.log('   3. Usa ROUND() per ottenere numeri interi');
    
    console.log(`\n✅ Analisi completata!`);
    
  } catch (error) {
    console.error('❌ Errore durante l\'analisi:', error);
  }
}

// Esegui lo script
fixTemporalAnalytics().then(() => {
  console.log('\n🎯 Script completato!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});
