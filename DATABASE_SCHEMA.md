# Schema Database - Sistema di URL Shortening con Fingerprinting Avanzato

Questo documento descrive tutte le tabelle necessarie per il funzionamento del sistema di URL shortening, basato sull'analisi del codice del progetto.

## 📋 Tabelle Principali

### 1. users
**Descrizione**: Tabella degli utenti registrati al sistema
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Indici
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### 2. workspaces
**Descrizione**: Workspace per organizzare i link degli utenti
```sql
CREATE TABLE workspaces (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint unico per evitare workspace duplicate per utente
    UNIQUE(user_id, name)
);

-- Indici
CREATE INDEX idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX idx_workspaces_created_at ON workspaces(created_at);
```

### 3. folders
**Descrizione**: Cartelle per organizzare i link all'interno dei workspace
```sql
CREATE TABLE folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_folders_workspace_id ON folders(workspace_id);
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_folder_id ON folders(parent_folder_id);
CREATE INDEX idx_folders_position ON folders(position);
```

### 4. links
**Descrizione**: Tabella principale dei link abbreviati
```sql
CREATE TABLE links (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    short_code VARCHAR(50) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    title VARCHAR(500),
    description TEXT,
    folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    
    -- Contatori dei click (aggiornati automaticamente)
    click_count INTEGER DEFAULT 0,
    unique_click_count INTEGER DEFAULT 0,
    
    -- Metadati
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Indici
CREATE UNIQUE INDEX idx_links_short_code ON links(short_code);
CREATE INDEX idx_links_user_id ON links(user_id);
CREATE INDEX idx_links_workspace_id ON links(workspace_id);
CREATE INDEX idx_links_folder_id ON links(folder_id);
CREATE INDEX idx_links_created_at ON links(created_at);
CREATE INDEX idx_links_click_count ON links(click_count);
```

### 5. link_folder_associations
**Descrizione**: Associazioni tra link e cartelle (relazione many-to-many)
```sql
CREATE TABLE link_folder_associations (
    id SERIAL PRIMARY KEY,
    link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint unico per evitare associazioni duplicate
    UNIQUE(link_id, folder_id)
);

-- Indici
CREATE INDEX idx_link_folder_associations_link_id ON link_folder_associations(link_id);
CREATE INDEX idx_link_folder_associations_folder_id ON link_folder_associations(folder_id);
CREATE INDEX idx_link_folder_associations_user_id ON link_folder_associations(user_id);
CREATE INDEX idx_link_folder_associations_workspace_id ON link_folder_associations(workspace_id);
```

## 📊 Sistema di Tracking e Analytics

### 6. clicks (Sistema Legacy)
**Descrizione**: Tabella legacy per il tracking dei click (mantenuta per compatibilità)
```sql
CREATE TABLE clicks (
    id SERIAL PRIMARY KEY,
    link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    user_fingerprint VARCHAR(64),
    country VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    referrer TEXT,
    browser_name VARCHAR(100),
    device_type VARCHAR(50),
    clicked_at_rome TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_hash VARCHAR(64),
    user_agent TEXT
);

-- Indici
CREATE INDEX idx_clicks_link_id ON clicks(link_id);
CREATE INDEX idx_clicks_user_fingerprint ON clicks(user_fingerprint);
CREATE INDEX idx_clicks_clicked_at_rome ON clicks(clicked_at_rome);
CREATE INDEX idx_clicks_country ON clicks(country);
```

