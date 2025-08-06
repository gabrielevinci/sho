-- Test per dimostrare la differenza nella logica dei click unici
-- per filtri con date personalizzate

-- Scenario di test:
-- Supponiamo di avere un link con ID 123 e questi click:
-- - 2024-01-01: hash "abc123" (primo click di questo hash)
-- - 2024-01-15: hash "abc123" (secondo click dello stesso hash)
-- - 2024-02-01: hash "def456" (primo click di questo hash)
-- - 2024-02-05: hash "abc123" (terzo click del primo hash)

-- Se filtriamo per il periodo 2024-02-01 to 2024-02-28:

-- ============================================
-- LOGICA VECCHIA (ERRATA):
-- ============================================
-- Prima filtrava i click nell'intervallo, poi calcolava ROW_NUMBER
-- Risultato: 2 click unici (perché "abc123" e "def456" vengono visti come primi nel periodo)

WITH old_logic_clicks_in_range AS (
  SELECT
    clicked_at_rome,
    click_fingerprint_hash
  FROM
    clicks
  WHERE
    link_id = 123
    AND clicked_at_rome >= '2024-02-01'::date 
    AND clicked_at_rome < ('2024-02-28'::date + INTERVAL '1 day')
),
old_logic_ranked AS (
  SELECT
    clicked_at_rome,
    click_fingerprint_hash,
    ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
  FROM
    old_logic_clicks_in_range
)
SELECT 
  'LOGICA VECCHIA (ERRATA)' as tipo,
  COUNT(*) as click_totali,
  COUNT(*) FILTER (WHERE rn = 1) as click_unici
FROM old_logic_ranked

UNION ALL

-- ============================================
-- LOGICA NUOVA (CORRETTA):
-- ============================================
-- Prima calcola ROW_NUMBER su tutti i click, poi filtra per l'intervallo
-- Risultato: 1 click unico (solo "def456" è veramente primo, "abc123" era già apparso prima)

SELECT 
  'LOGICA NUOVA (CORRETTA)' as tipo,
  COUNT(*) as click_totali,
  COUNT(*) FILTER (WHERE rn = 1) as click_unici
FROM (
  WITH all_clicks_ranked AS (
    SELECT
      clicked_at_rome,
      click_fingerprint_hash,
      ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
    FROM
      clicks
    WHERE
      link_id = 123
  )
  SELECT
    clicked_at_rome,
    click_fingerprint_hash,
    rn
  FROM all_clicks_ranked
  WHERE clicked_at_rome >= '2024-02-01'::date
    AND clicked_at_rome < ('2024-02-28'::date + INTERVAL '1 day')
) as new_logic;

-- La logica nuova è corretta perché un click è "unico" solo se è il primo
-- in assoluto per quel fingerprint, non solo il primo nell'intervallo selezionato.
