/**
 * Creazione della vista unificata unified_click_analytics
 * Questa vista centralizza tutte le metriche di analisi dei click
 * con suddivisione per diversi intervalli temporali
 */

import { sql } from '@vercel/postgres';

export async function createUnifiedClickAnalyticsView() {
  try {
    console.log('🚀 Creazione vista unified_click_analytics...');
    
    // Drop della vista esistente se presente
    await sql`DROP VIEW IF EXISTS unified_click_analytics CASCADE`;
    
    // Creazione della nuova vista con tutte le metriche richieste
    await sql`
      CREATE VIEW unified_click_analytics AS
      WITH 
      -- Definizione dei periodi temporali come CTE
      time_periods AS (
        SELECT
          NOW() AT TIME ZONE 'Europe/Rome' as current_time,
          (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '24 hours' as last_24h,
          (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '7 days' as last_week,
          (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '30 days' as last_month,
          (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '30 days' as last_30_days,
          (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '90 days' as last_90_days,
          (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '365 days' as last_year
      ),
      
      -- Metriche di base dai click (dalla tabella legacy per retrocompatibilità)
      click_metrics AS (
        SELECT
          l.id as link_id,
          l.short_code,
          l.title,
          
          -- Click totali (da tutti i tempi)
          COUNT(c.id) as total_clicks_all_time,
          COUNT(DISTINCT c.user_fingerprint) as unique_clicks_all_time,
          COUNT(DISTINCT c.country) as unique_countries_all_time,
          COUNT(DISTINCT c.device_type) as unique_devices_all_time,
          COUNT(DISTINCT CASE WHEN c.browser_name LIKE '%Chrome%' THEN 'chrome'
                              WHEN c.browser_name LIKE '%Firefox%' THEN 'firefox'
                              WHEN c.browser_name LIKE '%Safari%' THEN 'safari'
                              WHEN c.browser_name LIKE '%Edge%' THEN 'edge'
                              WHEN c.browser_name LIKE '%Opera%' THEN 'opera'
                              ELSE c.browser_name END) as unique_browsers_all_time,

          -- Ultime 24 ore
          COUNT(CASE WHEN c.clicked_at_rome >= (SELECT last_24h FROM time_periods) THEN c.id END) as total_clicks_24h,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_24h FROM time_periods) THEN c.user_fingerprint END) as unique_clicks_24h,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_24h FROM time_periods) THEN c.country END) as unique_countries_24h,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_24h FROM time_periods) THEN c.device_type END) as unique_devices_24h,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_24h FROM time_periods) 
                              THEN CASE WHEN c.browser_name LIKE '%Chrome%' THEN 'chrome'
                                        WHEN c.browser_name LIKE '%Firefox%' THEN 'firefox'
                                        WHEN c.browser_name LIKE '%Safari%' THEN 'safari'
                                        WHEN c.browser_name LIKE '%Edge%' THEN 'edge'
                                        WHEN c.browser_name LIKE '%Opera%' THEN 'opera'
                                        ELSE c.browser_name END END) as unique_browsers_24h,

          -- Ultima settimana
          COUNT(CASE WHEN c.clicked_at_rome >= (SELECT last_week FROM time_periods) THEN c.id END) as total_clicks_week,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_week FROM time_periods) THEN c.user_fingerprint END) as unique_clicks_week,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_week FROM time_periods) THEN c.country END) as unique_countries_week,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_week FROM time_periods) THEN c.device_type END) as unique_devices_week,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_week FROM time_periods) 
                              THEN CASE WHEN c.browser_name LIKE '%Chrome%' THEN 'chrome'
                                        WHEN c.browser_name LIKE '%Firefox%' THEN 'firefox'
                                        WHEN c.browser_name LIKE '%Safari%' THEN 'safari'
                                        WHEN c.browser_name LIKE '%Edge%' THEN 'edge'
                                        WHEN c.browser_name LIKE '%Opera%' THEN 'opera'
                                        ELSE c.browser_name END END) as unique_browsers_week,

          -- Ultimo mese
          COUNT(CASE WHEN c.clicked_at_rome >= (SELECT last_month FROM time_periods) THEN c.id END) as total_clicks_month,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_month FROM time_periods) THEN c.user_fingerprint END) as unique_clicks_month,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_month FROM time_periods) THEN c.country END) as unique_countries_month,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_month FROM time_periods) THEN c.device_type END) as unique_devices_month,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_month FROM time_periods) 
                              THEN CASE WHEN c.browser_name LIKE '%Chrome%' THEN 'chrome'
                                        WHEN c.browser_name LIKE '%Firefox%' THEN 'firefox'
                                        WHEN c.browser_name LIKE '%Safari%' THEN 'safari'
                                        WHEN c.browser_name LIKE '%Edge%' THEN 'edge'
                                        WHEN c.browser_name LIKE '%Opera%' THEN 'opera'
                                        ELSE c.browser_name END END) as unique_browsers_month,
          
          -- Ultimi 30 giorni (duplicato di mese, ma tenuto per chiarezza)
          COUNT(CASE WHEN c.clicked_at_rome >= (SELECT last_30_days FROM time_periods) THEN c.id END) as total_clicks_30d,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_30_days FROM time_periods) THEN c.user_fingerprint END) as unique_clicks_30d,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_30_days FROM time_periods) THEN c.country END) as unique_countries_30d,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_30_days FROM time_periods) THEN c.device_type END) as unique_devices_30d,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_30_days FROM time_periods) 
                              THEN CASE WHEN c.browser_name LIKE '%Chrome%' THEN 'chrome'
                                        WHEN c.browser_name LIKE '%Firefox%' THEN 'firefox'
                                        WHEN c.browser_name LIKE '%Safari%' THEN 'safari'
                                        WHEN c.browser_name LIKE '%Edge%' THEN 'edge'
                                        WHEN c.browser_name LIKE '%Opera%' THEN 'opera'
                                        ELSE c.browser_name END END) as unique_browsers_30d,

          -- Ultimi 90 giorni
          COUNT(CASE WHEN c.clicked_at_rome >= (SELECT last_90_days FROM time_periods) THEN c.id END) as total_clicks_90d,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_90_days FROM time_periods) THEN c.user_fingerprint END) as unique_clicks_90d,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_90_days FROM time_periods) THEN c.country END) as unique_countries_90d,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_90_days FROM time_periods) THEN c.device_type END) as unique_devices_90d,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_90_days FROM time_periods) 
                              THEN CASE WHEN c.browser_name LIKE '%Chrome%' THEN 'chrome'
                                        WHEN c.browser_name LIKE '%Firefox%' THEN 'firefox'
                                        WHEN c.browser_name LIKE '%Safari%' THEN 'safari'
                                        WHEN c.browser_name LIKE '%Edge%' THEN 'edge'
                                        WHEN c.browser_name LIKE '%Opera%' THEN 'opera'
                                        ELSE c.browser_name END END) as unique_browsers_90d,

          -- Ultimi 365 giorni
          COUNT(CASE WHEN c.clicked_at_rome >= (SELECT last_year FROM time_periods) THEN c.id END) as total_clicks_365d,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_year FROM time_periods) THEN c.user_fingerprint END) as unique_clicks_365d,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_year FROM time_periods) THEN c.country END) as unique_countries_365d,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_year FROM time_periods) THEN c.device_type END) as unique_devices_365d,
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_year FROM time_periods) 
                              THEN CASE WHEN c.browser_name LIKE '%Chrome%' THEN 'chrome'
                                        WHEN c.browser_name LIKE '%Firefox%' THEN 'firefox'
                                        WHEN c.browser_name LIKE '%Safari%' THEN 'safari'
                                        WHEN c.browser_name LIKE '%Edge%' THEN 'edge'
                                        WHEN c.browser_name LIKE '%Opera%' THEN 'opera'
                                        ELSE c.browser_name END END) as unique_browsers_365d,
                                        
          -- Dati per sistemi operativi unici
          COUNT(DISTINCT CASE 
                WHEN LOWER(c.user_agent) LIKE '%android%' THEN 'android'
                WHEN LOWER(c.user_agent) LIKE '%linux%' AND LOWER(c.user_agent) NOT LIKE '%android%' THEN 'linux'
                WHEN LOWER(c.user_agent) LIKE '%ubuntu%' THEN 'ubuntu'
                WHEN LOWER(c.user_agent) LIKE '%mac%' OR LOWER(c.user_agent) LIKE '%darwin%' THEN 'mac'
                WHEN LOWER(c.user_agent) LIKE '%ios%' OR LOWER(c.user_agent) LIKE '%iphone%' OR LOWER(c.user_agent) LIKE '%ipad%' THEN 'ios'
                WHEN LOWER(c.user_agent) LIKE '%win%' THEN 'windows'
                ELSE 'sconosciuto'
              END) as unique_os_all_time,
          
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_24h FROM time_periods) 
                THEN CASE 
                  WHEN LOWER(c.user_agent) LIKE '%android%' THEN 'android'
                  WHEN LOWER(c.user_agent) LIKE '%linux%' AND LOWER(c.user_agent) NOT LIKE '%android%' THEN 'linux'
                  WHEN LOWER(c.user_agent) LIKE '%ubuntu%' THEN 'ubuntu'
                  WHEN LOWER(c.user_agent) LIKE '%mac%' OR LOWER(c.user_agent) LIKE '%darwin%' THEN 'mac'
                  WHEN LOWER(c.user_agent) LIKE '%ios%' OR LOWER(c.user_agent) LIKE '%iphone%' OR LOWER(c.user_agent) LIKE '%ipad%' THEN 'ios'
                  WHEN LOWER(c.user_agent) LIKE '%win%' THEN 'windows'
                  ELSE 'sconosciuto'
                END
              END) as unique_os_24h,
              
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_week FROM time_periods) 
                THEN CASE 
                  WHEN LOWER(c.user_agent) LIKE '%android%' THEN 'android'
                  WHEN LOWER(c.user_agent) LIKE '%linux%' AND LOWER(c.user_agent) NOT LIKE '%android%' THEN 'linux'
                  WHEN LOWER(c.user_agent) LIKE '%ubuntu%' THEN 'ubuntu'
                  WHEN LOWER(c.user_agent) LIKE '%mac%' OR LOWER(c.user_agent) LIKE '%darwin%' THEN 'mac'
                  WHEN LOWER(c.user_agent) LIKE '%ios%' OR LOWER(c.user_agent) LIKE '%iphone%' OR LOWER(c.user_agent) LIKE '%ipad%' THEN 'ios'
                  WHEN LOWER(c.user_agent) LIKE '%win%' THEN 'windows'
                  ELSE 'sconosciuto'
                END
              END) as unique_os_week,
              
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_month FROM time_periods) 
                THEN CASE 
                  WHEN LOWER(c.user_agent) LIKE '%android%' THEN 'android'
                  WHEN LOWER(c.user_agent) LIKE '%linux%' AND LOWER(c.user_agent) NOT LIKE '%android%' THEN 'linux'
                  WHEN LOWER(c.user_agent) LIKE '%ubuntu%' THEN 'ubuntu'
                  WHEN LOWER(c.user_agent) LIKE '%mac%' OR LOWER(c.user_agent) LIKE '%darwin%' THEN 'mac'
                  WHEN LOWER(c.user_agent) LIKE '%ios%' OR LOWER(c.user_agent) LIKE '%iphone%' OR LOWER(c.user_agent) LIKE '%ipad%' THEN 'ios'
                  WHEN LOWER(c.user_agent) LIKE '%win%' THEN 'windows'
                  ELSE 'sconosciuto'
                END
              END) as unique_os_month,
              
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_30_days FROM time_periods) 
                THEN CASE 
                  WHEN LOWER(c.user_agent) LIKE '%android%' THEN 'android'
                  WHEN LOWER(c.user_agent) LIKE '%linux%' AND LOWER(c.user_agent) NOT LIKE '%android%' THEN 'linux'
                  WHEN LOWER(c.user_agent) LIKE '%ubuntu%' THEN 'ubuntu'
                  WHEN LOWER(c.user_agent) LIKE '%mac%' OR LOWER(c.user_agent) LIKE '%darwin%' THEN 'mac'
                  WHEN LOWER(c.user_agent) LIKE '%ios%' OR LOWER(c.user_agent) LIKE '%iphone%' OR LOWER(c.user_agent) LIKE '%ipad%' THEN 'ios'
                  WHEN LOWER(c.user_agent) LIKE '%win%' THEN 'windows'
                  ELSE 'sconosciuto'
                END
              END) as unique_os_30d,
              
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_90_days FROM time_periods) 
                THEN CASE 
                  WHEN LOWER(c.user_agent) LIKE '%android%' THEN 'android'
                  WHEN LOWER(c.user_agent) LIKE '%linux%' AND LOWER(c.user_agent) NOT LIKE '%android%' THEN 'linux'
                  WHEN LOWER(c.user_agent) LIKE '%ubuntu%' THEN 'ubuntu'
                  WHEN LOWER(c.user_agent) LIKE '%mac%' OR LOWER(c.user_agent) LIKE '%darwin%' THEN 'mac'
                  WHEN LOWER(c.user_agent) LIKE '%ios%' OR LOWER(c.user_agent) LIKE '%iphone%' OR LOWER(c.user_agent) LIKE '%ipad%' THEN 'ios'
                  WHEN LOWER(c.user_agent) LIKE '%win%' THEN 'windows'
                  ELSE 'sconosciuto'
                END
              END) as unique_os_90d,
              
          COUNT(DISTINCT CASE WHEN c.clicked_at_rome >= (SELECT last_year FROM time_periods) 
                THEN CASE 
                  WHEN LOWER(c.user_agent) LIKE '%android%' THEN 'android'
                  WHEN LOWER(c.user_agent) LIKE '%linux%' AND LOWER(c.user_agent) NOT LIKE '%android%' THEN 'linux'
                  WHEN LOWER(c.user_agent) LIKE '%ubuntu%' THEN 'ubuntu'
                  WHEN LOWER(c.user_agent) LIKE '%mac%' OR LOWER(c.user_agent) LIKE '%darwin%' THEN 'mac'
                  WHEN LOWER(c.user_agent) LIKE '%ios%' OR LOWER(c.user_agent) LIKE '%iphone%' OR LOWER(c.user_agent) LIKE '%ipad%' THEN 'ios'
                  WHEN LOWER(c.user_agent) LIKE '%win%' THEN 'windows'
                  ELSE 'sconosciuto'
                END
              END) as unique_os_365d
              
        FROM 
          links l
        LEFT JOIN 
          clicks c ON l.id = c.link_id
        GROUP BY 
          l.id, l.short_code, l.title
      ),
      
      -- Unione con la tabella enhanced_fingerprints per dati più avanzati
      -- Questa sezione integra i dati della tabella enhanced_fingerprints con quelli dei click legacy
      enhanced_metrics AS (
        SELECT
          ef.link_id,
          
          -- Dati accurati per device (quando disponibili)
          COUNT(DISTINCT ef.device_category) as enhanced_unique_devices_all_time,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_24h FROM time_periods) THEN ef.device_category END) as enhanced_unique_devices_24h,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_week FROM time_periods) THEN ef.device_category END) as enhanced_unique_devices_week,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_month FROM time_periods) THEN ef.device_category END) as enhanced_unique_devices_month,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_30_days FROM time_periods) THEN ef.device_category END) as enhanced_unique_devices_30d,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_90_days FROM time_periods) THEN ef.device_category END) as enhanced_unique_devices_90d,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_year FROM time_periods) THEN ef.device_category END) as enhanced_unique_devices_365d,
          
          -- Dati accurati per OS (quando disponibili)
          COUNT(DISTINCT ef.os_family) as enhanced_unique_os_all_time,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_24h FROM time_periods) THEN ef.os_family END) as enhanced_unique_os_24h,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_week FROM time_periods) THEN ef.os_family END) as enhanced_unique_os_week,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_month FROM time_periods) THEN ef.os_family END) as enhanced_unique_os_month,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_30_days FROM time_periods) THEN ef.os_family END) as enhanced_unique_os_30d,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_90_days FROM time_periods) THEN ef.os_family END) as enhanced_unique_os_90d,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_year FROM time_periods) THEN ef.os_family END) as enhanced_unique_os_365d,
          
          -- Dati accurati per browser (quando disponibili)
          COUNT(DISTINCT ef.browser_type) as enhanced_unique_browsers_all_time,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_24h FROM time_periods) THEN ef.browser_type END) as enhanced_unique_browsers_24h,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_week FROM time_periods) THEN ef.browser_type END) as enhanced_unique_browsers_week,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_month FROM time_periods) THEN ef.browser_type END) as enhanced_unique_browsers_month,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_30_days FROM time_periods) THEN ef.browser_type END) as enhanced_unique_browsers_30d,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_90_days FROM time_periods) THEN ef.browser_type END) as enhanced_unique_browsers_90d,
          COUNT(DISTINCT CASE WHEN ef.last_seen >= (SELECT last_year FROM time_periods) THEN ef.browser_type END) as enhanced_unique_browsers_365d
          
        FROM 
          enhanced_fingerprints ef
        GROUP BY 
          ef.link_id
      )
      
      -- Risultato finale unificato
      SELECT 
        cm.link_id,
        cm.short_code,
        cm.title,
        
        -- PARAMETRO 1: Click totali per link
        cm.total_clicks_all_time,
        cm.total_clicks_24h,
        cm.total_clicks_week,
        cm.total_clicks_month,
        cm.total_clicks_30d,
        cm.total_clicks_90d,
        cm.total_clicks_365d,
        
        -- PARAMETRO 2: Click unici per link
        cm.unique_clicks_all_time,
        cm.unique_clicks_24h,
        cm.unique_clicks_week,
        cm.unique_clicks_month,
        cm.unique_clicks_30d,
        cm.unique_clicks_90d,
        cm.unique_clicks_365d,
        
        -- PARAMETRO 3: Paesi unici
        cm.unique_countries_all_time,
        cm.unique_countries_24h,
        cm.unique_countries_week,
        cm.unique_countries_month,
        cm.unique_countries_30d,
        cm.unique_countries_90d,
        cm.unique_countries_365d,
        
        -- PARAMETRO 4: Device unici (usando dati enhanced quando disponibili)
        COALESCE(em.enhanced_unique_devices_all_time, cm.unique_devices_all_time) as unique_devices_all_time,
        COALESCE(em.enhanced_unique_devices_24h, cm.unique_devices_24h) as unique_devices_24h,
        COALESCE(em.enhanced_unique_devices_week, cm.unique_devices_week) as unique_devices_week,
        COALESCE(em.enhanced_unique_devices_month, cm.unique_devices_month) as unique_devices_month,
        COALESCE(em.enhanced_unique_devices_30d, cm.unique_devices_30d) as unique_devices_30d,
        COALESCE(em.enhanced_unique_devices_90d, cm.unique_devices_90d) as unique_devices_90d,
        COALESCE(em.enhanced_unique_devices_365d, cm.unique_devices_365d) as unique_devices_365d,
        
        -- PARAMETRO 5: Sistemi operativi unici (usando dati enhanced quando disponibili)
        COALESCE(em.enhanced_unique_os_all_time, cm.unique_os_all_time) as unique_os_all_time,
        COALESCE(em.enhanced_unique_os_24h, cm.unique_os_24h) as unique_os_24h,
        COALESCE(em.enhanced_unique_os_week, cm.unique_os_week) as unique_os_week,
        COALESCE(em.enhanced_unique_os_month, cm.unique_os_month) as unique_os_month,
        COALESCE(em.enhanced_unique_os_30d, cm.unique_os_30d) as unique_os_30d,
        COALESCE(em.enhanced_unique_os_90d, cm.unique_os_90d) as unique_os_90d,
        COALESCE(em.enhanced_unique_os_365d, cm.unique_os_365d) as unique_os_365d,
        
        -- PARAMETRO 6: Browser unici (usando dati enhanced quando disponibili)
        COALESCE(em.enhanced_unique_browsers_all_time, cm.unique_browsers_all_time) as unique_browsers_all_time,
        COALESCE(em.enhanced_unique_browsers_24h, cm.unique_browsers_24h) as unique_browsers_24h,
        COALESCE(em.enhanced_unique_browsers_week, cm.unique_browsers_week) as unique_browsers_week,
        COALESCE(em.enhanced_unique_browsers_month, cm.unique_browsers_month) as unique_browsers_month,
        COALESCE(em.enhanced_unique_browsers_30d, cm.unique_browsers_30d) as unique_browsers_30d,
        COALESCE(em.enhanced_unique_browsers_90d, cm.unique_browsers_90d) as unique_browsers_90d,
        COALESCE(em.enhanced_unique_browsers_365d, cm.unique_browsers_365d) as unique_browsers_365d,
        
        -- Timestamp di generazione
        (SELECT current_time FROM time_periods) as stats_generated_at
        
      FROM 
        click_metrics cm
      LEFT JOIN 
        enhanced_metrics em ON cm.link_id = em.link_id
      ORDER BY 
        cm.link_id
    `;
    
    console.log('✅ Vista unified_click_analytics creata con successo!');
    
    // Crea una tabella di log per tracciare gli aggiornamenti delle statistiche
    await sql`
      CREATE TABLE IF NOT EXISTS analytics_refresh_log (
        id SERIAL PRIMARY KEY,
        refresh_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        successful BOOLEAN DEFAULT TRUE,
        error_message TEXT DEFAULT NULL,
        duration_ms INTEGER DEFAULT 0
      )
    `;
    
    console.log('✅ Tabella analytics_refresh_log creata con successo!');
    
    // Registra il primo aggiornamento
    await sql`
      INSERT INTO analytics_refresh_log (successful, duration_ms) 
      VALUES (TRUE, 0)
    `;
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Errore durante la creazione della vista unified_click_analytics:', error);
    
    // Registra l'errore nel log
    try {
      await sql`
        INSERT INTO analytics_refresh_log (successful, error_message) 
        VALUES (FALSE, ${error instanceof Error ? error.message : String(error)})
      `;
    } catch (logError) {
      console.error('Impossibile registrare l\'errore nel log:', logError);
    }
    
    throw error;
  }
}