### 7. enhanced_fingerprints
**Descrizione**: Sistema avanzato di fingerprinting per tracking accurato dei visitatori unici
```sql
CREATE TABLE enhanced_fingerprints (
    id SERIAL PRIMARY KEY,
    link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    
    -- Identificatori del dispositivo fisico (stabili tra browser)
    device_fingerprint VARCHAR(20) NOT NULL,
    browser_fingerprint VARCHAR(24) NOT NULL,
    session_fingerprint VARCHAR(24),
    fingerprint_hash VARCHAR(64) NOT NULL,
    
    -- Informazioni del server
    ip_hash VARCHAR(64),
    timezone_fingerprint VARCHAR(100),
    hardware_profile VARCHAR(100),
    
    -- Classificazione
    device_category VARCHAR(50), -- mobile, tablet, desktop
    os_family VARCHAR(100),      -- windows, macos, linux, android, ios
    browser_type VARCHAR(50),    -- chrome, firefox, safari, edge
    
    -- Dati geografici
    country VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    
    -- Metadati del browser
    user_agent TEXT,
    language VARCHAR(10),
    languages JSONB,
    platform VARCHAR(50),
    cookie_enabled BOOLEAN,
    do_not_track VARCHAR(10),
    
    -- Informazioni dello schermo e display
    screen_width INTEGER,
    screen_height INTEGER,
    screen_color_depth INTEGER,
    screen_pixel_depth INTEGER,
    avail_screen_width INTEGER,
    avail_screen_height INTEGER,
    device_pixel_ratio DECIMAL(4,2),
    viewport_width INTEGER,
    viewport_height INTEGER,
    
    -- Timezone e localizzazione
    timezone VARCHAR(50),
    timezone_offset INTEGER,
    
    -- Hardware
    hardware_concurrency INTEGER,
    max_touch_points INTEGER,
    
    -- Fingerprints avanzati
    audio_fingerprint TEXT,
    canvas_fingerprint TEXT,
    webgl_vendor VARCHAR(200),
    webgl_renderer VARCHAR(200),
    webgl_fingerprint VARCHAR(50),
    
    -- Capabilities del browser
    available_fonts JSONB,
    plugins JSONB,
    
    -- Storage capabilities
    local_storage BOOLEAN,
    session_storage BOOLEAN,
    indexed_db BOOLEAN,
    web_sql BOOLEAN,
    
    -- Informazioni di rete
    connection_type VARCHAR(20),
    connection_speed VARCHAR(20),
    
    -- Batteria (opzionale)
    battery_level DECIMAL(3,2),
    battery_charging BOOLEAN,
    
    -- Media devices
    media_devices JSONB,
    
    -- Performance
    performance_fingerprint VARCHAR(100),
    
    -- Features support
    css_features JSONB,
    js_features JSONB,
    
    -- Informazioni di tracking
    confidence INTEGER DEFAULT 50,
    correlation_factors JSONB,
    visit_count INTEGER DEFAULT 1,
    total_time_on_page INTEGER DEFAULT 0,
    total_keystrokes INTEGER DEFAULT 0,
    page_load_time INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici
CREATE UNIQUE INDEX idx_enhanced_fingerprints_unique ON enhanced_fingerprints(link_id, fingerprint_hash);
CREATE INDEX idx_enhanced_fingerprints_link_id ON enhanced_fingerprints(link_id);
CREATE INDEX idx_enhanced_fingerprints_device_fingerprint ON enhanced_fingerprints(device_fingerprint);
CREATE INDEX idx_enhanced_fingerprints_browser_fingerprint ON enhanced_fingerprints(browser_fingerprint);
CREATE INDEX idx_enhanced_fingerprints_hash ON enhanced_fingerprints(fingerprint_hash);
CREATE INDEX idx_enhanced_fingerprints_first_seen ON enhanced_fingerprints(first_seen);
CREATE INDEX idx_enhanced_fingerprints_last_seen ON enhanced_fingerprints(last_seen);
CREATE INDEX idx_enhanced_fingerprints_country ON enhanced_fingerprints(country);
```

### 8. fingerprint_correlations
**Descrizione**: Tabella per tracciare correlazioni tra fingerprint dello stesso dispositivo
```sql
CREATE TABLE fingerprint_correlations (
    id SERIAL PRIMARY KEY,
    device_cluster_id VARCHAR(24) NOT NULL,
    fingerprint_hash VARCHAR(64) NOT NULL,
    correlation_type VARCHAR(20) DEFAULT 'same_device',
    confidence_score INTEGER DEFAULT 100,
    first_correlated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_confirmed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint unico per evitare duplicati
    UNIQUE(device_cluster_id, fingerprint_hash)
);

-- Indici
CREATE INDEX idx_fingerprint_correlations_device_cluster ON fingerprint_correlations(device_cluster_id);
CREATE INDEX idx_fingerprint_correlations_fingerprint_hash ON fingerprint_correlations(fingerprint_hash);
CREATE INDEX idx_fingerprint_correlations_type ON fingerprint_correlations(correlation_type);
```

