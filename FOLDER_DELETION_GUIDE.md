# Gestione Eliminazione Cartelle

## Panoramica
Il sistema di eliminazione delle cartelle è progettato per essere sicuro e intuitivo, proteggendo i dati degli utenti e mantenendo l'integrità del sistema.

## Funzionalità implementate

### 🔒 **Protezione cartella predefinita**
- La cartella "Tutti i link" non può essere eliminata
- Messaggio di avviso specifico quando si tenta di eliminarla
- Controllo sia lato client che lato server

### 🗑️ **Eliminazione sicura**
- **Conferma dettagliata**: Modal personalizzato con informazioni chiare
- **Spostamento automatico**: I link vengono spostati in "Tutti i link" prima dell'eliminazione
- **Eliminazione ricorsiva**: Sottocartelle eliminate automaticamente
- **Rollback**: Nessuna perdita di dati grazie al sistema di spostamento

### 🎯 **Workflow di eliminazione**

1. **Richiesta eliminazione**: L'utente clicca sull'icona elimina
2. **Verifica permessi**: Controllo se è la cartella predefinita
3. **Modal di conferma**: Mostra dettagli dell'operazione
4. **Spostamento link**: Tutti i link vengono spostati in "Tutti i link"
5. **Eliminazione cartella**: Rimozione della cartella e sottocartelle
6. **Aggiornamento UI**: Refresh della visualizzazione

## Implementazione tecnica

### Database
```sql
-- Spostamento automatico dei link prima dell'eliminazione
UPDATE links 
SET folder_id = (
  SELECT f.id FROM folders f 
  WHERE f.workspace_id = [WORKSPACE_ID] 
  AND f.name = 'Tutti i link'
)
WHERE folder_id = [FOLDER_TO_DELETE];

-- Gestione sottocartelle con query ricorsiva
WITH RECURSIVE folder_tree AS (
  SELECT id FROM folders WHERE id = [FOLDER_TO_DELETE]
  UNION ALL
  SELECT f.id FROM folders f
  INNER JOIN folder_tree ft ON f.parent_folder_id = ft.id
)
UPDATE links 
SET folder_id = [DEFAULT_FOLDER_ID]
WHERE folder_id IN (SELECT id FROM folder_tree);
```

### API Endpoint
- **Route**: `DELETE /api/folders?folderId={id}`
- **Validazione**: Verifica ownership e cartella predefinita
- **Transazione**: Spostamento + eliminazione atomica
- **Risposta**: Messaggio di successo/errore dettagliato

### Componenti React
- **DeleteFolderModal**: Modal di conferma personalizzato
- **FolderSidebar**: Gestione stato eliminazione
- **Animazioni**: Feedback visivo durante l'operazione

## Sicurezza e validazione

### Controlli lato server
- ✅ Verifica autenticazione utente
- ✅ Controllo ownership della cartella
- ✅ Prevenzione eliminazione cartella predefinita
- ✅ Transazioni atomiche per integrità dati

### Controlli lato client
- ✅ Validazione preventiva
- ✅ Conferma utente esplicita
- ✅ Feedback visivo durante operazioni
- ✅ Gestione errori con messaggi utili

## Messaggi e UX

### Modal di conferma
- **Titolo**: "Elimina cartella" / "Azione non consentita"
- **Descrizione**: Dettagli dell'operazione
- **Avvertimenti**: Lista delle conseguenze
- **Pulsanti**: Annulla / Elimina (con loading state)

### Feedback operazioni
- **Successo**: "Cartella eliminata con successo. I link sono stati spostati nella cartella 'Tutti i link'."
- **Errore**: Messaggi specifici per ogni tipo di errore
- **Caricamento**: Spinner e testo "Eliminando..."

## Considerazioni future

### Possibili miglioramenti
1. **Undo/Redo**: Possibilità di annullare l'eliminazione
2. **Backup**: Esportazione automatica prima dell'eliminazione
3. **Bulk operations**: Eliminazione multipla di cartelle
4. **Trash/Cestino**: Eliminazione soft con recupero
5. **Audit log**: Tracciamento delle operazioni di eliminazione

### Performance
- Query ricorsive ottimizzate per grandi alberi di cartelle
- Transazioni atomiche per evitare stati inconsistenti
- Caching invalidation automatica dopo eliminazioni

## Testing

### Test cases da verificare
1. Eliminazione cartella vuota
2. Eliminazione cartella con link
3. Eliminazione cartella con sottocartelle
4. Tentativo eliminazione cartella predefinita
5. Eliminazione con errori di rete
6. Eliminazione senza permessi

### Edge cases
- Cartelle orfane (parent eliminato)
- Operazioni concorrenti
- Interruzioni di rete durante eliminazione
- Workspace eliminati contemporaneamente
