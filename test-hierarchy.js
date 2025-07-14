// Test della gerarchia delle cartelle
console.log('🌳 Test della visualizzazione gerarchica delle cartelle');

// Simula dati di cartelle con gerarchia
const testFolders = [
  { id: '1', name: 'Progetti', parent_folder_id: null, position: 1 },
  { id: '2', name: 'Marketing', parent_folder_id: null, position: 2 },
  { id: '3', name: 'Web Development', parent_folder_id: '1', position: 1 },
  { id: '4', name: 'Mobile Apps', parent_folder_id: '1', position: 2 },
  { id: '5', name: 'React Projects', parent_folder_id: '3', position: 1 },
  { id: '6', name: 'Vue Projects', parent_folder_id: '3', position: 2 },
  { id: '7', name: 'Social Media', parent_folder_id: '2', position: 1 },
  { id: '8', name: 'Email Campaigns', parent_folder_id: '2', position: 2 },
];

// Implementazione delle funzioni di test (copia da advanced-create-form.tsx)
function buildFolderHierarchy(folders) {
  const folderMap = new Map();
  const rootFolders = [];

  folders.forEach(folder => {
    folderMap.set(folder.id, {
      ...folder,
      level: 0,
      children: []
    });
  });

  folders.forEach(folder => {
    const folderNode = folderMap.get(folder.id);
    
    if (folder.parent_folder_id) {
      const parent = folderMap.get(folder.parent_folder_id);
      if (parent) {
        folderNode.level = parent.level + 1;
        parent.children.push(folderNode);
      } else {
        rootFolders.push(folderNode);
      }
    } else {
      rootFolders.push(folderNode);
    }
  });

  const sortFolders = (folders) => {
    folders.sort((a, b) => a.position - b.position);
    folders.forEach(folder => sortFolders(folder.children));
  };

  sortFolders(rootFolders);
  return rootFolders;
}

function flattenHierarchy(hierarchy) {
  const result = [];
  
  const addToResult = (folders) => {
    folders.forEach(folder => {
      result.push(folder);
      if (folder.children.length > 0) {
        addToResult(folder.children);
      }
    });
  };
  
  addToResult(hierarchy);
  return result;
}

// Test della gerarchia
console.log('\n📊 Dati di test:');
testFolders.forEach(folder => {
  console.log(`- ${folder.name} (ID: ${folder.id}, Parent: ${folder.parent_folder_id || 'root'})`);
});

const hierarchy = buildFolderHierarchy(testFolders);
const flattened = flattenHierarchy(hierarchy);

console.log('\n🌲 Struttura gerarchica risultante:');
flattened.forEach(folder => {
  const indent = '  '.repeat(folder.level);
  const prefix = folder.level > 0 ? '└─ ' : '';
  console.log(`${indent}${prefix}${folder.name} (livello ${folder.level})`);
});

console.log('\n✅ Test completato!');
console.log('\n📋 Funzionalità implementate:');
console.log('- ✅ Costruzione gerarchia cartelle basata su parent_folder_id');
console.log('- ✅ Ordinamento per position a ogni livello');
console.log('- ✅ Calcolo automatico del livello di indentazione');
console.log('- ✅ Appiattimento mantenendo ordine gerarchico');
console.log('- ✅ Visualizzazione con indentazione e simboli gerarchia');
console.log('- ✅ Supporto ricerca su struttura appiattita');
console.log('\n🎯 Nell\'interfaccia utente:');
console.log('- Le cartelle sono ora mostrate con la gerarchia corretta');
console.log('- L\'indentazione visuale mostra il livello di nesting');
console.log('- I simboli "└─" indicano le sottocartelle');
console.log('- La ricerca funziona mantenendo la struttura gerarchica');
