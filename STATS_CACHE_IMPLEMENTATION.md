# Sistema di Cache delle Statistiche

## Panoramica

Il nuovo sistema di cache delle statistiche migliora significativamente le performance della pagina `/stats/[shortCode]` implementando un caricamento unico dei dati con filtri locali.

## Come Funziona

### 1. Caricamento Iniziale
- Quando l'utente accede alla pagina di statistiche, viene effettuata **una sola richiesta** al database
- L'API restituisce tutti i dati statistici per tutti i periodi temporali (sempre, 24h, 7d, 30d, 90d, 365d)
- I dati vengono memorizzati nella cache SWR con TTL di 5 minuti

### 2. Filtraggio Locale
- Il cambio di filtro temporale NON causa nuove richieste al database
- I dati vengono filtrati localmente usando la cache
- Il cambio di filtro è istantaneo per i filtri predefiniti

### 3. Date Personalizzate
- Le date personalizzate richiedono una query specifica al database
- I risultati vengono memorizzati in una cache locale separata
- Cache persistente tra i cambi di filtro

## Architettura

### Hook `useStatsCache`
- **Posizione**: `/app/hooks/use-stats-cache.ts`
- **Responsabilità**: Gestisce la cache e il filtraggio dei dati
- **API**:
  - `getImmediateStats(filter)`: Dati immediati dalla cache
  - `getStatsForFilter(filter, startDate?, endDate?)`: Dati con eventuale richiesta async
  - `invalidateCache()`: Pulisce tutta la cache

### API Route Modificata
- **Endpoint**: `/api/stats/[shortCode]`
- **Nuovo parametro**: `mode=all` per recuperare tutti i dati
- **Compatibilità**: Mantiene la compatibilità con richieste specifiche per filtro

### Pagina Statistiche
- **Posizione**: `/app/dashboard/stats/[shortCode]/page.tsx`
- **Migrazione**: Utilizza il nuovo hook invece di fetch diretti
- **UX**: Indicatori di caricamento specifici per diversi stati

## Benefici

### Performance
- **Riduzione delle richieste**: Da N richieste (una per filtro) a 1 richiesta iniziale
- **Latenza ridotta**: Cambio filtro istantaneo per filtri predefiniti
- **Meno carico sul database**: Neon database più efficiente

### User Experience
- **Navigazione fluida**: Nessun loading durante il cambio filtri
- **Feedback visivo**: Indicatori di caricamento appropriati
- **Cache persistente**: Dati disponibili anche dopo cambio di pagina

### Manutenibilità
- **Codice modulare**: Hook separato per logica di cache
- **Riusabilità**: Sistema estendibile ad altre pagine statistiche
- **Debug facilitato**: Separazione chiara tra cache e UI

## File Modificati

1. **`/app/hooks/use-stats-cache.ts`** (nuovo)
   - Hook personalizzato per gestione cache
   - Tipi TypeScript per dati statistiche
   - Cache locale per date personalizzate

2. **`/app/api/stats/[shortCode]/route.ts`**
   - Supporto parametro `mode=all`
   - Ottimizzazione query SQL
   - Mantenimento compatibilità

3. **`/app/dashboard/stats/[shortCode]/page.tsx`**
   - Migrazione al nuovo hook
   - UI per stati di caricamento
   - Rimozione fetch multipli

4. **`/app/lib/cache.ts`**
   - Nuove funzioni di cache server-side
   - Invalidazione cache statistiche
   - TTL ottimizzati

## Cache Strategy

### Client-Side (SWR)
- **TTL**: 5 minuti per dati completi
- **Dedupe**: 1 minuto per richieste duplicate
- **Revalidazione**: Su focus disabilitata per evitare refresh indesiderati

### Server-Side (Next.js)
- **Cache Layer**: `unstable_cache` per prestazioni
- **Invalidazione**: Tag-based per aggiornamenti selettivi
- **Fallback**: Dati vuoti se nessuna statistica presente

### Date Personalizzate
- **Cache Map**: Locale al componente
- **Key Strategy**: `${shortCode}-${startDate}-${endDate}`
- **Persistenza**: Durante la sessione di navigazione

## Ottimizzazioni Future

1. **Background Refresh**: Aggiornamento dati in background
2. **Progressive Loading**: Caricamento scaglionato delle metriche
3. **Compressione**: Riduzione dimensione dati trasferiti
4. **Service Worker**: Cache offline per statistiche

## Monitoraggio

- Verificare performance migliorata tramite DevTools
- Monitorare richieste di rete ridotte
- Controllare utilizzo memoria per cache estese
- Misurare tempo di risposta cambio filtri