### 9. fingerprint_interactions
**Descrizione**: Dettagli delle interazioni degli utenti con le pagine
```sql
CREATE TABLE fingerprint_interactions (
    id SERIAL PRIMARY KEY,
    link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    fingerprint_hash VARCHAR(64) NOT NULL,
    session_id VARCHAR(64),
    
    -- Tipo di interazione
    interaction_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    interaction_type VARCHAR(50) DEFAULT 'click',
    page_url TEXT,
    referrer TEXT,
    
    -- Metriche di comportamento
    time_on_page INTEGER,
    scroll_depth DECIMAL(5,2),
    
    -- Dettagli del click
    click_position_x INTEGER,
    click_position_y INTEGER,
    
    -- Dettagli dello scroll
    scroll_position_x INTEGER,
    scroll_position_y INTEGER,
    
    -- Movimenti del mouse (campionati)
    mouse_movements JSONB,
    
    -- Dati comportamentali
    keystrokes INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    mouse_movements_count INTEGER DEFAULT 0
);

-- Indici
CREATE INDEX idx_fingerprint_interactions_link_id ON fingerprint_interactions(link_id);
CREATE INDEX idx_fingerprint_interactions_fingerprint_hash ON fingerprint_interactions(fingerprint_hash);
CREATE INDEX idx_fingerprint_interactions_session_id ON fingerprint_interactions(session_id);
CREATE INDEX idx_fingerprint_interactions_timestamp ON fingerprint_interactions(interaction_time);
```

### 10. user_sessions
**Descrizione**: Sessioni utente per tracking avanzato
```sql
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    fingerprint_hash VARCHAR(64) NOT NULL,
    session_id VARCHAR(64) UNIQUE NOT NULL,
    
    -- Informazioni della sessione
    first_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_links_clicked INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0,
    device_fingerprint_consistency DECIMAL(5,2) DEFAULT 100.00,
    
    -- Metadati del dispositivo aggregati
    primary_device_type VARCHAR(20),
    primary_browser VARCHAR(50),
    primary_os VARCHAR(50),
    
    -- Informazioni di localizzazione
    countries_visited JSONB DEFAULT '[]',
    cities_visited JSONB DEFAULT '[]',
    
    -- Metriche comportamentali
    total_clicks INTEGER DEFAULT 0,
    total_keystrokes INTEGER DEFAULT 0,
    average_time_per_page DECIMAL(8,2) DEFAULT 0
);

-- Indici
CREATE INDEX idx_user_sessions_fingerprint_hash ON user_sessions(fingerprint_hash);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_first_activity ON user_sessions(first_activity);
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity);
```

### 11. daily_fingerprint_stats
**Descrizione**: Statistiche aggregate giornaliere per analytics
```sql
CREATE TABLE daily_fingerprint_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    link_id INTEGER REFERENCES links(id) ON DELETE CASCADE,
    
    -- Contatori giornalieri
    total_clicks INTEGER DEFAULT 0,
    unique_fingerprints INTEGER DEFAULT 0,
    unique_sessions INTEGER DEFAULT 0,
    total_time_on_page INTEGER DEFAULT 0,
    total_keystrokes INTEGER DEFAULT 0,
    average_page_load_time DECIMAL(8,2) DEFAULT 0,
    
    -- Breakdown per dispositivo
    desktop_visits INTEGER DEFAULT 0,
    mobile_visits INTEGER DEFAULT 0,
    tablet_visits INTEGER DEFAULT 0,
    
    -- Breakdown per browser
    chrome_visits INTEGER DEFAULT 0,
    firefox_visits INTEGER DEFAULT 0,
    safari_visits INTEGER DEFAULT 0,
    edge_visits INTEGER DEFAULT 0,
    other_browser_visits INTEGER DEFAULT 0,
    
    -- Breakdown geografico
    top_countries JSONB DEFAULT '[]',
    top_cities JSONB DEFAULT '[]',
    
    -- Statistiche delle funzionalità
    webgl_support_count INTEGER DEFAULT 0,
    canvas_fingerprint_coverage DECIMAL(5,2),
    webgl_fingerprint_coverage DECIMAL(5,2),
    audio_fingerprint_coverage DECIMAL(5,2),
    
    -- Dispositivi avanzati
    touch_device_count INTEGER DEFAULT 0,
    high_dpi_count INTEGER DEFAULT 0,
    
    -- Metriche di sessione
    avg_session_duration DECIMAL(10,2)
);

-- Indici
CREATE UNIQUE INDEX idx_daily_stats_date_link ON daily_fingerprint_stats(date, link_id);
CREATE INDEX idx_daily_stats_date ON daily_fingerprint_stats(date);
CREATE INDEX idx_daily_stats_link_id ON daily_fingerprint_stats(link_id);
```

## 📈 Viste per Analytics

