// Versione del codice da usare DOPO aver eseguito la migrazione del database
// Sostituirà il codice temporaneo in app/[shortCode]/route.ts

// Record the click data (versione completa con colonna os)
await sql`
  INSERT INTO clicks 
    (link_id, country, referrer, browser_name, device_type, os, user_fingerprint, clicked_at_rome) 
  VALUES (
    ${linkId}, ${country}, ${referrer}, ${browserName}, ${deviceType}, 
    ${osName}, ${userFingerprint}, 
    NOW() AT TIME ZONE 'Europe/Rome'
  )
`;

/* 
ISTRUZIONI PER IL RIPRISTINO:
1. Eseguire prima lo script SQL add_os_column_to_clicks.sql
2. Sostituire il codice INSERT nella funzione recordClick con questo codice
3. Rimuovere il commento temporaneo
4. Ridistribuire l'applicazione
*/
