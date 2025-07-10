-- Migration per implementare link multipli in cartelle multiple
-- Questo script crea una tabella di associazione molti-a-molti tra link e cartelle

-- 1. Creare la tabella di associazione link-cartelle
CREATE TABLE IF NOT EXISTS link_folder_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL,
  folder_id UUID NOT NULL,
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  

  CONSTRAINT fk_link_folder_assoc_link
    FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE,
  CONSTRAINT fk_link_folder_assoc_folder
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
  CONSTRAINT fk_link_folder_assoc_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_link_folder_assoc_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    

  CONSTRAINT unique_link_folder_association 
    UNIQUE (link_id, folder_id)
);

-- 2. Creare indici per ottimizzare le query
CREATE INDEX IF NOT EXISTS idx_link_folder_assoc_link_id ON link_folder_associations(link_id);
CREATE INDEX IF NOT EXISTS idx_link_folder_assoc_folder_id ON link_folder_associations(folder_id);
CREATE INDEX IF NOT EXISTS idx_link_folder_assoc_user_workspace ON link_folder_associations(user_id, workspace_id);

-- 3. Migrazione dei dati esistenti dalla tabella links
-- Sposta tutte le associazioni esistenti dalla colonna folder_id alla nuova tabella
INSERT INTO link_folder_associations (link_id, folder_id, user_id, workspace_id, created_at)
SELECT 
  l.id as link_id,
  l.folder_id,
  l.user_id,
  l.workspace_id,
  l.created_at
FROM links l
WHERE l.folder_id IS NOT NULL;

-- 4. Commenti per documentazione
COMMENT ON TABLE link_folder_associations IS 'Tabella di associazione molti-a-molti tra link e cartelle per permettere a un link di appartenere a più cartelle';
COMMENT ON COLUMN link_folder_associations.link_id IS 'ID del link associato';
COMMENT ON COLUMN link_folder_associations.folder_id IS 'ID della cartella associata';
COMMENT ON COLUMN link_folder_associations.user_id IS 'ID dell''utente proprietario dell''associazione';
COMMENT ON COLUMN link_folder_associations.workspace_id IS 'ID del workspace contenente l''associazione';

-- Nota: La colonna folder_id nella tabella links verrà mantenuta per compatibilità retroattiva
-- e potrà essere rimossa in una migrazione futura dopo che tutti i componenti saranno aggiornati
