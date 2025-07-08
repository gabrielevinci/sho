-- SCRIPT DI PULIZIA CARTELLE DUPLICATE
-- Eseguire queste query in sequenza per risolvere il problema

-- 1. Trova e mantieni solo una cartella "Tutti i link" per workspace
CREATE TEMP TABLE folders_to_keep AS
SELECT MIN(id::text)::uuid AS id, workspace_id
FROM folders
WHERE name = 'Tutti i link'
GROUP BY workspace_id;

-- 2. Sposta tutti i link dalle cartelle duplicate verso quella da mantenere
UPDATE links l
SET folder_id = ftk.id
FROM folders_to_keep ftk
JOIN folders f ON f.workspace_id = ftk.workspace_id AND f.name = 'Tutti i link'
WHERE l.folder_id = f.id
  AND f.id <> ftk.id;

-- 3. Elimina le cartelle duplicate
DELETE FROM folders f
USING folders_to_keep ftk
WHERE f.name = 'Tutti i link'
  AND f.workspace_id = ftk.workspace_id
  AND f.id <> ftk.id;

-- 4. Aggiungi vincolo unico per evitare futuri duplicati
ALTER TABLE folders
ADD CONSTRAINT unique_default_folder_per_workspace UNIQUE (workspace_id, name);

-- 5. Assicurati che tutti i link senza cartella siano nella cartella "Tutti i link"
UPDATE links 
SET folder_id = (
  SELECT f.id FROM folders f 
  WHERE f.workspace_id = links.workspace_id 
  AND f.name = 'Tutti i link'
)
WHERE folder_id IS NULL;

-- 6. Verifica finale - questa query dovrebbe restituire 0 righe
SELECT workspace_id, COUNT(*) as cartelle_tutti_i_link
FROM folders 
WHERE name = 'Tutti i link'
GROUP BY workspace_id
HAVING COUNT(*) > 1;
