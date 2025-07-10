# Correzione alla gestione dello switch di visualizzazione

## Problema risolto

Quando lo switch di visualizzazione in /dashboard veniva disattivato, i link venivano rimossi dalle loro cartelle multiple durante le operazioni di spostamento. Questo accadeva perché:

1. Lo switch `enableMultipleFolders` nel componente `ViewModeToggle` determinava non solo le funzionalità dell'interfaccia utente, ma anche quale API utilizzare per il caricamento e la gestione dei link.
2. Quando lo switch era disattivato, il sistema passava all'API tradizionale che non supporta le cartelle multiple, causando la perdita delle associazioni multiple quando si spostavano i link.

## Modifiche apportate

### 1. Mantenere sempre attiva l'API avanzata

Nel file `dashboard-client.tsx` abbiamo modificato la gestione dello switch per mantenere sempre attiva l'API che supporta le cartelle multiple, cambiando solo l'interfaccia utente:

```tsx
const handleToggleMultipleFolders = useCallback((enabled: boolean) => {
  setEnableMultipleFolders(enabled);
  // Non cambiare l'API utilizzata, manteniamo sempre attiva quella con supporto alle cartelle multiple
  // In questo modo preserviamo le associazioni multiple anche quando il toggle è disattivo
  setUseMultipleFoldersApi(true); 
  
  if (enabled) {
    success('Modalità cartelle multiple attivata');
  } else {
    setShowMultipleFoldersColumn(false);
    success('Modalità cartelle multiple disattivata');
  }
  
  // Ricarica i link sempre con l'API avanzata
  handleUpdateLinks();
}, [success, handleUpdateLinks]);
```

Inoltre, abbiamo impostato `useMultipleFoldersApi` a `true` di default all'inizializzazione del componente.

### 2. Preservare i riferimenti alle cartelle multiple

Abbiamo modificato la funzione `handleUpdateLink` per preservare i riferimenti alle cartelle multiple quando un link viene aggiornato:

```tsx
const handleUpdateLink = useCallback((shortCode: string, updates: Partial<LinkFromDB>) => {
  setLinks(prev => prev.map(link => {
    if (link.short_code === shortCode) {
      // Preserviamo i riferimenti alle cartelle multiple anche quando si aggiorna il link
      // così non perdiamo le associazioni multiple quando si sposta un link
      return { 
        ...link, 
        ...updates,
        // Se si sta impostando un nuovo folder_id ma il link ha già folders, manteniamoli
        folders: updates.folders || link.folders
      };
    }
    return link;
  }));
}, []);
```

## Comportamento atteso

Dopo queste modifiche:

1. L'interfaccia utente rispetta ancora lo stato dello switch di visualizzazione (mostrano o nascondono la colonna delle cartelle e le funzionalità relative alle cartelle multiple).
2. Indipendentemente dallo stato dello switch, il sistema utilizza sempre l'API avanzata che supporta le cartelle multiple.
3. Le associazioni multiple vengono preservate anche quando lo switch è disattivato.
4. Quando un link viene spostato da "Tutti i link" a una cartella, viene aggiunto a quella cartella senza essere rimosso dalle altre cartelle in cui già si trova.
5. Quando viene spostato da una cartella A a una cartella B, viene rimosso da A e aggiunto a B.
6. Quando viene spostato da una cartella a "Tutti i link", viene rimosso solo da quella cartella.

Questa soluzione consente agli utenti di scegliere l'interfaccia che preferiscono senza perdere le funzionalità avanzate e i dati relativi alle cartelle multiple.
