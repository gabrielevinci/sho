// Test per verificare il bug del filtro cartelle dopo reload

console.log('🔍 TEST: Verifica bug filtro cartelle dopo reload');

async function testFolderFilterBug() {
  try {
    console.log('\n1. 📥 Caricamento tutti i link con API links-with-folders...');
    
    const response = await fetch('/api/links-with-folders?workspaceId=' + window.location.pathname.split('/')[1]);
    const data = await response.json();
    
    if (!data.links) {
      console.log('❌ API non restituisce link');
      return;
    }
    
    console.log(`✅ Caricati ${data.links.length} link totali`);
    
    // Analizza ogni link e le sue cartelle
    data.links.forEach((link, index) => {
      console.log(`\nLink ${index + 1}:`);
      console.log(`  - ID: ${link.id}`);
      console.log(`  - Titolo: ${link.title || 'N/A'}`);
      console.log(`  - URL: ${link.original_url}`);
      console.log(`  - Folder ID legacy: ${link.folder_id || 'null'}`);
      console.log(`  - Cartelle associate: ${link.folders ? link.folders.length : 0}`);
      
      if (link.folders && link.folders.length > 0) {
        link.folders.forEach(folder => {
          console.log(`    * ${folder.name} (ID: ${folder.id})`);
        });
      } else {
        console.log('    * Nessuna cartella associata');
      }
    });
    
    console.log('\n2. 📁 Caricamento cartelle...');
    
    const foldersResponse = await fetch('/api/folders?workspaceId=' + window.location.pathname.split('/')[1]);
    const foldersData = await foldersResponse.json();
    
    if (!foldersData.folders) {
      console.log('❌ API non restituisce cartelle');
      return;
    }
    
    console.log(`✅ Caricate ${foldersData.folders.length} cartelle`);
    
    foldersData.folders.forEach(folder => {
      console.log(`  - ${folder.name} (ID: ${folder.id}, Parent: ${folder.parent_folder_id || 'root'})`);
    });
    
    console.log('\n3. 🧪 Test filtro per ogni cartella...');
    
    foldersData.folders.forEach(folder => {
      if (folder.name === 'Tutti i link') return; // Skip
      
      const linksInFolder = data.links.filter(link => 
        link.folders && link.folders.some(f => f.id === folder.id)
      );
      
      console.log(`\nCartella "${folder.name}" (ID: ${folder.id}):`);
      console.log(`  - Link trovati: ${linksInFolder.length}`);
      
      linksInFolder.forEach(link => {
        console.log(`    * ${link.title || link.original_url} (ID: ${link.id})`);
      });
      
      if (linksInFolder.length === 0) {
        console.log('    ⚠️  NESSUN LINK TROVATO - Possibile bug!');
      }
    });
    
    console.log('\n4. 🔄 Test con API folderId specifico...');
    
    // Testa alcune cartelle specifiche
    const testFolders = foldersData.folders.filter(f => f.name !== 'Tutti i link').slice(0, 2);
    
    for (const folder of testFolders) {
      console.log(`\nTest API per cartella: ${folder.name} (ID: ${folder.id})`);
      
      const folderResponse = await fetch(`/api/links-with-folders?workspaceId=${window.location.pathname.split('/')[1]}&folderId=${folder.id}`);
      const folderData = await folderResponse.json();
      
      console.log(`  - Link dall'API con folderId: ${folderData.links ? folderData.links.length : 0}`);
      
      if (folderData.links && folderData.links.length > 0) {
        folderData.links.forEach(link => {
          console.log(`    * ${link.title || link.original_url}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

// Esegui il test
if (typeof window !== 'undefined') {
  testFolderFilterBug();
} else {
  console.log('Questo test deve essere eseguito nel browser.');
}