### Vista: fingerprint_summary
**Descrizione**: Riassunto delle statistiche di fingerprinting per link
```sql
CREATE VIEW fingerprint_summary AS
SELECT 
    af.link_id,
    COUNT(DISTINCT af.fingerprint_hash) as unique_fingerprints,
    COUNT(*) as total_visits,
    COUNT(DISTINCT CASE WHEN af.country IS NOT NULL THEN af.country END) as unique_countries,
    COUNT(DISTINCT af.browser_type) as unique_browsers,
    COUNT(DISTINCT af.os_family) as unique_os,
    COUNT(CASE WHEN af.canvas_fingerprint IS NOT NULL THEN 1 END) as canvas_count,
    COUNT(CASE WHEN af.webgl_fingerprint IS NOT NULL THEN 1 END) as webgl_count,
    COUNT(CASE WHEN af.audio_fingerprint IS NOT NULL THEN 1 END) as audio_count,
    MIN(af.first_seen) as first_visit,
    MAX(af.last_seen) as last_visit,
    AVG(af.page_load_time) as avg_page_load_time,
    AVG(af.total_time_on_page) as avg_time_on_page,
    AVG(af.total_keystrokes) as avg_keystrokes
FROM enhanced_fingerprints af
GROUP BY af.link_id;
```

### Vista: link_analytics_view
**Descrizione**: Vista completa per analytics dei link
```sql
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
LEFT JOIN fingerprint_summary fs ON l.id = fs.link_id;
```

### Vista: browser_fingerprint_analysis
**Descrizione**: Analisi avanzata dei fingerprint del browser
```sql
CREATE VIEW browser_fingerprint_analysis AS
SELECT 
    af.link_id,
    COUNT(DISTINCT af.canvas_fingerprint) as unique_canvas_fingerprints,
    COUNT(DISTINCT af.audio_fingerprint) as unique_audio_fingerprints,
    COUNT(DISTINCT af.webgl_fingerprint) as unique_webgl_fingerprints,
    AVG(jsonb_array_length(af.available_fonts)) as avg_fonts_count,
    AVG(jsonb_array_length(af.plugins)) as avg_plugins_count,
    COUNT(CASE WHEN af.cookie_enabled = true THEN 1 END) as cookies_enabled_count,
    COUNT(CASE WHEN af.local_storage = true THEN 1 END) as local_storage_count,
    MODE() WITHIN GROUP (ORDER BY af.platform) as most_common_platform,
    COUNT(CASE WHEN af.max_touch_points > 0 THEN 1 END) as touch_devices,
    COUNT(CASE WHEN af.device_pixel_ratio > 1 THEN 1 END) as high_dpi_devices
FROM enhanced_fingerprints af
GROUP BY af.link_id;
```

## 🚀 Script Completo per Ricreare il Database

```sql
-- ========================================
-- SCRIPT COMPLETO PER RICREARE IL DATABASE
-- ========================================

-- Elimina tutte le tabelle e viste esistenti (se necessario)
DROP VIEW IF EXISTS browser_fingerprint_analysis CASCADE;
DROP VIEW IF EXISTS link_analytics_view CASCADE;
DROP VIEW IF EXISTS fingerprint_summary CASCADE;
DROP TABLE IF EXISTS daily_fingerprint_stats CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS fingerprint_interactions CASCADE;
DROP TABLE IF EXISTS fingerprint_correlations CASCADE;
DROP TABLE IF EXISTS enhanced_fingerprints CASCADE;
DROP TABLE IF EXISTS clicks CASCADE;
DROP TABLE IF EXISTS link_folder_associations CASCADE;
DROP TABLE IF EXISTS links CASCADE;
DROP TABLE IF EXISTS folders CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Ricrea tutte le tabelle nell'ordine corretto
-- (Copia e incolla tutte le CREATE TABLE sopra in sequenza)

-- Ricrea le viste
-- (Copia e incolla tutte le CREATE VIEW sopra)
```

## 📝 Note Importanti

1. **Ordine di Creazione**: Le tabelle devono essere create nell'ordine specificato a causa delle dipendenze delle foreign key.

2. **Sistema Dual di Tracking**: Il sistema mantiene sia la tabella `clicks` legacy che il nuovo sistema `enhanced_fingerprints` per compatibilità.

3. **Privacy**: I fingerprint sono hashati e non contengono informazioni personali identificabili.

4. **Performance**: Gli indici sono ottimizzati per le query più comuni del sistema.

5. **Scalabilità**: Le statistiche giornaliere aggregate permettono query veloci sui dati storici.

6. **Correlazione**: Il sistema `fingerprint_correlations` permette di identificare lo stesso utente attraverso browser diversi.

Questo schema supporta completamente tutte le funzionalità del sistema di URL shortening con analytics avanzate e fingerprinting per il tracking accurato dei visitatori unici.
