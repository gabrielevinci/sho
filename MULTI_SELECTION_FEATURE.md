# Funzionalità di Selezione Multipla dei Link

## Caratteristiche Implementate

### 🔲 Selezione Multipla
- **Ctrl+Click**: Seleziona/deseleziona singoli link
- **Shift+Click**: Seleziona un intervallo di link dal precedente link selezionato
- **Ctrl+A**: Seleziona tutti i link visibili (quando in modalità selezione)
- **Esc**: Deseleziona tutti i link
- **Checkbox**: Selezione tramite checkbox individuale o seleziona tutto

### 🎯 Operazioni Batch
- **Eliminazione**: Elimina tutti i link selezionati
- **Reset Click**: Azzera il conteggio dei click per tutti i link selezionati  
- **Spostamento**: Sposta i link selezionati in una cartella specifica

### 🖱️ Drag & Drop
- **Drag singolo**: Trascina un link per spostarlo
- **Drag multiplo**: Trascina link multipli selezionati per spostarli tutti insieme

### 🎨 UI/UX
- **Modalità Selezione**: Attiva/disattiva la modalità selezione
- **Feedback Visivo**: Evidenziazione dei link selezionati
- **Contatori**: Mostra il numero di link selezionati
- **Scorciatoie**: Suggerimenti per le scorciatoie da tastiera

## Come Usare

1. **Attivare la modalità selezione**: Clicca sul pulsante "Seleziona" nella parte superiore della lista
2. **Selezionare i link**:
   - Ctrl+Click per selezionare singoli link
   - Shift+Click per selezionare un intervallo
   - Usa le checkbox per selezione individuale
   - Ctrl+A per selezionare tutto
3. **Operazioni batch**: Usa la barra blu che appare sopra la lista per:
   - Spostare i link in una cartella
   - Azzerare i click
   - Eliminare i link
4. **Drag & Drop**: Trascina i link selezionati verso una cartella nella sidebar

## File Modificati

### Componenti React
- `LinkRow.tsx`: Aggiunta selezione multipla e visual feedback
- `FolderizedLinksList.tsx`: Logica di selezione e gestione state
- `BatchOperations.tsx`: Nuovo componente per operazioni batch
- `FolderSidebar.tsx`: Supporto per drag & drop multiplo

### API Endpoints
- `/api/links/batch-delete`: Eliminazione batch
- `/api/links/batch-reset-clicks`: Reset click batch
- `/api/links/batch-move`: Spostamento batch

## Tecnologie Utilizzate
- **React Hooks**: useState, useEffect, useCallback, useRef
- **Drag & Drop API**: HTML5 Drag and Drop
- **Keyboard Events**: Per scorciatoie da tastiera
- **Fetch API**: Per chiamate batch al server
- **Tailwind CSS**: Per styling e animazioni
