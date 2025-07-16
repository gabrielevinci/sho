🧪 **TEST CORRELAZIONE CROSS-BROWSER**

## 📋 Istruzioni per il Test

### 1️⃣ Preparazione
1. Assicurati che il server di sviluppo sia in esecuzione:
   ```bash
   npm run dev
   ```
2. Vai su http://localhost:3000/dashboard
3. Crea un nuovo link di test (es. https://google.com) e copia il short code

### 2️⃣ Test Cross-Browser
1. **Chrome**: Apri `http://localhost:3000/[TUO_SHORT_CODE]`
2. **Firefox**: Apri `http://localhost:3000/[TUO_SHORT_CODE]`  
3. **Edge**: Apri `http://localhost:3000/[TUO_SHORT_CODE]`

### 3️⃣ Verifica Database

#### Query 1: Controlla i fingerprint generati
```sql
SELECT 
  device_fingerprint,
  browser_fingerprint,
  browser_type,
  ip_hash,
  os_family,
  confidence,
  created_at
FROM enhanced_fingerprints 
WHERE created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
```

#### Query 2: Verifica correlazione dispositivi
```sql
SELECT 
  device_fingerprint,
  COUNT(DISTINCT browser_fingerprint) as different_browsers,
  COUNT(*) as total_visits,
  STRING_AGG(DISTINCT browser_type, ', ') as browsers_used
FROM enhanced_fingerprints 
WHERE created_at >= NOW() - INTERVAL '10 minutes'
GROUP BY device_fingerprint;
```

#### Query 3: Conteggio unique visitors per link
```sql
SELECT 
  l.short_code,
  l.original_url,
  COUNT(DISTINCT ef.device_fingerprint) as unique_devices,
  COUNT(DISTINCT ef.browser_fingerprint) as unique_browsers,
  COUNT(c.id) as total_clicks,
  l.unique_click_count as recorded_unique_clicks
FROM clicks c
JOIN links l ON l.id = c.link_id  
JOIN enhanced_fingerprints ef ON ef.browser_fingerprint = c.user_fingerprint
WHERE l.short_code = '[TUO_SHORT_CODE]'
GROUP BY l.short_code, l.original_url, l.unique_click_count;
```

### 4️⃣ Risultati Attesi ✅

Con il sistema corretto dovresti vedere:

**Query 1**: 3 righe con:
- ✅ STESSO `device_fingerprint` per tutti
- ✅ DIVERSI `browser_fingerprint` 
- ✅ `browser_type`: chrome, firefox, edge

**Query 2**: 1 riga con:
- ✅ `different_browsers`: 3
- ✅ `total_visits`: 3
- ✅ `browsers_used`: chrome, firefox, edge

**Query 3**: 1 riga con:
- ✅ `unique_devices`: 1 (stesso dispositivo fisico)
- ✅ `unique_browsers`: 3 (tre browser diversi)
- ✅ `total_clicks`: 3
- ✅ `recorded_unique_clicks`: 1 (contato come 1 visitatore unico!)

### 5️⃣ Risoluzione Problemi 🔧

**Se vedi device_fingerprint diversi:**
- Controlla che tutti i test siano fatti dallo stesso IP
- Verifica che il timezone sia identico
- Assicurati di non usare VPN/proxy diversi

**Se unique_click_count > 1:**
- Il sistema sta contando browser diversi come visitatori separati
- Controlla i log del server per debug info

**Debug logging:**
Il sistema stampa info dettagliate in modalità development. Controlla il terminale per:
```
Enhanced fingerprint check: {
  isUnique: true/false,
  reason: "...",
  deviceFingerprint: "...",
  confidence: 100
}
```

### 6️⃣ Test Aggiuntivi 🔬

**Test modalità incognito:**
1. Apri il link in Chrome normale
2. Apri lo stesso link in Chrome incognito
3. Dovrebbero avere STESSO `device_fingerprint`

**Test dispositivi diversi:**
1. Testa dal PC
2. Testa dal telefono (diverso IP/rete)
3. Dovrebbero avere DIVERSI `device_fingerprint`

---

📝 **Nota**: Se questo è il primo test dopo l'aggiornamento del codice, potresti vedere nel database anche record vecchi con hash diversi. Concentrati sui record creati DOPO il test.
