-- Script per diagnosticare e correggere inconsistenze nelle associazioni link-cartelle
-- Eseguire questo dopo aver implementato il sistema di cartelle multiple

-- ====== DIAGNOSTICA ======

-- 1. Stato generale del sistema
SELECT 
  'Links totali' as categoria,
  COUNT(*) as valore
FROM links

UNION ALL

SELECT 
  'Links con folder_id legacy',
  COUNT(*)
FROM links 
WHERE folder_id IS NOT NULL

UNION ALL

SELECT 
  'Associazioni nella nuova tabella',
  COUNT(*)
FROM link_folder_associations

UNION ALL

SELECT 
  'Link con associazioni multiple',
  COUNT(DISTINCT link_id)
FROM link_folder_associations lfa1
WHERE EXISTS (
  SELECT 1 FROM link_folder_associations lfa2 
  WHERE lfa2.link_id = lfa1.link_id 
  AND lfa2.folder_id != lfa1.folder_id
);

-- 2. Link con inconsistenze (hanno folder_id ma nessuna associazione corrispondente)
SELECT 
  '=== INCONSISTENZE RILEVATE ===' as problema,
  '' as dettaglio
  
UNION ALL

SELECT 
  'Link con folder_id ma senza associazione',
  CONCAT(l.short_code, ' - ', l.title)
FROM links l
WHERE l.folder_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM link_folder_associations lfa 
  WHERE lfa.link_id = l.id AND lfa.folder_id = l.folder_id
);

-- 3. Dettaglio associazioni per ogni link
SELECT 
  '=== DETTAGLIO ASSOCIAZIONI ===' as info,
  '' as dati
  
UNION ALL

SELECT 
  CONCAT('Link: ', l.short_code),
  CONCAT(
    'Legacy: ', COALESCE(f_legacy.name, 'NESSUNA'), 
    ' | Nuove: ', 
    COALESCE(string_agg(f_new.name, ', '), 'NESSUNA')
  )
FROM links l
LEFT JOIN folders f_legacy ON l.folder_id = f_legacy.id
LEFT JOIN link_folder_associations lfa ON l.id = lfa.link_id
LEFT JOIN folders f_new ON lfa.folder_id = f_new.id
GROUP BY l.id, l.short_code, f_legacy.name
ORDER BY l.short_code;

-- ====== CORREZIONI ======

-- 4. Correggi inconsistenze: aggiungi associazioni mancanti per i link con folder_id
INSERT INTO link_folder_associations (link_id, folder_id, user_id, workspace_id)
SELECT 
  l.id,
  l.folder_id,
  l.user_id,
  l.workspace_id
FROM links l
WHERE l.folder_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM link_folder_associations lfa 
  WHERE lfa.link_id = l.id AND lfa.folder_id = l.folder_id
)
ON CONFLICT (link_id, folder_id) DO NOTHING;

-- 5. Verifica post-correzione
SELECT 
  '=== VERIFICA POST-CORREZIONE ===' as risultato,
  '' as stato
  
UNION ALL

SELECT 
  'Link ancora con inconsistenze',
  COUNT(*)::text
FROM links l
WHERE l.folder_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM link_folder_associations lfa 
  WHERE lfa.link_id = l.id AND lfa.folder_id = l.folder_id
);

-- 6. Statistiche finali
SELECT 
  '=== STATISTICHE FINALI ===' as tipo,
  '' as valore
  
UNION ALL

SELECT 
  'Link in 1 cartella',
  COUNT(DISTINCT link_id)::text
FROM link_folder_associations lfa1
WHERE NOT EXISTS (
  SELECT 1 FROM link_folder_associations lfa2 
  WHERE lfa2.link_id = lfa1.link_id AND lfa2.folder_id != lfa1.folder_id
)

UNION ALL

SELECT 
  'Link in 2+ cartelle',
  COUNT(DISTINCT link_id)::text
FROM link_folder_associations lfa1
WHERE EXISTS (
  SELECT 1 FROM link_folder_associations lfa2 
  WHERE lfa2.link_id = lfa1.link_id AND lfa2.folder_id != lfa1.folder_id
)

UNION ALL

SELECT 
  'Link senza cartelle',
  COUNT(*)::text
FROM links l
WHERE NOT EXISTS (
  SELECT 1 FROM link_folder_associations lfa 
  WHERE lfa.link_id = l.id
);
