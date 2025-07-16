import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST() {
  try {
    console.log('🚀 Starting fingerprint schema migration...');
    
    // 1. Drop esistenti se ci sono problemi
    await sql`DROP VIEW IF EXISTS link_analytics_view CASCADE`;
    await sql`DROP VIEW IF EXISTS fingerprint_summary_view CASCADE`;
    await sql`DROP VIEW IF EXISTS fingerprint_summary CASCADE`;
    await sql`DROP TABLE IF EXISTS daily_fingerprint_stats CASCADE`;
    await sql`DROP TABLE IF EXISTS user_sessions CASCADE`;
    await sql`DROP TABLE IF EXISTS fingerprint_interactions CASCADE`;
    await sql`DROP TABLE IF EXISTS advanced_fingerprints CASCADE`;
    
    // 2. Crea tabella principale
    await sql`
      CREATE TABLE advanced_fingerprints (
        id SERIAL PRIMARY KEY,
        link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
        fingerprint_hash VARCHAR(64) NOT NULL,
        
        -- Dati Server-side
        user_agent TEXT,
        ip_hash VARCHAR(64),
        country VARCHAR(100),
        region VARCHAR(100),
        city VARCHAR(100),
        timezone VARCHAR(100),
        
        -- Browser Info
        browser_name VARCHAR(100),
        browser_version VARCHAR(50),
        os_name VARCHAR(100),
        os_version VARCHAR(50),
        device_type VARCHAR(50),
        device_vendor VARCHAR(100),
        device_model VARCHAR(100),
        cpu_architecture VARCHAR(50),
        
        -- Headers fingerprinting
        accept_language TEXT,
        accept_encoding TEXT,
        accept_header TEXT,
        dnt VARCHAR(10),
        upgrade_insecure_requests VARCHAR(10),
        sec_fetch_site VARCHAR(50),
        sec_fetch_mode VARCHAR(50),
        sec_fetch_user VARCHAR(50),
        sec_fetch_dest VARCHAR(50),
        cache_control TEXT,
        
        -- Dati Client-side
        screen_width INTEGER,
        screen_height INTEGER,
        screen_color_depth INTEGER,
        screen_pixel_depth INTEGER,
        avail_screen_width INTEGER,
        avail_screen_height INTEGER,
        device_pixel_ratio DECIMAL(10,2),
        viewport_width INTEGER,
        viewport_height INTEGER,
        timezone_offset INTEGER,
        hardware_concurrency INTEGER,
        max_touch_points INTEGER,
        
        -- Advanced fingerprinting
        audio_fingerprint TEXT,
        canvas_fingerprint TEXT,
        webgl_vendor TEXT,
        webgl_renderer TEXT,
        webgl_fingerprint TEXT,
        
        -- Browser capabilities
        available_fonts JSONB,
        plugins JSONB,
        
        -- Storage capabilities
        local_storage BOOLEAN,
        session_storage BOOLEAN,
        indexed_db BOOLEAN,
        web_sql BOOLEAN,
        
        -- Network info
        connection_type VARCHAR(50),
        connection_speed VARCHAR(50),
        
        -- Battery info
        battery_level DECIMAL(5,2),
        battery_charging BOOLEAN,
        
        -- Advanced features
        media_devices JSONB,
        performance_fingerprint TEXT,
        css_features JSONB,
        js_features JSONB,
        
        -- Tracking info
        first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        visit_count INTEGER DEFAULT 1
      )
    `;
    
    // 3. Indici per advanced_fingerprints
    await sql`CREATE UNIQUE INDEX idx_advanced_fingerprints_unique ON advanced_fingerprints(link_id, fingerprint_hash)`;
    await sql`CREATE INDEX idx_advanced_fingerprints_link_id ON advanced_fingerprints(link_id)`;
    await sql`CREATE INDEX idx_advanced_fingerprints_hash ON advanced_fingerprints(fingerprint_hash)`;
    await sql`CREATE INDEX idx_advanced_fingerprints_first_seen ON advanced_fingerprints(first_seen)`;
    
    // 4. Tabella interazioni
    await sql`
      CREATE TABLE fingerprint_interactions (
        id SERIAL PRIMARY KEY,
        link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
        fingerprint_hash VARCHAR(64) NOT NULL,
        session_id VARCHAR(64),
        interaction_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        interaction_type VARCHAR(50) DEFAULT 'click',
        page_url TEXT,
        referrer TEXT,
        time_on_page INTEGER,
        scroll_depth DECIMAL(5,2),
        clicks_count INTEGER DEFAULT 0,
        mouse_movements INTEGER DEFAULT 0
      )
    `;
    
    // 5. Tabella sessioni
    await sql`
      CREATE TABLE user_sessions (
        id SERIAL PRIMARY KEY,
        fingerprint_hash VARCHAR(64) NOT NULL,
        session_id VARCHAR(64) UNIQUE NOT NULL,
        first_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        total_links_clicked INTEGER DEFAULT 0,
        total_time_spent INTEGER DEFAULT 0,
        device_fingerprint_consistency DECIMAL(5,2) DEFAULT 100.00
      )
    `;
    
    // 6. Statistiche giornaliere
    await sql`
      CREATE TABLE daily_fingerprint_stats (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        total_clicks INTEGER DEFAULT 0,
        unique_fingerprints INTEGER DEFAULT 0,
        unique_sessions INTEGER DEFAULT 0,
        top_browsers JSONB,
        top_countries JSONB,
        top_devices JSONB,
        avg_session_duration DECIMAL(10,2),
        canvas_fingerprint_coverage DECIMAL(5,2),
        webgl_fingerprint_coverage DECIMAL(5,2)
      )
    `;
    
    await sql`CREATE UNIQUE INDEX idx_daily_stats_date ON daily_fingerprint_stats(date)`;
    
    // 7. Vista riassunto
    await sql`
      CREATE VIEW fingerprint_summary AS
      SELECT 
        af.link_id,
        COUNT(DISTINCT af.fingerprint_hash) as unique_fingerprints,
        COUNT(*) as total_visits,
        COUNT(DISTINCT CASE WHEN af.country IS NOT NULL THEN af.country END) as unique_countries,
        COUNT(DISTINCT af.browser_name) as unique_browsers,
        COUNT(DISTINCT af.os_name) as unique_os,
        COUNT(CASE WHEN af.canvas_fingerprint IS NOT NULL THEN 1 END) as canvas_count,
        COUNT(CASE WHEN af.webgl_fingerprint IS NOT NULL THEN 1 END) as webgl_count,
        COUNT(CASE WHEN af.audio_fingerprint IS NOT NULL THEN 1 END) as audio_count,
        MIN(af.first_seen) as first_visit,
        MAX(af.last_seen) as last_visit
      FROM advanced_fingerprints af
      GROUP BY af.link_id
    `;
    
    // 8. Vista analytics
    await sql`
      CREATE VIEW link_analytics_view AS
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
        END as canvas_coverage_percent,
        fs.first_visit,
        fs.last_visit,
        l.created_at as link_created
      FROM links l
      LEFT JOIN fingerprint_summary fs ON l.id = fs.link_id
    `;

    return NextResponse.json({
      status: 'success',
      message: 'Database schema created successfully',
      timestamp: new Date().toISOString(),
      tables_created: [
        'advanced_fingerprints',
        'fingerprint_interactions', 
        'user_sessions',
        'daily_fingerprint_stats'
      ],
      views_created: [
        'fingerprint_summary',
        'link_analytics_view'
      ]
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Migration error:', errorMessage);
    
    return NextResponse.json({
      status: 'error',
      error: errorMessage,
      details: 'Failed to run migration'
    }, { status: 500 });
  }
}
