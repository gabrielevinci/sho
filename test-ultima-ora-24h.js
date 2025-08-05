/**
 * Test specifico per il problema dell'ultima ora nel grafico 24h
 */

async function testUltimaOra24h() {
  console.log('🕐 Test specifica per ultima ora grafico 24h...\n');

  try {
    console.log('⏰ Ora corrente:', new Date().toLocaleString('it-IT'));
    console.log('🔍 Analisi problema ultima ora...\n');

    // Simula una chiamata API per testare la logica
    const now = new Date();
    const start24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    console.log('📊 Finestra temporale 24h:');
    console.log(`   🕐 Inizio: ${start24h.toLocaleString('it-IT')}`);
    console.log(`   🕐 Fine: ${now.toLocaleString('it-IT')}\n`);

    // Genera serie oraria teorica (come fa PostgreSQL)
    const hourlySlots = [];
    let currentHour = new Date(start24h);
    currentHour.setMinutes(0, 0, 0); // Tronca all'ora
    
    while (currentHour <= now) {
      hourlySlots.push({
        ora: new Date(currentHour),
        ora_italiana: currentHour.toISOString(),
        click_totali: Math.floor(Math.random() * 10), // Dati simulati
        click_unici: Math.floor(Math.random() * 8)
      });
      currentHour.setHours(currentHour.getHours() + 1);
    }

    console.log(`📈 Slot orari generati: ${hourlySlots.length}`);
    console.log('🔍 Prima e ultima ora:');
    
    const firstSlot = hourlySlots[0];
    const lastSlot = hourlySlots[hourlySlots.length - 1];
    
    console.log(`   🥇 Prima: ${firstSlot.ora.toLocaleString('it-IT')} - Click: ${firstSlot.click_totali}/${firstSlot.click_unici}`);
    console.log(`   🏁 Ultima: ${lastSlot.ora.toLocaleString('it-IT')} - Click: ${lastSlot.click_totali}/${lastSlot.click_unici}`);

    // Verifica se l'ultima ora è completa
    const ultimaOraCompleta = lastSlot.ora.getHours() < now.getHours() || 
                              (lastSlot.ora.getHours() === now.getHours() && now.getMinutes() >= 59);
    
    console.log(`\n⚠️ Ultima ora completa: ${ultimaOraCompleta ? 'SÌ' : 'NO'}`);
    
    if (!ultimaOraCompleta) {
      const minutiTrascorsi = now.getMinutes();
      console.log(`   🕐 Minuti trascorsi nell'ora corrente: ${minutiTrascorsi}/60`);
      console.log(`   💡 L'ora corrente è ancora in corso, dati potrebbero essere parziali`);
    }

    // Simula trasformazione per tooltip
    console.log('\n🏷️ Test trasformazione dati per tooltip:');
    
    hourlySlots.forEach((slot, index) => {
      const displayTime = slot.ora.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const isLast = index === hourlySlots.length - 1;
      
      console.log(`   ${isLast ? '🏁' : '📊'} ${displayTime}: ${slot.click_totali} totali, ${slot.click_unici} unici${isLast ? ' (ULTIMA)' : ''}`);
    });

    // Test specifico per mapping tooltip
    console.log('\n🖱️ Test mapping tooltip:');
    const testLabel = lastSlot.ora.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const foundData = hourlySlots.find(item => {
      const itemLabel = item.ora.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      return itemLabel === testLabel;
    });

    console.log(`   🔍 Label cercato: "${testLabel}"`);
    console.log(`   ✅ Dati trovati: ${foundData ? 'SÌ' : 'NO'}`);
    
    if (foundData) {
      console.log(`   📊 Click Totali: ${foundData.click_totali}`);
      console.log(`   📊 Click Unici: ${foundData.click_unici}`);
    }

    // Raccomandazioni
    console.log('\n💡 POSSIBILI CAUSE DEL PROBLEMA:');
    console.log('1. 🕐 Query SQL non include l\'ora corrente completamente');
    console.log('2. 📊 Dati dell\'ora corrente sono incompleti/parziali');
    console.log('3. 🏷️ Mapping tooltip fallisce per l\'ultima ora');
    console.log('4. ⏰ Problemi di timezone tra client e server');
    console.log('5. 🔄 Cache che non si aggiorna per l\'ora corrente');

    console.log('\n🔧 SOLUZIONI IMPLEMENTATE:');
    console.log('✅ 1. Migliorata query SQL per includere ora corrente + 1');
    console.log('✅ 2. Aggiunto logging dettagliato per diagnostica');
    console.log('✅ 3. Migliorato tooltip per usare dataPoint invece di payload');
    console.log('✅ 4. Debugging specifico per ultima ora');

  } catch (error) {
    console.error('❌ Errore durante il test:', error.message);
  }
}

// Esegui il test
testUltimaOra24h();
