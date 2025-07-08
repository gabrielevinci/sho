# Database Migration Guide - Add OS Column to Clicks Table

## Issue RISOLTO TEMPORANEAMENTE
Il problema dei click non registrati è stato risolto temporaneamente rimuovendo la colonna `os` dall'INSERT. 
I click vengono ora registrati correttamente, ma senza informazioni sull'OS.

## Soluzione Permanente
Per ripristinare il tracking completo dell'OS, segui questi passaggi:

### Passo 1: Eseguire la Migrazione Database
1. Vai al dashboard Vercel
2. Naviga al tuo progetto
3. Vai alla tab "Storage"
4. Clicca sul tuo database Postgres
5. Vai alla tab "Query"
6. Copia e incolla il contenuto di `add_os_column_to_clicks.sql`
7. Esegui la query

### Passo 2: Ripristinare il Codice Completo
Dopo aver eseguito la migrazione, sostituisci il codice INSERT nella funzione `recordClick` in `app/[shortCode]/route.ts`:

```typescript
// Sostituire questo codice temporaneo:
await sql`
  INSERT INTO clicks 
    (link_id, country, referrer, browser_name, device_type, user_fingerprint, clicked_at_rome) 
  VALUES (
    ${linkId}, ${country}, ${referrer}, ${browserName}, ${deviceType}, 
    ${userFingerprint}, 
    NOW() AT TIME ZONE 'Europe/Rome'
  )
`;

// Con questo codice completo:
await sql`
  INSERT INTO clicks 
    (link_id, country, referrer, browser_name, device_type, os, user_fingerprint, clicked_at_rome) 
  VALUES (
    ${linkId}, ${country}, ${referrer}, ${browserName}, ${deviceType}, 
    ${osName}, ${userFingerprint}, 
    NOW() AT TIME ZONE 'Europe/Rome'
  )
`;
```

### Passo 3: Ridistribuire
Dopo aver fatto le modifiche, ridistribuisci l'applicazione.

## Stato Attuale
✅ **I click vengono registrati correttamente** (senza dati OS)
✅ **I contatori vengono aggiornati**
✅ **L'applicazione funziona senza errori**
⏳ **Il tracking dell'OS sarà disponibile dopo la migrazione**

## Verifica
Dopo aver completato tutti i passaggi, verifica che tutto funzioni:
1. Testa alcuni click sui tuoi link
2. Controlla che i contatori si aggiornino
3. Verifica che le analytics mostrino i dati dell'OS
