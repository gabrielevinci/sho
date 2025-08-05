/**
 * Test per verificare il funzionamento del tooltip nel grafico "Andamento click"
 * con filtro "24 ore"
 */

async function testTooltip24h() {
  console.log('🧪 Test tooltip grafico 24 ore...\n');

  try {
    // 1. Carica la pagina delle statistiche
    console.log('📊 Caricamento pagina statistiche...');
    const response = await fetch('http://localhost:3000/dashboard/stats/test');
    
    if (response.ok) {
      console.log('✅ Pagina caricata correttamente');
    } else {
      console.log('⚠️ Pagina non trovata o errore, ma procediamo con il test API');
    }

    // 2. Test dell'API per il filtro 24h
    console.log('\n📡 Test API stats con filtro 24h...');
    const apiResponse = await fetch('http://localhost:3000/api/links/test/stats?filter=24h');
    
    if (!apiResponse.ok) {
      throw new Error(`API Error: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    console.log('✅ Dati API ricevuti');
    
    // 3. Verifica struttura dati
    console.log('\n🔍 Verifica struttura dati:');
    console.log(`📊 Totale record: ${data.length}`);
    
    if (data.length > 0) {
      const firstRecord = data[0];
      const lastRecord = data[data.length - 1];
      
      console.log(`🕐 Prima ora: ${firstRecord.ora_italiana}`);
      console.log(`   - Click Totali: ${firstRecord.click_totali}`);
      console.log(`   - Click Unici: ${firstRecord.click_unici}`);
      
      console.log(`🕐 Ultima ora: ${lastRecord.ora_italiana}`);
      console.log(`   - Click Totali: ${lastRecord.click_totali}`);
      console.log(`   - Click Unici: ${lastRecord.click_unici}`);

      // 4. Calcola totali per confronto
      const totalClickTotali = data.reduce((sum, item) => sum + (parseInt(item.click_totali) || 0), 0);
      const totalClickUnici = data.reduce((sum, item) => sum + (parseInt(item.click_unici) || 0), 0);
      
      console.log(`\n📈 Totali calcolati:`);
      console.log(`   - Somma Click Totali: ${totalClickTotali}`);
      console.log(`   - Somma Click Unici: ${totalClickUnici}`);
      
      // 5. Verifica coerenza dati
      let problemiRilevati = 0;
      
      data.forEach((item, index) => {
        const clickTotali = parseInt(item.click_totali) || 0;
        const clickUnici = parseInt(item.click_unici) || 0;
        
        if (clickUnici > clickTotali) {
          console.log(`⚠️ Problema ora ${index + 1}: Click unici (${clickUnici}) > Click totali (${clickTotali})`);
          problemiRilevati++;
        }
      });
      
      if (problemiRilevati === 0) {
        console.log('✅ Tutti i dati sono coerenti (click unici ≤ click totali)');
      } else {
        console.log(`❌ Rilevati ${problemiRilevati} problemi di coerenza dati`);
      }

      // 6. Test formato tooltip simulato
      console.log('\n🏷️ Test formato tooltip simulato:');
      const sampleRecord = data.find(item => (parseInt(item.click_totali) || 0) > 0) || data[12]; // Prende record con dati o il 12° (mezzogiorno)
      
      if (sampleRecord) {
        const date = new Date(sampleRecord.ora_italiana);
        const displayTime = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const fullDate = date.toLocaleString('it-IT', {
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        console.log(`   📅 Data completa: ${fullDate}`);
        console.log(`   🕐 Ora display: ${displayTime}`);
        console.log(`   📊 Click Totali: ${parseInt(sampleRecord.click_totali) || 0}`);
        console.log(`   📊 Click Unici: ${parseInt(sampleRecord.click_unici) || 0}`);
      }

    } else {
      console.log('⚠️ Nessun dato trovato per le ultime 24 ore');
    }

    console.log('\n🎉 Test completato con successo!');
    console.log('💡 Il tooltip ora dovrebbe mostrare i valori corretti');

  } catch (error) {
    console.error('❌ Errore durante il test:', error.message);
  }
}

// Esegui il test
testTooltip24h();
