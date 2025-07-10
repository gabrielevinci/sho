/**
 * Test per verificare il flusso completo di spostamento link
 * e aggiornamento del frontend con cartelle multiple
 */

// Test 1: Verifica che handleBatchMoveToFolder chiami l'API corretta
console.log('🔄 Test 1: Verifica della chiamata API batch-move');

const testBatchMoveAPI = async () => {
  try {
    const response = await fetch('/api/links/batch-move', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        linkIds: ['test-link-id'],
        folderId: 'test-folder-id',
        sourceFolderId: null // Da "Tutti i link"
      }),
    });
    
    const result = await response.json();
    console.log('✅ API batch-move response:', result);
    
    if (response.ok) {
      console.log('✅ API batch-move funziona correttamente');
    } else {
      console.log('❌ API batch-move ha restituito un errore:', result);
    }
  } catch (error) {
    console.log('❌ Errore durante la chiamata API batch-move:', error);
  }
};

// Test 2: Verifica che l'API links-with-folders restituisca i dati corretti
console.log('🔄 Test 2: Verifica dell\'API links-with-folders');

const testLinksWithFoldersAPI = async () => {
  try {
    const response = await fetch('/api/links-with-folders');
    const result = await response.json();
    
    console.log('✅ API links-with-folders response:', result);
    
    if (result.links && Array.isArray(result.links)) {
      console.log('✅ API links-with-folders restituisce array di link');
      
      // Verifica se i link hanno la proprietà folders
      const linksWithFolders = result.links.filter(link => link.folders && Array.isArray(link.folders));
      console.log(`📊 Link con proprietà 'folders': ${linksWithFolders.length}/${result.links.length}`);
      
      // Mostra esempio di struttura dati
      if (linksWithFolders.length > 0) {
        console.log('📋 Esempio di link con cartelle:', linksWithFolders[0]);
      }
    } else {
      console.log('❌ API links-with-folders non restituisce array di link valido');
    }
  } catch (error) {
    console.log('❌ Errore durante la chiamata API links-with-folders:', error);
  }
};

// Test 3: Simula il flusso completo di spostamento
console.log('🔄 Test 3: Simulazione flusso completo di spostamento');

const testCompleteFlow = async () => {
  console.log('🔄 Simulando spostamento di un link...');
  
  // Step 1: Ottieni i link attuali
  console.log('📥 Step 1: Caricamento link attuali');
  const initialResponse = await fetch('/api/links-with-folders');
  const initialData = await initialResponse.json();
  console.log(`📊 Link attuali: ${initialData.links?.length || 0}`);
  
  if (initialData.links && initialData.links.length > 0) {
    const testLink = initialData.links[0];
    console.log('🎯 Link di test selezionato:', testLink.short_code);
    console.log('📁 Cartelle attuali del link:', testLink.folders);
    
    // Step 2: Ottieni le cartelle disponibili
    console.log('📂 Step 2: Caricamento cartelle disponibili');
    const foldersResponse = await fetch('/api/folders');
    const foldersData = await foldersResponse.json();
    console.log(`📊 Cartelle disponibili: ${foldersData.folders?.length || 0}`);
    
    if (foldersData.folders && foldersData.folders.length > 0) {
      const targetFolder = foldersData.folders[0];
      console.log('🎯 Cartella di destinazione:', targetFolder.name);
      
      // Step 3: Simula spostamento (solo log, non effettivo)
      console.log('🔄 Step 3: Simulazione spostamento...');
      console.log(`📝 Parametri spostamento:
        - Link ID: ${testLink.id}
        - Cartella destinazione: ${targetFolder.id}
        - Cartella origine: null (da "Tutti i link")`);
      
      // Step 4: Verifica che dopo il reload i dati siano aggiornati
      console.log('🔄 Step 4: Simulazione reload post-spostamento');
      const reloadResponse = await fetch('/api/links-with-folders');
      const reloadData = await reloadResponse.json();
      console.log(`📊 Link dopo reload: ${reloadData.links?.length || 0}`);
      
      // Trova il link spostato nei nuovi dati
      const updatedLink = reloadData.links?.find(l => l.id === testLink.id);
      if (updatedLink) {
        console.log('✅ Link trovato nei dati ricaricati');
        console.log('📁 Nuove cartelle del link:', updatedLink.folders);
      } else {
        console.log('❌ Link non trovato nei dati ricaricati');
      }
    } else {
      console.log('⚠️ Nessuna cartella disponibile per il test');
    }
  } else {
    console.log('⚠️ Nessun link disponibile per il test');
  }
};

// Esegui i test
console.log('🚀 Iniziando test spostamento link con cartelle multiple...\n');

(async () => {
  await testBatchMoveAPI();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testLinksWithFoldersAPI();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testCompleteFlow();
  console.log('\n✅ Test completati!');
})();
