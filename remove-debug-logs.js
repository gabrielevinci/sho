/**
 * Script per rimuovere i log di debug dopo aver completato i test
 * Eseguire quando il testing è completato e tutto funziona correttamente
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Rimozione log di debug...');

// File da pulire
const files = [
  {
    path: 'app/dashboard/components/FolderizedLinksList.tsx',
    logs: [
      'console.log(\'🔄 handleBatchMoveToFolder chiamato:\', { linkIds, folderId, selectedFolderId });',
      'console.log(\'✅ API batch-move completata con successo, chiamando onUpdateLinks...\');',
      'console.log(\'✅ onUpdateLinks chiamato\');',
      'const errorData = await response.json();',
      'console.error(\'❌ Errore API batch-move:\', errorData);'
    ]
  },
  {
    path: 'app/dashboard/dashboard-client.tsx',
    logs: [
      'console.log(\'🔄 handleUpdateLinks chiamato...\');',
      'console.log(\'📥 Caricando link da:\', apiUrl);',
      'console.log(`✅ Caricati ${data.links.length} link, aggiornando stato...`);',
      'console.log(\'✅ Stato link aggiornato\');'
    ]
  }
];

function removeDebugLogs() {
  files.forEach(file => {
    const filePath = path.join(__dirname, file.path);
    
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      file.logs.forEach(logLine => {
        // Rimuovi i log mantenendo l'indentazione
        const regex = new RegExp(`\\s*${logLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n?`, 'g');
        content = content.replace(regex, '');
      });
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Pulito: ${file.path}`);
    } else {
      console.log(`⚠️ File non trovato: ${file.path}`);
    }
  });
}

// Istruzioni per l'uso
console.log(`
📋 ISTRUZIONI:
1. Prima di eseguire questo script, assicurati che tutti i test siano stati completati
2. Verifica che la funzionalità di spostamento link funzioni correttamente
3. Esegui: node remove-debug-logs.js
4. Controlla che i file siano stati puliti correttamente

⚠️  ATTENZIONE: Questo script rimuoverà permanentemente i log di debug!
`);

// Decommentare la riga seguente per eseguire la pulizia
// removeDebugLogs();