// Funzione per aggiornare le statistiche (da chiamare tramite cron job)
export async function refreshClickAnalytics() {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Aggiornamento statistiche click in corso...');
    
    // Forza un refresh della vista materializzata (se esiste)
    await sql`REFRESH MATERIALIZED VIEW IF EXISTS unified_click_analytics_mv`;
    
    // Calcola la durata
    const duration = Date.now() - startTime;
    
    // Registra l'aggiornamento riuscito
    await sql`
      INSERT INTO analytics_refresh_log (successful, duration_ms) 
      VALUES (TRUE, ${duration})
    `;
    
    console.log(`✅ Statistiche aggiornate in ${duration}ms`);
    return { success: true, duration };
    
  } catch (error) {
    // Calcola la durata anche in caso di errore
    const duration = Date.now() - startTime;
    
    console.error('❌ Errore durante l\'aggiornamento delle statistiche:', error);
    
    // Registra l'errore
    try {
      await sql`
        INSERT INTO analytics_refresh_log (successful, error_message, duration_ms) 
        VALUES (FALSE, ${error instanceof Error ? error.message : String(error)}, ${duration})
      `;
    } catch (logError) {
      console.error('Impossibile registrare l\'errore nel log:', logError);
    }
    
    throw error;
  }
}

// Export per uso standalone
if (require.main === module) {
  createUnifiedClickAnalyticsView()
    .then(() => {
      console.log('✨ Creazione vista analytics completata!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Creazione vista analytics fallita:', error);
      process.exit(1);
    });
}
