-- Aggiunta del campo referrer alla tabella enhanced_fingerprints
-- Questo script deve essere eseguito per garantire coerenza nei dati analytics

-- 1. Aggiungi il campo referrer se non esiste
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enhanced_fingerprints' 
        AND column_name = 'referrer'
    ) THEN
        ALTER TABLE enhanced_fingerprints 
        ADD COLUMN referrer TEXT;
        
        RAISE NOTICE 'Campo referrer aggiunto alla tabella enhanced_fingerprints';
    ELSE
        RAISE NOTICE 'Campo referrer già presente nella tabella enhanced_fingerprints';
    END IF;
END $$;

-- 2. Crea un indice per performance
CREATE INDEX IF NOT EXISTS idx_enhanced_fingerprints_referrer 
ON enhanced_fingerprints(referrer);

-- 3. Aggiorna i record esistenti con referrer dalla tabella clicks (se esiste)
DO $$
BEGIN
    -- Controlla se la tabella clicks esiste
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'clicks'
    ) THEN
        -- Aggiorna i referrer dalla tabella clicks per i record corrispondenti
        UPDATE enhanced_fingerprints ef
        SET referrer = COALESCE(c.referrer, 'Direct')
        FROM clicks c
        WHERE ef.link_id = c.link_id 
        AND ef.referrer IS NULL
        AND c.referrer IS NOT NULL;
        
        RAISE NOTICE 'Aggiornati i referrer dalla tabella clicks';
    END IF;
END $$;

-- 4. Imposta 'Direct' per i record senza referrer
UPDATE enhanced_fingerprints 
SET referrer = 'Direct' 
WHERE referrer IS NULL;

-- 5. Verifica il risultato
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN referrer IS NOT NULL THEN 1 END) as records_with_referrer,
    COUNT(CASE WHEN referrer = 'Direct' THEN 1 END) as direct_referrers,
    COUNT(CASE WHEN referrer != 'Direct' AND referrer IS NOT NULL THEN 1 END) as external_referrers
FROM enhanced_fingerprints;
