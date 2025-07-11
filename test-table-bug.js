// Test Script per verificare il bug della tabella extra
// Apri il browser dev tools e incolla questo script nella console

console.log("🔍 TESTING: Bug Tabella Extra dopo Comprimi Tutte");

// Funzione per contare le tabelle nella pagina
function countTables() {
  const tables = document.querySelectorAll('table');
  console.log(`📊 Numero di tabelle trovate: ${tables.length}`);
  
  tables.forEach((table, index) => {
    console.log(`📋 Tabella ${index + 1}:`, {
      classe: table.className,
      parent: table.parentElement?.tagName,
      parentClass: table.parentElement?.className,
      rows: table.querySelectorAll('tr').length
    });
  });
  
  return tables.length;
}

// Funzione per contare le sezioni che sembrano tabelle
function countTableSections() {
  const tableContainers = document.querySelectorAll('[class*="overflow"], [class*="table"]');
  console.log(`📦 Container con classi table/overflow: ${tableContainers.length}`);
  
  tableContainers.forEach((container, index) => {
    console.log(`📦 Container ${index + 1}:`, {
      tag: container.tagName,
      classe: container.className,
      children: container.children.length,
      hasTable: container.querySelector('table') !== null
    });
  });
}

// Test iniziale
console.log("🔍 STATO INIZIALE:");
countTables();
countTableSections();

// Observer per monitorare cambiamenti nel DOM
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          if (node.tagName === 'TABLE' || 
              node.querySelector && node.querySelector('table') ||
              (node.className && node.className.includes('table'))) {
            console.log("🚨 NUOVO ELEMENTO TABELLA RILEVATO:", {
              tag: node.tagName,
              classe: node.className,
              parent: node.parentElement?.tagName,
              parentClass: node.parentElement?.className
            });
            
            // Ricontrolla tutte le tabelle
            setTimeout(() => {
              console.log("🔄 RICONTROLLO DOPO CAMBIAMENTO:");
              countTables();
            }, 100);
          }
        }
      });
    }
  });
});

// Inizia osservazione
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class']
});

console.log("👀 Observer attivato. Ora clicca 'Comprimi tutte le cartelle' e osserva i log...");

// Funzione per cercare il pulsante e cliccarci automaticamente (opzionale)
function findAndClickCompressButton() {
  const buttons = Array.from(document.querySelectorAll('button'));
  const compressButton = buttons.find(btn => 
    btn.title?.includes('Comprimi tutte') || 
    btn.textContent?.includes('Comprimi')
  );
  
  if (compressButton) {
    console.log("🔍 Pulsante 'Comprimi tutte' trovato:", compressButton);
    return compressButton;
  } else {
    console.log("❌ Pulsante 'Comprimi tutte' non trovato");
    return null;
  }
}

// Esporta funzioni utili per test manuali
window.testTableBug = {
  countTables,
  countTableSections,
  findCompressButton: findAndClickCompressButton,
  stopObserver: () => observer.disconnect()
};

console.log("✅ Test setup completato. Usa window.testTableBug per funzioni utili.");
