## CORREZIONI QUERY ANALYTICS SINGOLO LINK

### 📋 RIEPILOGO PROBLEMI IDENTIFICATI

1. **PROBLEMA CRITICO**: `period_stats` non rispetta i filtri temporali
2. **PROBLEMA ALTO**: Logica CASE WHEN inconsistente tra metriche  
3. **PROBLEMA ALTO**: Calcolo unique visitors inconsistente tra query
4. **PROBLEMA MEDIO**: Duplicazione logica nelle serie temporali

### 🔧 CORREZIONI DA APPLICARE

#### 1. Helper Functions (AGGIUNGERE PRIMA della funzione getLinkData)

```typescript
// Helper per creare filtri temporali uniformi
function buildDateFilter(startDate?: string, endDate?: string, paramStartIndex: number = 4) {
  if (!startDate || !endDate) {
    return {
      condition: '',
      params: []
    };
  }
  
  return {
    condition: `AND c.clicked_at_rome >= $${paramStartIndex}::timestamptz AND c.clicked_at_rome <= $${paramStartIndex + 1}::timestamptz`,
    params: [startDate, endDate]
  };
}

// Helper per unique visitors uniformi 
function getUniqueVisitorLogic() {
  return `COALESCE(fc.device_cluster_id, ef.fingerprint_hash, c.user_fingerprint)`;
}
```

#### 2. Correzione getFilteredClickAnalytics (SOSTITUIRE COMPLETAMENTE)

Il problema principale è che `period_stats` non rispetta i filtri temporali. La versione corretta:

- Usa una sola CTE `filtered_clicks` come fonte di verità
- `period_stats` rispetta i filtri quando presenti
- Elimina la logica CASE WHEN confusa
- Unifica il calcolo unique visitors

#### 3. Correzione altre funzioni (getFilteredGeographicData, getFilteredDeviceData, etc.)

Tutte devono usare:
- `buildDateFilter()` per filtri uniformi
- `getUniqueVisitorLogic()` per unique visitors uniformi

### 🧪 COME TESTARE LE CORREZIONI

1. **Test Manuale nel Browser:**
   ```
   1. Vai su analytics di un link
   2. Seleziona filtro "24 ore"
   3. Verifica che:
      - total_clicks = somma del grafico orario
      - clicks_today = total_clicks (stesso valore!)
      - unique_clicks coerente ovunque
   ```

2. **Test con Console Browser:**
   ```javascript
   // Nel browser, su pagina analytics
   fetch('/api/analytics/SHORTCODE?filterType=today&startDate=...&endDate=...')
     .then(r => r.json())
     .then(data => {
       console.log('Total clicks:', data.clickAnalytics.total_clicks);
       console.log('Clicks today:', data.clickAnalytics.clicks_today);
       console.log('Should be equal for today filter!');
     });
   ```

3. **Test URL diretti:**
   ```
   http://localhost:3000/api/analytics/SHORTCODE?filterType=today&startDate=2025-07-18T16:00:00Z&endDate=2025-07-19T16:00:00Z
   http://localhost:3000/api/analytics/SHORTCODE?filterType=week&startDate=2025-07-12T16:00:00Z&endDate=2025-07-19T16:00:00Z
   http://localhost:3000/api/analytics/SHORTCODE?filterType=all
   ```

### ✅ RISULTATI ATTESI DOPO LE CORREZIONI

#### Filtro "Today" (24 ore):
- `total_clicks` = click nelle ultime 24 ore
- `clicks_today` = `total_clicks` (stesso valore!)
- `unique_clicks` = unique visitors nelle ultime 24 ore
- Grafici e statistiche coerenti

#### Filtro "Week" (7 giorni):
- `total_clicks` = click negli ultimi 7 giorni  
- `clicks_this_week` = `total_clicks` (stesso valore!)
- `unique_clicks` = unique visitors negli ultimi 7 giorni

#### Filtro "Month" (30 giorni):
- `total_clicks` = click negli ultimi 30 giorni
- `clicks_this_month` = `total_clicks` (stesso valore!)
- `unique_clicks` = unique visitors negli ultimi 30 giorni

#### Nessun Filtro ("All"):
- `total_clicks` = tutti i click dal link creato
- `clicks_today` = click nelle ultime 24 ore dal totale
- `clicks_this_week` = click negli ultimi 7 giorni dal totale
- `clicks_this_month` = click negli ultimi 30 giorni dal totale

### 🚨 VERIFICA FINALE

Dopo aver applicato le correzioni, verifica che:

1. ✅ **Coerenza filtri**: period_stats rispetta startDate/endDate
2. ✅ **Unique visitors uniformi**: stessa logica in tutte le query
3. ✅ **Eliminato CASE WHEN**: sempre dati da query filtrata
4. ✅ **Performance**: query ottimizzate con CTE riutilizzabili

### 📝 NOTA IMPLEMENTAZIONE

Le correzioni richiedono modifiche estensive alla funzione `getFilteredClickAnalytics` e alle funzioni ausiliarie. 

Il file `test-complete-analytics.js` contiene tutti i test case da verificare dopo l'implementazione.

### 🎯 PRIORITÀ

1. **IMMEDIATA**: Correggere `getFilteredClickAnalytics` (problema critico)
2. **ALTA**: Unificare helper functions per unique visitors
3. **MEDIA**: Aggiornare le altre funzioni per coerenza
4. **BASSA**: Ottimizzare performance query

### 💡 BENEFICI DELLE CORREZIONI

- ✅ Filtri temporali funzionano correttamente
- ✅ Statistiche coerenti tra sezioni
- ✅ Codice più mantenibile e testabile
- ✅ Performance migliori con query unificate
- ✅ Meno confusione per gli utenti
