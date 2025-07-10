// Test specifico per debugging del filtro cartelle

console.log('🧪 DEBUG: Test filtro cartelle dopo spostamento');

async function debugFolderFilter() {
  try {
    // 1. Simula spostamento di un link
    console.log('\n1. 📦 Simulando spostamento link...');
    
    // Ottieni workspace ID dalla URL (assumendo di essere in /dashboard)
    const workspaceId = 'test-workspace'; // Placeholder - dovrai sostituire con un ID reale
    
    // 2. Carica i link con API standard
    console.log('\n2. 📥 Caricamento link con API links-with-folders...');
    const response = await fetch(`/api/links-with-folders?workspaceId=${workspaceId}`);
    
    if (!response.ok) {
      console.log('❌ API response non OK:', response.status);
      return;
    }
    
    const data = await response.json();
    
    if (!data.links || !Array.isArray(data.links)) {
      console.log('❌ Dati link non validi:', data);
      return;
    }
    
    console.log(`✅ Caricati ${data.links.length} link totali`);
    
    // 3. Carica le cartelle
    console.log('\n3. 📁 Caricamento cartelle...');
    const foldersResponse = await fetch(`/api/folders?workspaceId=${workspaceId}`);
    const foldersData = await foldersResponse.json();
    
    if (!foldersData.folders || !Array.isArray(foldersData.folders)) {
      console.log('❌ Dati cartelle non validi:', foldersData);
      return;
    }
    
    console.log(`✅ Caricate ${foldersData.folders.length} cartelle`);
    
    // 4. Trova la cartella "Tutti i link"
    const allLinksFolder = foldersData.folders.find(f => f.name === 'Tutti i link');
    if (!allLinksFolder) {
      console.log('❌ Cartella "Tutti i link" non trovata');
      return;
    }
    
    console.log(`✅ Cartella "Tutti i link" trovata: ${allLinksFolder.id}`);
    
    // 5. Verifica filtro per ogni cartella
    console.log('\n4. 🔍 Test filtro per ogni cartella...');
    
    foldersData.folders.forEach(folder => {
      if (folder.name === 'Tutti i link') {
        // Test filtro "Tutti i link" - dovrebbe mostrare tutti i link
        console.log(`\nCartella "${folder.name}" (default):`);
        console.log(`  - Tutti i link: ${data.links.length}`);
        return;
      }
      
      // Test filtro cartella specifica
      const filteredLinks = data.links.filter(link => 
        link.folders && link.folders.some(f => f.id === folder.id)
      );
      
      console.log(`\nCartella "${folder.name}" (ID: ${folder.id}):`);
      console.log(`  - Link trovati dal filtro: ${filteredLinks.length}`);
      
      if (filteredLinks.length > 0) {
        console.log(`  - Link trovati:`);
        filteredLinks.forEach(link => {
          console.log(`    * "${link.title || link.original_url}" (ID: ${link.id})`);
          console.log(`      Cartelle associate: ${link.folders ? link.folders.length : 0}`);
          if (link.folders) {
            link.folders.forEach(f => {
              console.log(`        - ${f.name} (${f.id})`);
            });
          }
        });
      } else {
        console.log(`  ⚠️  NESSUN LINK TROVATO!`);
        
        // Debug: mostra i primi 2 link per vedere le loro associazioni
        console.log(`  🔍 Debug - Prime 2 link per confronto:`);
        data.links.slice(0, 2).forEach((link, index) => {
          console.log(`    Link ${index + 1}: "${link.title || link.original_url}"`);
          console.log(`      Cartelle associate: ${link.folders ? link.folders.length : 0}`);
          if (link.folders && link.folders.length > 0) {
            link.folders.forEach(f => {
              console.log(`        - ${f.name} (${f.id})`);
            });
          } else {
            console.log(`        - Nessuna cartella associata`);
          }
        });
      }
    });
    
    // 6. Test con API folderId specifico
    console.log('\n5. 🧪 Test API con parametro folderId...');
    const testFolder = foldersData.folders.find(f => f.name !== 'Tutti i link');
    
    if (testFolder) {
      console.log(`\nTestando cartella: ${testFolder.name} (${testFolder.id})`);
      
      const folderResponse = await fetch(`/api/links-with-folders?workspaceId=${workspaceId}&folderId=${testFolder.id}`);
      const folderData = await folderResponse.json();
      
      console.log(`  - API con folderId - Link trovati: ${folderData.links ? folderData.links.length : 0}`);
      
      if (folderData.links && folderData.links.length > 0) {
        folderData.links.forEach(link => {
          console.log(`    * "${link.title || link.original_url}"`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Errore durante il debug:', error);
  }
}

// Esegui il debug
if (typeof window !== 'undefined') {
  debugFolderFilter();
} else {
  console.log('Questo test deve essere eseguito nel browser con un workspace attivo.');
}
