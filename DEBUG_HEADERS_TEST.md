🔍 **DEBUG HEADERS CROSS-BROWSER**

## 🚀 Test degli Headers

Per capire perché Firefox ha un IP hash diverso, testa questo endpoint con ogni browser:

### 1️⃣ Chrome
Apri: `http://localhost:3000/api/debug-headers`

### 2️⃣ Firefox  
Apri: `http://localhost:3000/api/debug-headers`

### 3️⃣ Edge
Apri: `http://localhost:3000/api/debug-headers`

## 📊 Analisi

Confronta i risultati e cerca differenze in:

### 🌐 IP Sources
- `x-forwarded-for`
- `x-real-ip` 
- `x-vercel-forwarded-for`

### 📍 Geolocation Headers
- `x-vercel-ip-timezone`
- `x-vercel-ip-country`
- `x-vercel-ip-city`

### 🔧 Browser Info
- `user-agent`
- `accept-language`
- `accept-encoding`

## 🎯 Cosa Cercare

**Possibili cause IP hash diverso:**

1. **IPv4 vs IPv6**: Firefox potrebbe preferire IPv6
2. **Proxy/DNS**: Firefox ha impostazioni proxy diverse
3. **Headers mancanti**: Alcuni headers non arrivano per Firefox
4. **Ordine headers**: Diversa prioritizzazione IP sources

**Soluzioni potenziali:**

- Normalizzare estrazione IP
- Usare fallback per headers mancanti  
- Ignorare differenze IPv4/IPv6
- Standardizzare timezone detection

---

📝 **Invia i risultati JSON** di tutti e 3 i browser per analisi dettagliata!
