// Script di test per confrontare le API stats
const testShortCode = 'test'; // Cambia con uno shortCode esistente

async function testAPIs() {
  try {
    console.log('🧪 Test delle API per identificare le differenze...\n');
    
    // Test API esistente
    console.log('📡 Chiamata API esistente (/api/stats/[shortCode])...');
    const existingAPI = await fetch(`http://localhost:3001/api/stats/${testShortCode}?mode=all&filter=sempre`);
    const existingData = await existingAPI.json();
    
    if (existingData.error) {
      console.error('❌ Errore API esistente:', existingData.error);
      return;
    }
    
    console.log('✅ API esistente - Click totali sempre:', existingData.click_totali_sempre);
    console.log('✅ API esistente - Click unici sempre:', existingData.click_unici_sempre);
    
    // Test nuova API
    console.log('\n📡 Chiamata nuova API (/api/links/[shortCode]/stats)...');
    const newAPI = await fetch(`http://localhost:3001/api/links/${testShortCode}/stats?filter=all`);
    const newData = await newAPI.json();
    
    if (newData.error) {
      console.error('❌ Errore nuova API:', newData.error);
      return;
    }
    
    // Calcola i totali dalla nuova API
    const totalClicks = newData.data.reduce((sum, day) => sum + day.click_totali, 0);
    const totalUnique = Math.max(...newData.data.map(day => day.click_unici));
    
    console.log('✅ Nuova API - Click totali calcolati:', totalClicks);
    console.log('✅ Nuova API - Click unici massimi:', totalUnique);
    
    // Confronto
    console.log('\n📊 CONFRONTO:');
    console.log(`Differenza click totali: ${Math.abs(existingData.click_totali_sempre - totalClicks)}`);
    console.log(`Differenza click unici: ${Math.abs(existingData.click_unici_sempre - totalUnique)}`);
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

testAPIs();
