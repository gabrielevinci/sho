# Correzione logica Click Unici per Date Personalizzate

## Problema Identificato

Nel filtro "date personalizzate", il calcolo dei click unici non considerava correttamente la storia completa dei fingerprint. Il sistema calcolava il `ROW_NUMBER()` solo sui click all'interno dell'intervallo selezionato, invece che su tutti i click del link.

### Comportamento Errato (Prima)

```sql
-- SBAGLIATO: Prima filtrava per data, poi calcolava ROW_NUMBER
WITH clicks_in_range AS (
  SELECT clicked_at_rome, click_fingerprint_hash
  FROM clicks
  WHERE link_id = ? AND clicked_at_rome BETWEEN start_date AND end_date
),
ranked_clicks AS (
  SELECT *, ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
  FROM clicks_in_range  -- ❌ ROW_NUMBER calcolato solo sui click nel periodo
)
```

### Comportamento Corretto (Dopo)

```sql
-- CORRETTO: Prima calcola ROW_NUMBER su tutti i click, poi filtra per data
WITH all_clicks_ranked AS (
  SELECT *, ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
  FROM clicks
  WHERE link_id = ?  -- ✅ ROW_NUMBER calcolato su tutti i click del link
),
clicks_in_range AS (
  SELECT * FROM all_clicks_ranked
  WHERE clicked_at_rome BETWEEN start_date AND end_date
)
```

## File Modificati

### 1. `/app/api/stats/[shortCode]/route.ts`
- **Linee modificate**: ~175-195
- **Descrizione**: Corretto il calcolo dei click unici per le statistiche delle card quando si usa il filtro custom

### 2. `/app/dashboard/stats/[shortCode]/components/route.ts`
- **Linee modificate**: ~295-340
- **Descrizione**: Corretto il calcolo dei click unici per il grafico "Andamento click" quando si usa il filtro custom

### 3. `/app/api/links/[shortCode]/stats/route.ts`
- **Linee modificate**: ~298-345
- **Descrizione**: Corretto il calcolo dei click unici per il grafico "Andamento click" (endpoint utilizzato dal componente StatsChart)

## Logica della Correzione

### Scenario di Esempio

Supponiamo di avere questi click per un link:
- **2024-01-01**: fingerprint "abc123" (primo click di questo utente)
- **2024-01-15**: fingerprint "abc123" (secondo click dello stesso utente)
- **2024-02-01**: fingerprint "def456" (primo click di questo nuovo utente)
- **2024-02-05**: fingerprint "abc123" (terzo click del primo utente)

### Filtro: 2024-02-01 to 2024-02-28

**Prima (errato):**
- Click totali nel periodo: 2
- Click unici nel periodo: 2 (abc123 e def456 entrambi considerati "primi" nel periodo)

**Dopo (corretto):**
- Click totali nel periodo: 2
- Click unici nel periodo: 1 (solo def456 è veramente un primo click, abc123 era già apparso prima)

## Test

Un file SQL di test (`test-unique-clicks-logic.sql`) è stato creato per dimostrare la differenza tra le due logiche.

## Impatto

Questa correzione assicura che:
1. I click unici siano calcolati correttamente per qualsiasi intervallo di date personalizzate
2. Un utente sia considerato "unico" solo se è la sua prima visita in assoluto, non solo nel periodo selezionato
3. Le statistiche siano coerenti indipendentemente dal filtro temporale utilizzato

La modifica è retrocompatibile e non influisce sui filtri predefiniti (24h, 7d, 30d, etc.) che già utilizzavano la logica corretta.
