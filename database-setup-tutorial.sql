CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE workspaces (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE folders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_folders_workspace ON folders(workspace_id);
CREATE INDEX idx_folders_parent ON folders(parent_folder_id);

CREATE TABLE links (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  short_code VARCHAR(50) NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  click_count INTEGER DEFAULT 0,
  unique_click_count INTEGER DEFAULT 0,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_term VARCHAR(100),
  utm_content VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  is_private BOOLEAN DEFAULT FALSE,
  password VARCHAR(255),
  expiration_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_clicked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_links_user ON links(user_id);
CREATE INDEX idx_links_workspace ON links(workspace_id);
CREATE INDEX idx_links_short_code ON links(short_code);

CREATE TABLE link_folder_associations (
  id SERIAL PRIMARY KEY,
  link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(link_id, folder_id)
);

CREATE INDEX idx_link_folder_link ON link_folder_associations(link_id);
CREATE INDEX idx_link_folder_folder ON link_folder_associations(folder_id);

CREATE TABLE clicks (
  id SERIAL PRIMARY KEY,
  link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  ip_hash VARCHAR(64),
  user_agent TEXT,
  referer TEXT,
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  browser VARCHAR(100),
  os VARCHAR(100),
  device VARCHAR(50)
);

CREATE INDEX idx_clicks_link ON clicks(link_id);
CREATE INDEX idx_clicks_created ON clicks(created_at);

CREATE TABLE enhanced_fingerprints (
  id SERIAL PRIMARY KEY,
  link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  device_fingerprint VARCHAR(32) NOT NULL,
  browser_fingerprint VARCHAR(32) NOT NULL,
  session_fingerprint VARCHAR(32) NOT NULL,
  fingerprint_hash VARCHAR(32) NOT NULL,
  ip_hash VARCHAR(32),
  timezone_fingerprint VARCHAR(100),
  hardware_profile VARCHAR(100),
  device_category VARCHAR(20),
  os_family VARCHAR(50),
  browser_type VARCHAR(30),
  user_agent TEXT,
  country VARCHAR(50),
  region VARCHAR(100),
  city VARCHAR(100),
  confidence INTEGER DEFAULT 50,
  correlation_factors JSONB,
  visit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_enhanced_device_fp ON enhanced_fingerprints(device_fingerprint);
CREATE INDEX idx_enhanced_browser_fp ON enhanced_fingerprints(browser_fingerprint);
CREATE INDEX idx_enhanced_ip_timezone ON enhanced_fingerprints(ip_hash, timezone_fingerprint);
CREATE INDEX idx_enhanced_link_device ON enhanced_fingerprints(link_id, device_fingerprint);
CREATE INDEX idx_enhanced_created_at ON enhanced_fingerprints(created_at);

CREATE TABLE fingerprint_correlations (
  id SERIAL PRIMARY KEY,
  device_cluster_id VARCHAR(32) NOT NULL,
  fingerprint_hash VARCHAR(32) NOT NULL,
  correlation_type VARCHAR(30) NOT NULL,
  confidence_score INTEGER DEFAULT 50,
  first_correlated TIMESTAMP DEFAULT NOW(),
  last_confirmed TIMESTAMP DEFAULT NOW(),
  UNIQUE(device_cluster_id, fingerprint_hash)
);

CREATE INDEX idx_correlations_cluster ON fingerprint_correlations(device_cluster_id);
CREATE INDEX idx_correlations_fingerprint ON fingerprint_correlations(fingerprint_hash);

CREATE TABLE advanced_fingerprints (
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
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(link_id, fingerprint_hash)
);

CREATE INDEX idx_advanced_fingerprints_link_id ON advanced_fingerprints(link_id);
CREATE INDEX idx_advanced_fingerprints_hash ON advanced_fingerprints(fingerprint_hash);
CREATE INDEX idx_advanced_fingerprints_country ON advanced_fingerprints(country);
CREATE INDEX idx_advanced_fingerprints_first_seen ON advanced_fingerprints(first_seen);
CREATE INDEX idx_advanced_fingerprints_last_seen ON advanced_fingerprints(last_seen);

CREATE TABLE fingerprint_interactions (
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

CREATE INDEX idx_fingerprint_interactions_fingerprint_id ON fingerprint_interactions(fingerprint_id);
CREATE INDEX idx_fingerprint_interactions_timestamp ON fingerprint_interactions(interaction_timestamp);

CREATE TABLE user_sessions (
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

CREATE INDEX idx_user_sessions_hash ON user_sessions(session_hash);
CREATE INDEX idx_user_sessions_fingerprint ON user_sessions(fingerprint_id);
CREATE INDEX idx_user_sessions_start_time ON user_sessions(start_time);

CREATE TABLE daily_fingerprint_stats (
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
  high_dpi_count INTEGER DEFAULT 0,
  UNIQUE(date, link_id)
);

CREATE INDEX idx_daily_stats_date ON daily_fingerprint_stats(date);
CREATE INDEX idx_daily_stats_link_id ON daily_fingerprint_stats(link_id);

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

CREATE OR REPLACE VIEW unified_click_analytics AS
SELECT 
  l.id as link_id,
  l.short_code,
  l.original_url,
  l.title,
  l.click_count as total_clicks,
  l.unique_click_count as legacy_unique_clicks,
  COUNT(DISTINCT ef.browser_fingerprint) as browser_unique_clicks,
  COUNT(DISTINCT ef.device_fingerprint) as device_unique_clicks,
  COUNT(ef.id) as total_enhanced_clicks,
  COUNT(DISTINCT ef.country) as unique_countries,
  COUNT(DISTINCT ef.city) as unique_cities,
  COUNT(DISTINCT ef.browser_type) as unique_browsers,
  COUNT(DISTINCT ef.device_category) as unique_device_types,
  AVG(ef.confidence) as avg_confidence,
  MIN(ef.created_at) as first_enhanced_click,
  MAX(ef.last_seen) as last_enhanced_click
FROM links l
LEFT JOIN enhanced_fingerprints ef ON l.id = ef.link_id
GROUP BY l.id, l.short_code, l.original_url, l.title, l.click_count, l.unique_click_count;

CREATE OR REPLACE VIEW link_analytics_view AS
SELECT 
  l.id as link_id,
  l.short_code,
  l.original_url,
  l.title,
  COALESCE(fs.unique_fingerprints, 0) as unique_visitors,
  COALESCE(fs.total_visits, 0) as total_clicks,
  COALESCE(fs.unique_countries, 0) as countries_reached,
  COALESCE(fs.unique_browsers, 0) as browsers_used,
  COALESCE(fs.canvas_count, 0) as canvas_fingerprints,
  COALESCE(fs.webgl_count, 0) as webgl_fingerprints,
  COALESCE(fs.audio_count, 0) as audio_fingerprints,
  CASE 
    WHEN fs.total_visits > 0 THEN 
      ROUND((fs.canvas_count::DECIMAL / fs.total_visits * 100), 2)
    ELSE 0 
  END as canvas_support_percentage
FROM links l
LEFT JOIN (
  SELECT 
    link_id,
    COUNT(DISTINCT fingerprint_hash) as unique_fingerprints,
    COUNT(*) as total_visits,
    COUNT(DISTINCT country) as unique_countries,
    COUNT(DISTINCT browser_name) as unique_browsers,
    COUNT(DISTINCT canvas_fingerprint) as canvas_count,
    COUNT(DISTINCT webgl_fingerprint) as webgl_count,
    COUNT(DISTINCT audio_fingerprint) as audio_count
  FROM advanced_fingerprints
  GROUP BY link_id
) fs ON l.id = fs.link_id;

CREATE OR REPLACE FUNCTION cleanup_old_fingerprints()
RETURNS void AS $$
BEGIN
  DELETE FROM enhanced_fingerprints 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  DELETE FROM fingerprint_correlations 
  WHERE fingerprint_hash NOT IN (
    SELECT browser_fingerprint FROM enhanced_fingerprints
  );
END;
$$ LANGUAGE plpgsql;


