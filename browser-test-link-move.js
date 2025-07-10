/**
 * Test manuale per verificare il flusso di spostamento link
 * Apri questo nel browser developer console:
 * 1. Vai alla dashboard
 * 2. Apri developer tools (F12)
 * 3. Incolla questo codice nella console
 * 4. Premi Enter
 */

(async function testLinkMoveFlow() {
  console.log('🚀 Test flusso spostamento link - INIZIATO');
  
  // Test 1: Verifica che l'API links-with-folders funzioni
  console.log('\n📥 1. Testing API links-with-folders...');
  try {
    const response = await fetch('/api/links-with-folders');
    const data = await response.json();
    
    if (data.links && data.links.length > 0) {
      console.log(`✅ API restituisce ${data.links.length} link`);
      
      // Verifica che i link abbiano la proprietà folders
      const linksWithFolders = data.links.filter(link => link.folders && Array.isArray(link.folders));
      console.log(`📁 Link con proprietà 'folders': ${linksWithFolders.length}/${data.links.length}`);
      
      if (linksWithFolders.length > 0) {
        console.log('📋 Esempio di link con cartelle:', {
          short_code: linksWithFolders[0].short_code,
          folders: linksWithFolders[0].folders
        });
      }
    } else {
      console.log('⚠️ Nessun link trovato o struttura dati non valida');
    }
  } catch (error) {
    console.error('❌ Errore API links-with-folders:', error);
  }
  
  // Test 2: Verifica che l'API folders funzioni
  console.log('\n📂 2. Testing API folders...');
  try {
    const response = await fetch('/api/folders');
    const data = await response.json();
    
    if (data.folders && data.folders.length > 0) {
      console.log(`✅ API restituisce ${data.folders.length} cartelle`);
      console.log('📋 Prima cartella:', {
        id: data.folders[0].id,
        name: data.folders[0].name
      });
    } else {
      console.log('⚠️ Nessuna cartella trovata');
    }
  } catch (error) {
    console.error('❌ Errore API folders:', error);
  }
  
  // Test 3: Testa la logica di filtraggio del frontend
  console.log('\n🔍 3. Testing logica filtraggio frontend...');
  
  // Simula un link con cartelle multiple
  const mockLink = {
    id: 'test-123',
    short_code: 'test123',
    folders: [
      { id: 'folder-1', name: 'Cartella 1' },
      { id: 'folder-2', name: 'Cartella 2' }
    ]
  };
  
  // Test filtro per "Tutti i link"
  const showInAllLinks = true; // selectedFolderId === defaultFolderId
  console.log(`📋 Link visibile in "Tutti i link": ${showInAllLinks}`);
  
  // Test filtro per cartella specifica
  const selectedFolderId = 'folder-1';
  const showInFolder1 = mockLink.folders.some(folder => folder.id === selectedFolderId);
  console.log(`📋 Link visibile in "Cartella 1": ${showInFolder1}`);
  
  const selectedFolderId2 = 'folder-3';
  const showInFolder3 = mockLink.folders.some(folder => folder.id === selectedFolderId2);
  console.log(`📋 Link visibile in "Cartella 3" (non associata): ${showInFolder3}`);
  
  console.log('\n✅ Test logica filtraggio completato');
  
  // Test 4: Istruzioni per test manuale
  console.log('\n📝 4. ISTRUZIONI PER TEST MANUALE:');
  console.log('1. Vai su "Tutti i link"');
  console.log('2. Seleziona un link');
  console.log('3. Usa "Sposta in" per spostarlo in una cartella');
  console.log('4. Verifica che il link appaia nella cartella di destinazione');
  console.log('5. Verifica che il link sia ancora visibile in "Tutti i link" (se ha altre associazioni)');
  
  console.log('\n🔧 5. DEBUG INFO:');
  console.log('- Se il link non appare dopo lo spostamento, controlla la console per errori');
  console.log('- Verifica che l\'API batch-move sia stata chiamata correttamente');
  console.log('- Verifica che handleUpdateLinks() sia stato chiamato dopo lo spostamento');
  
  console.log('\n✅ Test flusso spostamento link - COMPLETATO');
})();
