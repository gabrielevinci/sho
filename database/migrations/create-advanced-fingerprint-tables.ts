/**
 * Database Migration for Advanced Fingerprinting System
 * Crea le tabelle necessarie per il sistema di fingerprinting avanzato
 */

import { sql } from '@vercel/postgres';

export async function createAdvancedFingerprintTables() {
  try {
    console.log('🚀 Creazione tabelle per fingerprinting avanzato...');

    // Tabella principale per i fingerprint avanzati
    await sql`
      CREATE TABLE IF NOT EXISTS advanced_fingerprints (
        id SERIAL PRIMARY KEY,
        link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
        fingerprint_hash VARCHAR(64) NOT NULL,
        
        -- Browser Info
        user_agent TEXT,
        language VARCHAR(10),
        languages JSONB,
        platform VARCHAR(50),
        cookie_enabled BOOLEAN,
        do_not_track VARCHAR(10),
        
        -- Screen & Display
        screen_width INTEGER,
        screen_height INTEGER,
        screen_color_depth INTEGER,
        screen_pixel_depth INTEGER,
        avail_screen_width INTEGER,
        avail_screen_height INTEGER,
        device_pixel_ratio DECIMAL(4,2),
        viewport_width INTEGER,
        viewport_height INTEGER,
        
        -- Timezone & Location
        timezone VARCHAR(50),
        timezone_offset INTEGER,
        
        -- Hardware
        hardware_concurrency INTEGER,
        max_touch_points INTEGER,
        
        -- Fingerprints unici
        audio_fingerprint TEXT,
        canvas_fingerprint TEXT,
        webgl_vendor VARCHAR(200),
        webgl_renderer VARCHAR(200),
        webgl_fingerprint VARCHAR(50),
        
        -- Fonts e Plugin
        available_fonts JSONB,
        plugins JSONB,
        
        -- Storage capabilities
        local_storage BOOLEAN,
        session_storage BOOLEAN,
        indexed_db BOOLEAN,
        web_sql BOOLEAN,
        
        -- Network
        connection_type VARCHAR(20),
        connection_speed VARCHAR(20),
        
        -- Battery (opzionale)
        battery_level DECIMAL(3,2),
        battery_charging BOOLEAN,
        
        -- Media devices
        media_devices JSONB,
        
        -- Performance
        performance_fingerprint VARCHAR(100),
        
        -- Features support
        css_features JSONB,
        js_features JSONB,
        
        -- Server-side info
        ip_address VARCHAR(45),
        country VARCHAR(2),
        region VARCHAR(100),
        city VARCHAR(100),
        referer TEXT,
        
        -- Tracking info
        visit_count INTEGER DEFAULT 1,
        total_time_on_page INTEGER DEFAULT 0,
        total_keystrokes INTEGER DEFAULT 0,
        page_load_time INTEGER DEFAULT 0,
        first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Indici
        UNIQUE(link_id, fingerprint_hash),
        INDEX idx_advanced_fingerprints_link_id (link_id),
        INDEX idx_advanced_fingerprints_hash (fingerprint_hash),
        INDEX idx_advanced_fingerprints_country (country),
        INDEX idx_advanced_fingerprints_first_seen (first_seen),
        INDEX idx_advanced_fingerprints_last_seen (last_seen)
      )
    `;

    // Tabella per le interazioni dettagliate
    await sql`
      CREATE TABLE IF NOT EXISTS fingerprint_interactions (
        id SERIAL PRIMARY KEY,
        fingerprint_id INTEGER NOT NULL REFERENCES advanced_fingerprints(id) ON DELETE CASCADE,
        
        -- Click details
        click_position_x INTEGER,
        click_position_y INTEGER,
        
        -- Scroll details
        scroll_position_x INTEGER,
        scroll_position_y INTEGER,
        
        -- Mouse movements (sampled)
        mouse_movements JSONB,
        
        -- Behavioral data
        keystrokes INTEGER DEFAULT 0,
        time_on_page INTEGER DEFAULT 0,
        
        -- Timestamp
        interaction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Indici
        INDEX idx_fingerprint_interactions_fingerprint_id (fingerprint_id),
        INDEX idx_fingerprint_interactions_timestamp (interaction_timestamp)
      )
    `;

    // Tabella per le sessioni utente (opzionale)
    await sql`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        session_hash VARCHAR(64) NOT NULL UNIQUE,
        fingerprint_id INTEGER REFERENCES advanced_fingerprints(id) ON DELETE SET NULL,
        
        -- Session info
        start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        end_time TIMESTAMP WITH TIME ZONE,
        total_duration INTEGER DEFAULT 0,
        page_views INTEGER DEFAULT 1,
        
        -- Device info aggregato
        primary_device_type VARCHAR(20),
        primary_browser VARCHAR(50),
        primary_os VARCHAR(50),
        
        -- Location info
        countries_visited JSONB DEFAULT '[]',
        cities_visited JSONB DEFAULT '[]',
        
        -- Behavioral metrics
        total_clicks INTEGER DEFAULT 0,
        total_keystrokes INTEGER DEFAULT 0,
        average_time_per_page DECIMAL(8,2) DEFAULT 0,
        
        -- Indici
        INDEX idx_user_sessions_hash (session_hash),
        INDEX idx_user_sessions_fingerprint (fingerprint_id),
        INDEX idx_user_sessions_start_time (start_time)
      )
    `;

    // Tabella per le statistiche aggregate giornaliere
    await sql`
      CREATE TABLE IF NOT EXISTS daily_fingerprint_stats (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
        
        -- Contatori giornalieri
        unique_fingerprints INTEGER DEFAULT 0,
        total_visits INTEGER DEFAULT 0,
        total_time_on_page INTEGER DEFAULT 0,
        total_keystrokes INTEGER DEFAULT 0,
        average_page_load_time DECIMAL(8,2) DEFAULT 0,
        
        -- Device breakdown
        desktop_visits INTEGER DEFAULT 0,
        mobile_visits INTEGER DEFAULT 0,
        tablet_visits INTEGER DEFAULT 0,
        
        -- Browser breakdown
        chrome_visits INTEGER DEFAULT 0,
        firefox_visits INTEGER DEFAULT 0,
        safari_visits INTEGER DEFAULT 0,
        edge_visits INTEGER DEFAULT 0,
        other_browser_visits INTEGER DEFAULT 0,
        
        -- Geographic breakdown
        top_countries JSONB DEFAULT '[]',
        top_cities JSONB DEFAULT '[]',
        
        -- Feature support stats
        webgl_support_count INTEGER DEFAULT 0,
        touch_device_count INTEGER DEFAULT 0,
        high_dpi_count INTEGER DEFAULT 0,
        
        -- Indici
        UNIQUE(date, link_id),
        INDEX idx_daily_stats_date (date),
        INDEX idx_daily_stats_link_id (link_id)
      )
    `;

    console.log('✅ Tabelle per fingerprinting avanzato create con successo!');
    
    // Crea alcune viste utili per le analytics
    await sql`
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
      GROUP BY af.link_id
    `;

    await sql`
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
      GROUP BY af.link_id
    `;

    console.log('✅ Viste di analytics create con successo!');

  } catch (error) {
    console.error('❌ Errore durante la creazione delle tabelle:', error);
    throw error;
  }
}

// Funzione per eliminare le tabelle (per sviluppo)
export async function dropAdvancedFingerprintTables() {
  try {
    console.log('🗑️ Eliminazione tabelle fingerprinting...');
    
    await sql`DROP VIEW IF EXISTS browser_fingerprint_analysis CASCADE`;
    await sql`DROP VIEW IF EXISTS fingerprint_summary CASCADE`;
    await sql`DROP TABLE IF EXISTS daily_fingerprint_stats CASCADE`;
    await sql`DROP TABLE IF EXISTS user_sessions CASCADE`;
    await sql`DROP TABLE IF EXISTS fingerprint_interactions CASCADE`;
    await sql`DROP TABLE IF EXISTS advanced_fingerprints CASCADE`;
    
    console.log('✅ Tabelle fingerprinting eliminate!');
  } catch (error) {
    console.error('❌ Errore durante l\'eliminazione delle tabelle:', error);
    throw error;
  }
}

// Export per uso standalone
if (require.main === module) {
  createAdvancedFingerprintTables()
    .then(() => {
      console.log('✨ Migrazione completata!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migrazione fallita:', error);
      process.exit(1);
    });
}
