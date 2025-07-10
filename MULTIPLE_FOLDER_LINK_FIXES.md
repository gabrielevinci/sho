# Correzioni al comportamento di spostamento dei link

## Problema risolto

Quando si spostava un link da "Tutti i link" a una cartella specifica, il link veniva rimosso da tutte le altre cartelle in cui era presente. Questo non era il comportamento desiderato, perché l'operazione dovrebbe:

1. Se un link viene spostato da "Tutti i link" a una cartella, deve essere **aggiunto** a quella cartella senza essere rimosso dalle altre cartelle in cui già si trova.
2. Se viene spostato da una cartella A a una cartella B, deve essere rimosso da A e aggiunto a B.
3. Se viene spostato da una cartella a "Tutti i link", deve essere rimosso solo da quella cartella.

## Cause del problema

Il problema era causato da due fattori principali:

1. Nel file `FolderizedLinksList.tsx`, il metodo `handleBatchMoveToFolder` effettuava chiamate singole all'API `/api/links/move` invece di utilizzare l'API `/api/links/batch-move`, che è ottimizzata per operazioni batch.

2. Nel file `dashboard-client.tsx`, il metodo `handleLinkDrop` (usato per il drag & drop) chiamava l'API `/api/links/move` e non l'API `/api/links/batch-move`, causando comportamenti inconsistenti tra i diversi metodi di spostamento.

## Modifiche apportate

### 1. In `FolderizedLinksList.tsx`

Abbiamo modificato il metodo `handleBatchMoveToFolder` per utilizzare l'API batch-move invece di fare chiamate singole:

```tsx
const handleBatchMoveToFolder = useCallback(async (linkIds: string[], folderId: string | null) => {
  // Usa l'API batch-move anziché fare chiamate singole
  const response = await fetch('/api/links/batch-move', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      linkIds,
      folderId,
      sourceFolderId: selectedFolderId === defaultFolderId ? null : selectedFolderId // Passa la cartella di origine
    }),
  });

  if (response.ok) {
    // Aggiorna lo stato locale
    if (onUpdateLink) {
      linkIds.forEach(linkId => {
        const link = links.find(l => l.id === linkId);
        if (link) {
          onUpdateLink(link.short_code, { folder_id: folderId });
        }
      });
    }
  }
}, [links, onUpdateLink, selectedFolderId, defaultFolderId]);
```

### 2. In `dashboard-client.tsx`

Abbiamo modificato il metodo `handleLinkDrop` per utilizzare l'API batch-move anche per singoli link:

```tsx
const handleLinkDrop = useCallback(async (linkId: string, folderId: string | null, clearSelection?: () => void) => {
  try {
    // Usa l'API batch-move anche per un singolo link per uniformare il comportamento
    const response = await fetch('/api/links/batch-move', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        linkIds: [linkId],
        folderId,
        sourceFolderId: selectedFolderId === 'all' ? null : selectedFolderId // Passa la cartella di origine
      }),
    });

    if (response.ok) {
      // Aggiorna lo stato locale del link
      setLinks(prev => prev.map(link => 
        link.id === linkId ? { ...link, folder_id: folderId } : link
      ));
      
      // Deselect links after moving
      const clearFunc = clearSelection || clearSelectionRef.current;
      if (clearFunc) {
        clearFunc();
      }
    } else {
      console.error('Errore durante lo spostamento del link');
      showError('Errore durante lo spostamento del link');
    }
  } catch (error) {
    console.error('Errore durante lo spostamento del link:', error);
    showError('Errore durante lo spostamento del link');
  }
}, [showError, selectedFolderId]);
```

## Comportamento atteso

Dopo queste modifiche, il comportamento dello spostamento dei link segue la logica intelligente richiesta:

1. **Da "Tutti i link" a una cartella**: Il link viene aggiunto alla cartella senza essere rimosso da altre cartelle in cui già si trova.
2. **Da una cartella A a una cartella B**: Il link viene rimosso dalla cartella A e aggiunto alla cartella B.
3. **Da una cartella a "Tutti i link"**: Il link viene rimosso solo dalla cartella specifica.

## Test

È stato creato un file `test-drag-drop-behavior.js` che simula le chiamate API per i vari scenari di spostamento e descrive il comportamento atteso.
