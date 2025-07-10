# Test Manual per Verificare il Bug delle Associazioni

## Problema Identificato
Il bug si verifica quando:
1. Un link viene spostato da "Tutti i link" a una cartella specifica
2. Dopo il reload della pagina, il link non appare più nella cartella
3. Ma nel database le associazioni sono presenti correttamente

## Fix Applicato
Nell'API `/api/links-with-folders` (linea ~110):
```typescript
// PRIMA (potenziale mismatch tipi):
foldersByLink.get(assoc.link_id)

// DOPO (fix applicato):
foldersByLink.get(String(assoc.link_id))
```

## Passi per il Test Manuale

### 1. Preparazione
1. Avvia il server: `npm run dev`
2. Apri il browser su `http://localhost:3001/dashboard`
3. Assicurati di essere loggato
4. Assicurati di avere almeno una cartella diversa da "Tutti i link"

### 2. Test del Bug
1. **Vai nella cartella "Tutti i link"**
2. **Trova un link** che non è ancora in nessuna cartella
3. **Sposta il link** in una cartella specifica (usando drag & drop o "Sposta in")
4. **Verifica immediata**: il link dovrebbe sparire da "Tutti i link" e apparire nella cartella
5. **Test critico**: **Ricarica la pagina** (F5 o Ctrl+R)
6. **Vai nella cartella** dove hai spostato il link
7. **Verifica**: il link dovrebbe essere presente nella cartella

### 3. Risultati Attesi
- ✅ **SUCCESSO**: Il link appare nella cartella dopo il reload
- ❌ **FALLIMENTO**: Il link non appare nella cartella dopo il reload

### 4. Debug Aggiuntivo (se necessario)
Se il bug persiste, controllla i log del browser:
1. Apri DevTools (F12)
2. Vai su Network tab
3. Ricarica la pagina
4. Trova la chiamata `/api/links-with-folders`
5. Controlla la response per vedere se le associazioni sono presenti

### 5. Alternative di Test
Se non hai link o cartelle, puoi:
1. Creare un nuovo link dalla dashboard
2. Creare una nuova cartella
3. Spostare il link appena creato

## Note Tecniche
- Il fix risolve un potenziale mismatch tra tipi `number` e `string` per gli ID
- La mappa `foldersByLink` ora usa sempre chiavi stringhe
- Questo dovrebbe garantire che le associazioni vengano trovate correttamente

## Conclusione
Se dopo questo test il bug persiste, sarà necessario investigare:
1. La presenza effettiva delle associazioni nel database
2. Altri aspetti della query SQL
3. La logica di filtering lato frontend
