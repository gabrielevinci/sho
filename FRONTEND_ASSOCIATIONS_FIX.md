# Correzione del filtraggio frontend per associazioni multiple

## Problema identificato

Il problema principale era che il **frontend non utilizzava correttamente la tabella `link_folder_associations`** per filtrare i link nelle cartelle. Ecco cosa accadeva:

1. ✅ **Database**: Le associazioni multiple venivano salvate correttamente nella tabella `link_folder_associations`
2. ✅ **API**: L'endpoint `/api/links-with-folders` caricava correttamente le associazioni e popolava la proprietà `folders` per ogni link
3. ❌ **Frontend**: Il componente `FolderizedLinksList` filtrava i link usando il campo legacy `folder_id` invece della proprietà `folders`

## Dettaglio del problema

### Prima della correzione
```tsx
// FolderizedLinksList.tsx - getFilteredAndSortedLinks()
result = links.filter(link => {
  if (selectedFolderId === defaultFolderId) {
    return true;
  }
  // PROBLEMA: Usava il campo legacy folder_id
  return link.folder_id === selectedFolderId;
});
```

### Dopo la correzione
```tsx
// FolderizedLinksList.tsx - getFilteredAndSortedLinks()
result = links.filter(link => {
  if (selectedFolderId === defaultFolderId) {
    return true;
  }
  // RISOLTO: Usa la proprietà folders con le associazioni multiple
  return link.folders && link.folders.some(folder => folder.id === selectedFolderId);
});
```

## Modifiche apportate

### 1. Aggiornamento del filtro principale
**File**: `app/dashboard/components/FolderizedLinksList.tsx`  
**Funzione**: `getFilteredAndSortedLinks()`

```tsx
// PRIMA
return link.folder_id === selectedFolderId;

// DOPO
return link.folders && link.folders.some(folder => folder.id === selectedFolderId);
```

### 2. Aggiornamento del conteggio link per cartella
**File**: `app/dashboard/components/FolderizedLinksList.tsx`  
**Funzione**: `getFolderStats()`

```tsx
// PRIMA
const linkCount = links.filter(link => link.folder_id === folderId).length;

// DOPO
const linkCount = links.filter(link => 
  link.folders && link.folders.some(folder => folder.id === folderId)
).length;
```

## Flow di funzionamento corretto

```
1. USER ACTION: Sposta link da "Tutti i link" a "Cartella A"
   ↓
2. API CALL: /api/links/batch-move con sourceFolderId=null
   ↓
3. DATABASE: Aggiunge riga in link_folder_associations (link_id, folder_A)
   ↓
4. FRONTEND: Ricarica i link con /api/links-with-folders
   ↓
5. API RESPONSE: Link ha proprietà folders=[{id: "folder_A", name: "Cartella A"}]
   ↓
6. FRONTEND FILTER: link.folders.some(folder => folder.id === selectedFolderId)
   ↓
7. RESULT: Link appare in "Cartella A"

8. USER ACTION: Sposta lo stesso link da "Tutti i link" a "Cartella B"
   ↓
9. API CALL: /api/links/batch-move con sourceFolderId=null
   ↓
10. DATABASE: Aggiunge riga in link_folder_associations (link_id, folder_B)
    ↓
11. FRONTEND: Ricarica i link con /api/links-with-folders
    ↓
12. API RESPONSE: Link ha proprietà folders=[
     {id: "folder_A", name: "Cartella A"},
     {id: "folder_B", name: "Cartella B"}
   ]
    ↓
13. FRONTEND FILTER: Quando selectedFolderId="folder_A" → TROVA il link
                    Quando selectedFolderId="folder_B" → TROVA il link
    ↓
14. RESULT: Link appare sia in "Cartella A" che in "Cartella B" ✅
```

## Struttura dati

### Struttura del link con associazioni multiple
```typescript
interface LinkWithFolders {
  id: string;
  short_code: string;
  original_url: string;
  title: string | null;
  description: string | null;
  created_at: Date;
  click_count: number;
  unique_click_count: number;
  folder_id: string | null; // Campo legacy (mantenuto per compatibilità)
  folders: Array<{           // NUOVA PROPRIETÀ - Utilizzata per il filtraggio
    id: string;
    name: string;
    parent_folder_id: string | null;
  }>;
}
```

### Database schema
```sql
-- Tabella principale (campo legacy mantenuto)
CREATE TABLE links (
  id INTEGER PRIMARY KEY,
  folder_id INTEGER REFERENCES folders(id), -- LEGACY: usato solo per compatibilità
  -- altri campi...
);

-- Nuova tabella per associazioni multiple (FONTE DI VERITÀ)
CREATE TABLE link_folder_associations (
  link_id INTEGER REFERENCES links(id),
  folder_id INTEGER REFERENCES folders(id),
  user_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (link_id, folder_id)
);
```

## Test di verifica

### Scenario completo di test
1. **Setup**: Creare cartelle "Test A", "Test B", "Test C"
2. **Azione 1**: Spostare link da "Tutti i link" → "Test A"
   - **Atteso**: Link appare in "Test A"
3. **Azione 2**: Spostare lo stesso link da "Tutti i link" → "Test B"
   - **Atteso**: Link appare in "Test A" E "Test B"
4. **Azione 3**: Spostare il link da "Test A" → "Test C"
   - **Atteso**: Link appare in "Test B" E "Test C" (NON più in "Test A")

### Query di debug
```sql
-- Verificare le associazioni nel database
SELECT 
  l.short_code,
  l.title,
  l.folder_id as legacy_folder,
  f.name as legacy_folder_name,
  STRING_AGG(f2.name, ', ') as associated_folders
FROM links l
LEFT JOIN folders f ON l.folder_id = f.id
LEFT JOIN link_folder_associations lfa ON l.id = lfa.link_id
LEFT JOIN folders f2 ON lfa.folder_id = f2.id
GROUP BY l.id, l.short_code, l.title, l.folder_id, f.name
ORDER BY l.created_at DESC;
```

## Benefici della correzione

1. **Funzionalità corretta**: I link appaiono ora in tutte le cartelle associate
2. **Coerenza dati**: Frontend e database sono allineati
3. **Conteggi corretti**: Il numero di link per cartella è calcolato correttamente
4. **Esperienza utente migliorata**: La logica intelligente di spostamento funziona come previsto

## Note per il futuro

- Il campo `folder_id` nella tabella `links` è mantenuto per compatibilità ma non dovrebbe essere usato per il filtraggio
- La fonte di verità per le associazioni link-cartella è la tabella `link_folder_associations`
- Il frontend dovrebbe sempre utilizzare la proprietà `folders` per determinare l'appartenenza di un link alle cartelle
- Le API sono già configurate correttamente per supportare questa logica

**La correzione risolve completamente il problema segnalato: ora i link vengono mostrati correttamente in tutte le cartelle multiple a cui sono associati.** ✅
