-- Script per inizializzare le cartelle per i workspace esistenti
-- Eseguire questo script dopo aver creato le tabelle

-- Inserire la cartella "Tutti i link" per tutti i workspace esistenti
INSERT INTO folders (name, parent_folder_id, workspace_id, user_id)
SELECT 'Tutti i link', NULL, w.id, w.user_id
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM folders f 
  WHERE f.workspace_id = w.id AND f.name = 'Tutti i link'
);

-- Opzionale: spostare tutti i link esistenti nella cartella "Tutti i link"
-- (solo se desideri che i link esistenti siano nella cartella per default)
UPDATE links 
SET folder_id = (
  SELECT f.id FROM folders f 
  WHERE f.workspace_id = links.workspace_id 
  AND f.name = 'Tutti i link'
)
WHERE folder_id IS NULL;

-- Funzione per gestire l'eliminazione sicura delle cartelle
-- Quando una cartella viene eliminata, i suoi link vengono spostati nella cartella "Tutti i link"
-- Questa funzione può essere chiamata prima dell'eliminazione di una cartella

-- Procedura per spostare i link di una cartella nella cartella "Tutti i link"
-- Utilizzare questa query sostituendo 'FOLDER_ID_TO_DELETE' con l'ID della cartella da eliminare
/*
UPDATE links 
SET folder_id = (
  SELECT f.id FROM folders f 
  WHERE f.workspace_id = (
    SELECT workspace_id FROM folders WHERE id = 'FOLDER_ID_TO_DELETE'
  )
  AND f.name = 'Tutti i link'
)
WHERE folder_id = 'FOLDER_ID_TO_DELETE';
*/

-- Trigger per gestire automaticamente lo spostamento dei link
-- quando una cartella viene eliminata (tranne "Tutti i link")
CREATE OR REPLACE FUNCTION move_links_to_default_folder() 
RETURNS TRIGGER AS $$
BEGIN
  -- Solo se la cartella eliminata non è "Tutti i link"
  IF OLD.name != 'Tutti i link' THEN
    -- Sposta tutti i link della cartella eliminata nella cartella "Tutti i link"
    UPDATE links 
    SET folder_id = (
      SELECT f.id FROM folders f 
      WHERE f.workspace_id = OLD.workspace_id 
      AND f.name = 'Tutti i link'
    )
    WHERE folder_id = OLD.id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Applica il trigger alla tabella folders
CREATE TRIGGER move_links_before_folder_delete
  BEFORE DELETE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION move_links_to_default_folder();

-- Constraint per impedire l'eliminazione della cartella "Tutti i link"
-- Questo è gestito anche lato applicazione, ma aggiunge un layer di sicurezza a livello DB
CREATE OR REPLACE FUNCTION prevent_default_folder_deletion() 
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.name = 'Tutti i link' THEN
    RAISE EXCEPTION 'La cartella "Tutti i link" non può essere eliminata';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Applica il constraint trigger
CREATE TRIGGER prevent_default_folder_deletion_trigger
  BEFORE DELETE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_default_folder_deletion();

-- PULIZIA E RIPRISTINO DELLE CARTELLE DUPLICATE
-- Eseguire queste query per risolvere il problema delle doppie cartelle "Tutti i link"

-- 1. Trova e mantieni solo una cartella "Tutti i link" per workspace (quella con l'ID più basso)
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

-- 3. Elimina le cartelle duplicate (lascia solo quella con l'ID più basso)
DELETE FROM folders f
USING folders_to_keep ftk
WHERE f.name = 'Tutti i link'
  AND f.workspace_id = ftk.workspace_id
  AND f.id <> ftk.id;

-- 4. Aggiungi un vincolo unico per evitare futuri duplicati
ALTER TABLE folders
ADD CONSTRAINT unique_default_folder_per_workspace UNIQUE (workspace_id, name);

-- 5. Verifica che tutti i link senza cartella siano assegnati alla cartella "Tutti i link"
UPDATE links 
SET folder_id = (
  SELECT f.id FROM folders f 
  WHERE f.workspace_id = links.workspace_id 
  AND f.name = 'Tutti i link'
)
WHERE folder_id IS NULL;

-- 6. Query di verifica - esegui questa per controllare che tutto sia a posto
-- SELECT workspace_id, COUNT(*) as cartelle_tutti_i_link
-- FROM folders 
-- WHERE name = 'Tutti i link'
-- GROUP BY workspace_id
-- HAVING COUNT(*) > 1;
-- Questa query dovrebbe restituire 0 righe se tutto è risolto
