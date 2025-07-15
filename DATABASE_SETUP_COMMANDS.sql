-- DATABASE SETUP COMMANDS FOR ADVANCED FINGERPRINTING SYSTEM
-- Esegui questi comandi nel tuo database PostgreSQL in ordine

-- 1. TABELLA PRINCIPALE PER FINGERPRINT AVANZATI
CREATE TABLE IF NOT EXISTS advanced_fingerprints (
  id SERIAL PRIMARY KEY,
  link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  fingerprint_hash VARCHAR(64) NOT NULL,
  
  user_agent TEXT,
  language VARCHAR(10),
  languages JSONB,
  platform VARCHAR(50),
  cookie_enabled BOOLEAN,
  do_not_track VARCHAR(10),
  
  screen_width INTEGER,
  screen_height INTEGER,
  screen_color_depth INTEGER,
  screen_pixel_depth INTEGER,
  avail_screen_width INTEGER,
  avail_screen_height INTEGER,
  device_pixel_ratio DECIMAL(4,2),
  viewport_width INTEGER,
  viewport_height INTEGER,
  
  timezone VARCHAR(50),
  timezone_offset INTEGER,
  
  hardware_concurrency INTEGER,
  max_touch_points INTEGER,
  
  audio_fingerprint TEXT,
  canvas_fingerprint TEXT,
  webgl_vendor VARCHAR(200),
  webgl_renderer VARCHAR(200),
  webgl_fingerprint VARCHAR(50),
  
  available_fonts JSONB,
  plugins JSONB,
  
  local_storage BOOLEAN,
  session_storage BOOLEAN,
  indexed_db BOOLEAN,
  web_sql BOOLEAN,
  
  connection_type VARCHAR(20),
  connection_speed VARCHAR(20),
  
  battery_level DECIMAL(3,2),
  battery_charging BOOLEAN,
  
  media_devices JSONB,
  
  performance_fingerprint VARCHAR(100),
  
  css_features JSONB,
  js_features JSONB,
  
  ip_address VARCHAR(45),
  country VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  referer TEXT,
  
  visit_count INTEGER DEFAULT 1,
  total_time_on_page INTEGER DEFAULT 0,
  total_keystrokes INTEGER DEFAULT 0,
  page_load_time INTEGER DEFAULT 0,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. INDICI PER PERFORMANCE
CREATE UNIQUE INDEX IF NOT EXISTS idx_advanced_fingerprints_unique 
  ON advanced_fingerprints(link_id, fingerprint_hash);

CREATE INDEX IF NOT EXISTS idx_advanced_fingerprints_link_id 
  ON advanced_fingerprints(link_id);

CREATE INDEX IF NOT EXISTS idx_advanced_fingerprints_hash 
  ON advanced_fingerprints(fingerprint_hash);

CREATE INDEX IF NOT EXISTS idx_advanced_fingerprints_country 
  ON advanced_fingerprints(country);

CREATE INDEX IF NOT EXISTS idx_advanced_fingerprints_first_seen 
  ON advanced_fingerprints(first_seen);

CREATE INDEX IF NOT EXISTS idx_advanced_fingerprints_last_seen 
  ON advanced_fingerprints(last_seen);

-- 3. TABELLA PER INTERAZIONI DETTAGLIATE
CREATE TABLE IF NOT EXISTS fingerprint_interactions (
  id SERIAL PRIMARY KEY,
  fingerprint_id INTEGER NOT NULL REFERENCES advanced_fingerprints(id) ON DELETE CASCADE,
  
  click_position_x INTEGER,
  click_position_y INTEGER,
  
  scroll_position_x INTEGER,
  scroll_position_y INTEGER,
  
  mouse_movements JSONB,
  
  keystrokes INTEGER DEFAULT 0,
  time_on_page INTEGER DEFAULT 0,
  
  interaction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. INDICI PER INTERAZIONI
CREATE INDEX IF NOT EXISTS idx_fingerprint_interactions_fingerprint_id 
  ON fingerprint_interactions(fingerprint_id);

CREATE INDEX IF NOT EXISTS idx_fingerprint_interactions_timestamp 
  ON fingerprint_interactions(interaction_timestamp);

-- 5. TABELLA PER SESSIONI UTENTE
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  session_hash VARCHAR(64) NOT NULL UNIQUE,
  fingerprint_id INTEGER REFERENCES advanced_fingerprints(id) ON DELETE SET NULL,
  
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  total_duration INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 1,
  
  primary_device_type VARCHAR(20),
  primary_browser VARCHAR(50),
  primary_os VARCHAR(50),
  
  countries_visited JSONB DEFAULT '[]',
  cities_visited JSONB DEFAULT '[]',
  
  total_clicks INTEGER DEFAULT 0,
  total_keystrokes INTEGER DEFAULT 0,
  average_time_per_page DECIMAL(8,2) DEFAULT 0
);

-- 6. INDICI PER SESSIONI
CREATE INDEX IF NOT EXISTS idx_user_sessions_hash 
  ON user_sessions(session_hash);

CREATE INDEX IF NOT EXISTS idx_user_sessions_fingerprint 
  ON user_sessions(fingerprint_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_start_time 
  ON user_sessions(start_time);

-- 7. TABELLA PER STATISTICHE GIORNALIERE
CREATE TABLE IF NOT EXISTS daily_fingerprint_stats (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  
  unique_fingerprints INTEGER DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  total_time_on_page INTEGER DEFAULT 0,
  total_keystrokes INTEGER DEFAULT 0,
  average_page_load_time DECIMAL(8,2) DEFAULT 0,
  
  desktop_visits INTEGER DEFAULT 0,
  mobile_visits INTEGER DEFAULT 0,
  tablet_visits INTEGER DEFAULT 0,
  
  chrome_visits INTEGER DEFAULT 0,
  firefox_visits INTEGER DEFAULT 0,
  safari_visits INTEGER DEFAULT 0,
  edge_visits INTEGER DEFAULT 0,
  other_browser_visits INTEGER DEFAULT 0,
  
  top_countries JSONB DEFAULT '[]',
  top_cities JSONB DEFAULT '[]',
  
  webgl_support_count INTEGER DEFAULT 0,
  touch_device_count INTEGER DEFAULT 0,
  high_dpi_count INTEGER DEFAULT 0
);

-- 8. INDICI PER STATISTICHE
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats_unique 
  ON daily_fingerprint_stats(date, link_id);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date 
  ON daily_fingerprint_stats(date);

CREATE INDEX IF NOT EXISTS idx_daily_stats_link_id 
  ON daily_fingerprint_stats(link_id);

-- 9. VISTA RIEPILOGATIVA
CREATE OR REPLACE VIEW fingerprint_summary AS
SELECT 
  af.link_id,
  COUNT(DISTINCT af.fingerprint_hash) as unique_fingerprints,
  COUNT(*) as total_visits,
  AVG(af.page_load_time) as avg_page_load_time,
  AVG(af.total_time_on_page) as avg_time_on_page,
  AVG(af.total_keystrokes) as avg_keystrokes,
  COUNT(DISTINCT af.country) as unique_countries,
  COUNT(DISTINCT af.city) as unique_cities,
  MODE() WITHIN GROUP (ORDER BY af.platform) as most_common_platform,
  COUNT(CASE WHEN af.max_touch_points > 0 THEN 1 END) as touch_devices,
  COUNT(CASE WHEN af.device_pixel_ratio > 1 THEN 1 END) as high_dpi_devices
FROM advanced_fingerprints af
GROUP BY af.link_id;

-- 10. VISTA ANALISI BROWSER
CREATE OR REPLACE VIEW browser_fingerprint_analysis AS
SELECT 
  af.link_id,
  COUNT(DISTINCT af.canvas_fingerprint) as unique_canvas_fingerprints,
  COUNT(DISTINCT af.audio_fingerprint) as unique_audio_fingerprints,
  COUNT(DISTINCT af.webgl_fingerprint) as unique_webgl_fingerprints,
  AVG(jsonb_array_length(af.available_fonts)) as avg_fonts_count,
  AVG(jsonb_array_length(af.plugins)) as avg_plugins_count,
  COUNT(CASE WHEN af.cookie_enabled = true THEN 1 END) as cookies_enabled_count,
  COUNT(CASE WHEN af.local_storage = true THEN 1 END) as local_storage_count
FROM advanced_fingerprints af
GROUP BY af.link_id;
