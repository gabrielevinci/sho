-- Enhanced Fingerprinting Tables
-- Tabelle per il sistema di fingerprinting migliorato

-- 1. Tabella principale per fingerprint migliorati
CREATE TABLE IF NOT EXISTS enhanced_fingerprints (
  id SERIAL PRIMARY KEY,
  link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  
  -- Fingerprint identifiers
  device_fingerprint VARCHAR(32) NOT NULL,    -- Identifica il dispositivo fisico
  browser_fingerprint VARCHAR(32) NOT NULL,   -- Identifica il browser specifico
  session_fingerprint VARCHAR(32) NOT NULL,   -- Identifica la sessione
  fingerprint_hash VARCHAR(32) NOT NULL,      -- Per compatibilità (= browser_fingerprint)
  
  -- Physical device data (stable across browsers)
  ip_hash VARCHAR(32),
  timezone_fingerprint VARCHAR(100),
  hardware_profile VARCHAR(100),
  device_category VARCHAR(20),
  os_family VARCHAR(50),
  
  -- Browser specific data
  browser_type VARCHAR(30),
  user_agent TEXT,
  
  -- Geolocation
  country VARCHAR(50),
  region VARCHAR(100),
  city VARCHAR(100),
  
  -- Correlation data
  confidence INTEGER DEFAULT 50,
  correlation_factors JSONB,
  
  -- Visit tracking
  visit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_enhanced_device_fp (device_fingerprint),
  INDEX idx_enhanced_browser_fp (browser_fingerprint),
  INDEX idx_enhanced_ip_timezone (ip_hash, timezone_fingerprint),
  INDEX idx_enhanced_link_device (link_id, device_fingerprint),
  INDEX idx_enhanced_created_at (created_at)
);

-- 2. Tabella per correlazioni tra fingerprint
CREATE TABLE IF NOT EXISTS fingerprint_correlations (
  id SERIAL PRIMARY KEY,
  device_cluster_id VARCHAR(32) NOT NULL,     -- ID del cluster di dispositivi correlati
  fingerprint_hash VARCHAR(32) NOT NULL,      -- Fingerprint correlato
  correlation_type VARCHAR(30) NOT NULL,       -- 'exact_match', 'partial_match', 'behavioral'
  confidence_score INTEGER DEFAULT 50,
  first_correlated TIMESTAMP DEFAULT NOW(),
  last_confirmed TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(device_cluster_id, fingerprint_hash),
  INDEX idx_correlations_cluster (device_cluster_id),
  INDEX idx_correlations_fingerprint (fingerprint_hash)
);

-- 3. Vista per analytics che combina dati legacy e nuovi
CREATE OR REPLACE VIEW unified_click_analytics AS
SELECT 
  l.id as link_id,
  l.short_code,
  l.original_url,
  l.title,
  
  -- Legacy counts (per compatibilità)
  l.click_count as total_clicks,
  l.unique_click_count as legacy_unique_clicks,
  
  -- Enhanced counts 
  COUNT(DISTINCT ef.browser_fingerprint) as browser_unique_clicks,
  COUNT(DISTINCT ef.device_fingerprint) as device_unique_clicks,
  COUNT(ef.id) as total_enhanced_clicks,
  
  -- Geographic data
  COUNT(DISTINCT ef.country) as unique_countries,
  COUNT(DISTINCT ef.city) as unique_cities,
  
  -- Device diversity
  COUNT(DISTINCT ef.browser_type) as unique_browsers,
  COUNT(DISTINCT ef.device_category) as unique_device_types,
  
  -- Confidence metrics
  AVG(ef.confidence) as avg_confidence,
  MIN(ef.created_at) as first_enhanced_click,
  MAX(ef.last_seen) as last_enhanced_click

FROM links l
LEFT JOIN enhanced_fingerprints ef ON l.id = ef.link_id
GROUP BY l.id, l.short_code, l.original_url, l.title, l.click_count, l.unique_click_count;

-- 4. Funzione per pulire vecchi dati (opzionale)
CREATE OR REPLACE FUNCTION cleanup_old_fingerprints()
RETURNS void AS $$
BEGIN
  -- Rimuovi fingerprint più vecchi di 90 giorni
  DELETE FROM enhanced_fingerprints 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Rimuovi correlazioni orfane
  DELETE FROM fingerprint_correlations 
  WHERE fingerprint_hash NOT IN (
    SELECT browser_fingerprint FROM enhanced_fingerprints
  );
END;
$$ LANGUAGE plpgsql;
