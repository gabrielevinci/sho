import { getSession } from '@/app/lib/session';
import { redirect, notFound } from 'next/navigation';
import { sql } from '@vercel/postgres';
import AnalyticsClient from './analytics-client';

// Tipi per i dati delle statistiche
type LinkAnalytics = {
  short_code: string;
  original_url: string;
  title: string | null;
  description: string | null;
  click_count: number;
  created_at: Date;
};

type ClickAnalytics = {
  total_clicks: number;
  unique_clicks: number;
  unique_countries: number;
  unique_referrers: number;
  unique_devices: number;
  unique_browsers: number;
  top_referrer: string | null;
  most_used_browser: string | null;
  most_used_device: string | null;
  clicks_today: number;
  clicks_this_week: number;
  clicks_this_month: number;
  unique_clicks_today: number;
  unique_clicks_this_week: number;
  unique_clicks_this_month: number;
  avg_total_clicks_per_period: number;      // Media click totali per periodo (ora/giorno)
  avg_unique_clicks_per_period: number;     // Media click unici per periodo (ora/giorno)
};

type GeographicData = {
  country: string;
  clicks: number;
  percentage: number;
};

type DeviceData = {
  device_type: string;
  clicks: number;
  percentage: number;
};

type BrowserData = {
  browser_name: string;
  clicks: number;
  percentage: number;
};

type ReferrerData = {
  referrer: string;
  clicks: number;
  percentage: number;
};

type TimeSeriesData = {
  date: string;
  total_clicks: number;
  unique_clicks: number;
  full_datetime?: string | Date; // Campo opzionale per i dati orari
};

type MonthlyData = {
  month: string;
  month_number: number;
  year: number;
  total_clicks: number;
  unique_clicks: number;
};

type WeeklyData = {
  week: number;
  year: number;
  week_start: string;
  week_end: string;
  total_clicks: number;
  unique_clicks: number;
};

// Funzione per ottenere i dati del link
async function getLinkData(userId: string, workspaceId: string, shortCode: string): Promise<LinkAnalytics | null> {
  try {
    const { rows } = await sql<LinkAnalytics>`
      SELECT short_code, original_url, title, description, click_count, created_at
      FROM links
      WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
      LIMIT 1
    `;
    return rows[0] || null;
  } catch (error) {
    console.error("Failed to fetch link data:", error);
    return null;
  }
}

// Helper per unique visitors uniformi (stesso dell'API route)
function getUniqueVisitorLogic() {
  return `COALESCE(fc.device_cluster_id, ef.fingerprint_hash, c.user_fingerprint)`;
}

// Funzione per ottenere le statistiche di base del link - UNIFICATA con API route
async function getClickAnalytics(userId: string, workspaceId: string, shortCode: string): Promise<ClickAnalytics> {
  try {
    console.log('🔍 [SSR ANALYTICS] Caricamento dati server-side per:', shortCode);

    const query = `
      WITH link_info AS (
        SELECT id, click_count, unique_click_count, created_at
        FROM links 
        WHERE user_id = $1 AND workspace_id = $2 AND short_code = $3
      ),
      
      -- STESSA LOGICA DELL'API ROUTE: Tutti i click con enhanced fingerprints
      all_clicks AS (
        SELECT DISTINCT
          c.id as click_id,
          c.country,
          c.referrer,
          c.browser_name,
          c.device_type,
          c.clicked_at_rome,
          ${getUniqueVisitorLogic()} as unique_visitor_id,
          c.user_fingerprint as original_fingerprint
        FROM clicks c
        JOIN link_info li ON c.link_id = li.id
        LEFT JOIN enhanced_fingerprints ef ON c.link_id = ef.link_id 
          AND (c.user_fingerprint = ef.fingerprint_hash OR c.user_fingerprint = ef.device_fingerprint)
        LEFT JOIN fingerprint_correlations fc ON ef.fingerprint_hash = fc.fingerprint_hash
      ),
      
      -- STATISTICHE PRINCIPALI
      main_stats AS (
        SELECT 
          COUNT(*) as total_clicks,
          COUNT(DISTINCT unique_visitor_id) as unique_clicks,
          COUNT(DISTINCT country) as unique_countries,
          COUNT(DISTINCT CASE WHEN referrer IS NOT NULL AND referrer != 'Direct' THEN referrer END) as unique_referrers,
          COUNT(DISTINCT device_type) as unique_devices,
          COUNT(DISTINCT browser_name) as unique_browsers
        FROM all_clicks
      ),
      
      -- STATISTICHE PERIODICHE (finestre temporali standard)
      period_stats AS (
        SELECT 
          COUNT(CASE WHEN clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '1 day' THEN 1 END) as clicks_today,
          COUNT(CASE WHEN clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '7 days' THEN 1 END) as clicks_this_week,
          COUNT(CASE WHEN clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '30 days' THEN 1 END) as clicks_this_month,
          COUNT(DISTINCT CASE WHEN clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '1 day' THEN unique_visitor_id END) as unique_clicks_today,
          COUNT(DISTINCT CASE WHEN clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '7 days' THEN unique_visitor_id END) as unique_clicks_this_week,
          COUNT(DISTINCT CASE WHEN clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '30 days' THEN unique_visitor_id END) as unique_clicks_this_month
        FROM all_clicks
      ),
      
      -- TOP VALUES
      top_values AS (
        SELECT 
          (SELECT referrer FROM all_clicks 
           WHERE referrer IS NOT NULL AND referrer != 'Direct' 
           GROUP BY referrer ORDER BY COUNT(*) DESC LIMIT 1) as top_referrer,
          (SELECT browser_name FROM all_clicks 
           WHERE browser_name IS NOT NULL 
           GROUP BY browser_name ORDER BY COUNT(*) DESC LIMIT 1) as most_used_browser,
          (SELECT device_type FROM all_clicks 
           WHERE device_type IS NOT NULL 
           GROUP BY device_type ORDER BY COUNT(*) DESC LIMIT 1) as most_used_device
      )
      
      SELECT 
        -- USA SEMPRE dati calcolati dalle query (stessa logica API route)
        ms.total_clicks,
        ms.unique_clicks,
        ms.unique_countries,
        ms.unique_referrers,
        ms.unique_devices,
        ms.unique_browsers,
        tv.top_referrer,
        tv.most_used_browser,
        tv.most_used_device,
        ps.clicks_today,
        ps.clicks_this_week,
        ps.clicks_this_month,
        ps.unique_clicks_today,
        ps.unique_clicks_this_week,
        ps.unique_clicks_this_month,
        li.created_at
      FROM link_info li
      CROSS JOIN main_stats ms
      CROSS JOIN period_stats ps  
      CROSS JOIN top_values tv
    `;

    const { rows } = await sql.query(query, [userId, workspaceId, shortCode]);
    const result = rows[0];

    if (!result) {
      console.error('❌ [SSR ANALYTICS] Nessun risultato dalla query');
      throw new Error('No analytics data found');
    }

    console.log('✅ [SSR ANALYTICS] Risultati query server-side:', {
      total_clicks: result.total_clicks,
      unique_clicks: result.unique_clicks,
      unique_countries: result.unique_countries,
      clicks_today: result.clicks_today,
      clicks_this_week: result.clicks_this_week
    });

    // Calcola le medie giornaliere
    const createdAt = new Date(result.created_at);
    const now = new Date();
    const daysSinceCreation = Math.max(1, Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    
    return {
      total_clicks: parseInt(result.total_clicks) || 0,
      unique_clicks: parseInt(result.unique_clicks) || 0,
      unique_countries: parseInt(result.unique_countries) || 0,
      unique_referrers: parseInt(result.unique_referrers) || 0,
      unique_devices: parseInt(result.unique_devices) || 0,
      unique_browsers: parseInt(result.unique_browsers) || 0,
      top_referrer: result.top_referrer,
      most_used_browser: result.most_used_browser,
      most_used_device: result.most_used_device,
      clicks_today: parseInt(result.clicks_today) || 0,
      clicks_this_week: parseInt(result.clicks_this_week) || 0,
      clicks_this_month: parseInt(result.clicks_this_month) || 0,
      unique_clicks_today: parseInt(result.unique_clicks_today) || 0,
      unique_clicks_this_week: parseInt(result.unique_clicks_this_week) || 0,
      unique_clicks_this_month: parseInt(result.unique_clicks_this_month) || 0,
      avg_total_clicks_per_period: Math.round((parseInt(result.total_clicks) / daysSinceCreation) * 100) / 100,
      avg_unique_clicks_per_period: Math.round((parseInt(result.unique_clicks) / daysSinceCreation) * 100) / 100
    };

  } catch (error) {
    console.error("❌ [SSR ANALYTICS] Errore in getClickAnalytics:", error);
    throw error;
  }
}

// Funzione per ottenere i dati geografici - CORRETTA per usare scaling
async function getGeographicData(userId: string, workspaceId: string, shortCode: string): Promise<GeographicData[]> {
  try {
    const { rows } = await sql<GeographicData>`
      WITH link_data AS (
        SELECT id, click_count, unique_click_count FROM links 
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
      ),
      total_calculated AS (
        SELECT COUNT(*) as total_from_enhanced
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
      ),
      scaling_factor AS (
        SELECT 
          CASE WHEN tc.total_from_enhanced > 0 
               THEN (SELECT click_count FROM link_data)::float / tc.total_from_enhanced 
               ELSE 1.0 END as factor
        FROM total_calculated tc
      ),
      country_clicks AS (
        SELECT 
          ef.country, 
          COUNT(*) as raw_clicks
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
        GROUP BY ef.country
      ),
      scaled_country_clicks AS (
        SELECT 
          cc.country,
          ROUND(cc.raw_clicks * (SELECT factor FROM scaling_factor))::integer as clicks
        FROM country_clicks cc
      ),
      total_scaled AS (
        SELECT SUM(clicks) as total
        FROM scaled_country_clicks
      )
      SELECT 
        scc.country,
        scc.clicks,
        ROUND((scc.clicks::float / NULLIF(ts.total, 0) * 100)::numeric, 1) as percentage
      FROM scaled_country_clicks scc, total_scaled ts
      ORDER BY scc.clicks DESC
      LIMIT 10
    `;
    return rows;
  } catch (error) {
    console.error("Failed to fetch geographic data:", error);
    return [];
  }
}

// Funzione per ottenere i dati dei dispositivi - CORRETTA per usare scaling
async function getDeviceData(userId: string, workspaceId: string, shortCode: string): Promise<DeviceData[]> {
  try {
    const { rows } = await sql<DeviceData>`
      WITH link_data AS (
        SELECT id, click_count, unique_click_count FROM links 
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
      ),
      total_calculated AS (
        SELECT COUNT(*) as total_from_enhanced
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
      ),
      scaling_factor AS (
        SELECT 
          CASE WHEN tc.total_from_enhanced > 0 
               THEN (SELECT click_count FROM link_data)::float / tc.total_from_enhanced 
               ELSE 1.0 END as factor
        FROM total_calculated tc
      ),
      device_clicks AS (
        SELECT 
          ef.device_category as device_type, 
          COUNT(*) as raw_clicks
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
        GROUP BY ef.device_category
      ),
      scaled_device_clicks AS (
        SELECT 
          dc.device_type,
          ROUND(dc.raw_clicks * (SELECT factor FROM scaling_factor))::integer as clicks
        FROM device_clicks dc
      ),
      total_scaled AS (
        SELECT SUM(clicks) as total
        FROM scaled_device_clicks
      )
      SELECT 
        sdc.device_type,
        sdc.clicks,
        ROUND((sdc.clicks::float / NULLIF(ts.total, 0) * 100)::numeric, 1) as percentage
      FROM scaled_device_clicks sdc, total_scaled ts
      ORDER BY sdc.clicks DESC
    `;
    return rows;
  } catch (error) {
    console.error("Failed to fetch device data:", error);
    return [];
  }
}

// Funzione per ottenere i dati dei browser - CORRETTA per usare scaling
async function getBrowserData(userId: string, workspaceId: string, shortCode: string): Promise<BrowserData[]> {
  try {
    const { rows } = await sql<BrowserData>`
      WITH link_data AS (
        SELECT id, click_count, unique_click_count FROM links 
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
      ),
      total_calculated AS (
        SELECT COUNT(*) as total_from_enhanced
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
      ),
      scaling_factor AS (
        SELECT 
          CASE WHEN tc.total_from_enhanced > 0 
               THEN (SELECT click_count FROM link_data)::float / tc.total_from_enhanced 
               ELSE 1.0 END as factor
        FROM total_calculated tc
      ),
      browser_clicks AS (
        SELECT 
          ef.browser_type as browser_name, 
          COUNT(*) as raw_clicks
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
        GROUP BY ef.browser_type
      ),
      scaled_browser_clicks AS (
        SELECT 
          bc.browser_name,
          ROUND(bc.raw_clicks * (SELECT factor FROM scaling_factor))::integer as clicks
        FROM browser_clicks bc
      ),
      total_scaled AS (
        SELECT SUM(clicks) as total
        FROM scaled_browser_clicks
      )
      SELECT 
        sbc.browser_name,
        sbc.clicks,
        ROUND((sbc.clicks::float / NULLIF(ts.total, 0) * 100)::numeric, 1) as percentage
      FROM scaled_browser_clicks sbc, total_scaled ts
      ORDER BY sbc.clicks DESC
      LIMIT 10
    `;
    return rows;
  } catch (error) {
    console.error("Failed to fetch browser data:", error);
    return [];
  }
}

// Funzione per ottenere i dati dei referrer
async function getReferrerData(userId: string, workspaceId: string, shortCode: string): Promise<ReferrerData[]> {
  try {
    // Prima controlliamo se esiste il campo referrer in enhanced_fingerprints
    const hasReferrerField = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'enhanced_fingerprints' 
      AND column_name = 'referrer'
    `;

    if (hasReferrerField.rows.length > 0) {
      // Usa enhanced_fingerprints se ha il campo referrer
      const { rows } = await sql<ReferrerData>`
        SELECT 
          COALESCE(ef.referrer, 'Direct') as referrer, 
          COUNT(*) as clicks
        FROM enhanced_fingerprints ef
        JOIN links l ON ef.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        GROUP BY COALESCE(ef.referrer, 'Direct')
        ORDER BY clicks DESC
        LIMIT 10
      `;
      return rows;
    } else {
      // Fallback alla tabella clicks se enhanced_fingerprints non ha referrer
      const { rows } = await sql<ReferrerData>`
        SELECT 
          COALESCE(c.referrer, 'Direct') as referrer, 
          COUNT(*) as clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        GROUP BY COALESCE(c.referrer, 'Direct')
        ORDER BY clicks DESC
        LIMIT 10
      `;
      return rows;
    }
  } catch (error) {
    console.error("Failed to fetch referrer data:", error);
    return [];
  }
}

// Funzione per ottenere i dati temporali dalla creazione del link - CORRETTA per usare click reali dalla tabella links
async function getTimeSeriesData(userId: string, workspaceId: string, shortCode: string): Promise<TimeSeriesData[]> {
  try {
    const { rows } = await sql<TimeSeriesData>`
      WITH link_data AS (
        SELECT id, click_count, unique_click_count FROM links 
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
      ),
      link_creation_date AS (
        -- Trova la data di creazione del link
        SELECT (created_at AT TIME ZONE 'Europe/Rome')::date as creation_date
        FROM links
        WHERE user_id = ${userId} 
          AND workspace_id = ${workspaceId} 
          AND short_code = ${shortCode}
      ),
      current_date_italy AS (
        -- Data corrente in Italia
        SELECT (NOW() AT TIME ZONE 'Europe/Rome')::date as current_date
      ),
      total_calculated AS (
        SELECT 
          COUNT(*) as total_from_enhanced,
          COUNT(DISTINCT ef.device_fingerprint) as unique_from_enhanced
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
      ),
      date_series AS (
        SELECT generate_series(
          (SELECT creation_date FROM link_creation_date),
          (SELECT current_date FROM current_date_italy),
          INTERVAL '1 day'
        )::date AS date
      ),
      daily_clicks AS (
        SELECT 
          ef.created_at::date as date,
          COUNT(ef.id) as raw_total_clicks,
          COUNT(DISTINCT ef.device_fingerprint) as raw_unique_clicks
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
        GROUP BY ef.created_at::date
      ),
      distribution_factors AS (
        SELECT 
          dc.date,
          CASE WHEN tc.total_from_enhanced > 0 
               THEN dc.raw_total_clicks::float / tc.total_from_enhanced 
               ELSE 0 END as total_distribution,
          CASE WHEN tc.unique_from_enhanced > 0 
               THEN dc.raw_unique_clicks::float / tc.unique_from_enhanced 
               ELSE 0 END as unique_distribution
        FROM daily_clicks dc, total_calculated tc
      )
      SELECT 
        TO_CHAR(ds.date, 'YYYY-MM-DD') as date,
        ROUND(COALESCE(df.total_distribution, 0) * (SELECT click_count FROM link_data))::integer as total_clicks,
        ROUND(COALESCE(df.unique_distribution, 0) * (SELECT unique_click_count FROM link_data))::integer as unique_clicks,
        ds.date as full_datetime
      FROM date_series ds
      LEFT JOIN distribution_factors df ON ds.date = df.date
      ORDER BY ds.date
    `;
    return rows.map(row => ({
      ...row,
      full_datetime: row.full_datetime || row.date
    }));
  } catch (error) {
    console.error("Failed to fetch time series data:", error);
    return [];
  }
}

// Funzione per ottenere i dati mensili dei click - CORRETTA per usare click reali dalla tabella links
async function getMonthlyData(userId: string, workspaceId: string, shortCode: string): Promise<MonthlyData[]> {
  try {
    const { rows } = await sql<MonthlyData>`
      WITH link_data AS (
        SELECT id, click_count, unique_click_count FROM links 
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
      ),
      total_calculated AS (
        SELECT 
          COUNT(*) as total_from_enhanced,
          COUNT(DISTINCT ef.device_fingerprint) as unique_from_enhanced
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
          AND ef.created_at >= DATE_TRUNC('year', CURRENT_DATE)
          AND ef.created_at < DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'
      ),
      month_series AS (
        SELECT 
          generate_series(1, 12) as month_number,
          EXTRACT(YEAR FROM CURRENT_DATE) as year,
          TO_CHAR(make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, generate_series(1, 12), 1), 'Month') as month
      ),
      monthly_clicks AS (
        SELECT 
          EXTRACT(MONTH FROM ef.created_at)::integer as month_number,
          EXTRACT(YEAR FROM ef.created_at)::integer as year,
          COUNT(ef.id)::integer as raw_total_clicks,
          COUNT(DISTINCT ef.device_fingerprint)::integer as raw_unique_clicks
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
          AND ef.created_at >= DATE_TRUNC('year', CURRENT_DATE)
          AND ef.created_at < DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'
        GROUP BY EXTRACT(MONTH FROM ef.created_at), EXTRACT(YEAR FROM ef.created_at)
      ),
      distribution_factors AS (
        SELECT 
          mc.month_number,
          mc.year,
          CASE WHEN tc.total_from_enhanced > 0 
               THEN mc.raw_total_clicks::float / tc.total_from_enhanced 
               ELSE 0 END as total_distribution,
          CASE WHEN tc.unique_from_enhanced > 0 
               THEN mc.raw_unique_clicks::float / tc.unique_from_enhanced 
               ELSE 0 END as unique_distribution
        FROM monthly_clicks mc, total_calculated tc
      )
      SELECT 
        TRIM(ms.month) as month,
        ms.month_number::integer,
        ms.year::integer,
        ROUND(COALESCE(df.total_distribution, 0) * (SELECT click_count FROM link_data))::integer as total_clicks,
        ROUND(COALESCE(df.unique_distribution, 0) * (SELECT unique_click_count FROM link_data))::integer as unique_clicks
      FROM month_series ms
      LEFT JOIN distribution_factors df ON ms.month_number = df.month_number AND ms.year = df.year
      ORDER BY ms.month_number
    `;
    return rows || [];
  } catch (error) {
    console.error("Failed to fetch monthly data:", error);
    // Ritorna i 12 mesi con dati vuoti come fallback
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentYear = new Date().getFullYear();
    return months.map((month, index) => ({
      month,
      month_number: index + 1,
      year: currentYear,
      total_clicks: 0,
      unique_clicks: 0
    }));
  }
}

// Funzione per ottenere i dati settimanali dei click dell'anno corrente - CORRETTA per usare click reali dalla tabella links
async function getWeeklyData(userId: string, workspaceId: string, shortCode: string): Promise<WeeklyData[]> {
  try {
    const { rows } = await sql<WeeklyData>`
      WITH link_data AS (
        SELECT id, click_count, unique_click_count FROM links 
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
      ),
      total_calculated AS (
        SELECT 
          COUNT(*) as total_from_enhanced,
          COUNT(DISTINCT ef.device_fingerprint) as unique_from_enhanced
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
          AND ef.created_at >= DATE_TRUNC('year', CURRENT_DATE)
          AND ef.created_at < DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'
      ),
      current_week_num AS (
        SELECT DATE_PART('week', CURRENT_DATE)::integer as week_num
      ),
      week_series AS (
        SELECT 
          generate_series(1, (SELECT week_num FROM current_week_num)) as week,
          EXTRACT(YEAR FROM CURRENT_DATE) as year
      ),
      weekly_clicks AS (
        SELECT 
          DATE_PART('week', ef.created_at)::integer as week,
          EXTRACT(YEAR FROM ef.created_at)::integer as year,
          COUNT(ef.id)::integer as raw_total_clicks,
          COUNT(DISTINCT ef.device_fingerprint)::integer as raw_unique_clicks,
          MIN(ef.created_at::date) as week_start,
          MAX(ef.created_at::date) as week_end
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
          AND ef.created_at >= DATE_TRUNC('year', CURRENT_DATE)
          AND ef.created_at < DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'
        GROUP BY DATE_PART('week', ef.created_at), EXTRACT(YEAR FROM ef.created_at)
      ),
      distribution_factors AS (
        SELECT 
          wc.week,
          wc.year,
          wc.week_start,
          wc.week_end,
          CASE WHEN tc.total_from_enhanced > 0 
               THEN wc.raw_total_clicks::float / tc.total_from_enhanced 
               ELSE 0 END as total_distribution,
          CASE WHEN tc.unique_from_enhanced > 0 
               THEN wc.raw_unique_clicks::float / tc.unique_from_enhanced 
               ELSE 0 END as unique_distribution
        FROM weekly_clicks wc, total_calculated tc
      )
      SELECT 
        ws.week::integer,
        ws.year::integer,
        COALESCE(df.week_start::text, 
          (DATE_TRUNC('year', CURRENT_DATE) + (ws.week - 1) * INTERVAL '1 week')::date::text
        ) as week_start,
        COALESCE(df.week_end::text, 
          (DATE_TRUNC('year', CURRENT_DATE) + (ws.week - 1) * INTERVAL '1 week' + INTERVAL '6 days')::date::text
        ) as week_end,
        ROUND(COALESCE(df.total_distribution, 0) * (SELECT click_count FROM link_data))::integer as total_clicks,
        ROUND(COALESCE(df.unique_distribution, 0) * (SELECT unique_click_count FROM link_data))::integer as unique_clicks
      FROM week_series ws
      LEFT JOIN distribution_factors df ON ws.week = df.week AND ws.year = df.year
      ORDER BY ws.week
    `;
    return rows || [];
  } catch (error) {
    console.error("Failed to fetch weekly data:", error);
    // Fallback: ritorna le settimane fino ad ora con dati vuoti
    const currentWeek = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
    const currentYear = new Date().getFullYear();
    return Array.from({ length: Math.min(52, currentWeek) }, (_, index) => {
      const weekNumber = index + 1;
      const yearStart = new Date(currentYear, 0, 1);
      const weekStart = new Date(yearStart.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      
      return {
        week: weekNumber,
        year: currentYear,
        week_start: weekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
        total_clicks: 0,
        unique_clicks: 0
      };
    });
  }
}

// Funzione per ottenere i dati orari delle ultime 24 ore - CORRETTA per usare click reali dalla tabella links
async function getHourlyData(userId: string, workspaceId: string, shortCode: string): Promise<TimeSeriesData[]> {
  try {
    const { rows } = await sql<TimeSeriesData>`
      WITH link_data AS (
        SELECT id, click_count, unique_click_count FROM links 
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
      ),
      total_calculated AS (
        SELECT 
          COUNT(*) as total_from_enhanced,
          COUNT(DISTINCT ef.device_fingerprint) as unique_from_enhanced
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
          AND ef.created_at >= NOW() - INTERVAL '23 hours'
      ),
      hour_series AS (
        SELECT generate_series(
          DATE_TRUNC('hour', NOW() - INTERVAL '23 hours'),
          DATE_TRUNC('hour', NOW()),
          INTERVAL '1 hour'
        ) AS hour
      ),
      hourly_clicks AS (
        SELECT 
          DATE_TRUNC('hour', ef.created_at) as hour,
          COUNT(*) as raw_total_clicks,
          COUNT(DISTINCT ef.device_fingerprint) as raw_unique_clicks
        FROM enhanced_fingerprints ef
        WHERE ef.link_id IN (SELECT id FROM link_data)
          AND ef.created_at >= NOW() - INTERVAL '23 hours'
        GROUP BY DATE_TRUNC('hour', ef.created_at)
      ),
      distribution_factors AS (
        SELECT 
          hc.hour,
          CASE WHEN tc.total_from_enhanced > 0 
               THEN hc.raw_total_clicks::float / tc.total_from_enhanced 
               ELSE 0 END as total_distribution,
          CASE WHEN tc.unique_from_enhanced > 0 
               THEN hc.raw_unique_clicks::float / tc.unique_from_enhanced 
               ELSE 0 END as unique_distribution
        FROM hourly_clicks hc, total_calculated tc
      )
      SELECT 
        TO_CHAR(hs.hour, 'YYYY-MM-DD"T"HH24:MI:SS') as date,
        ROUND(COALESCE(df.total_distribution, 0) * (SELECT click_count FROM link_data))::integer as total_clicks,
        ROUND(COALESCE(df.unique_distribution, 0) * (SELECT unique_click_count FROM link_data))::integer as unique_clicks,
        hs.hour as full_datetime
      FROM hour_series hs
      LEFT JOIN distribution_factors df ON hs.hour = df.hour
      ORDER BY hs.hour
    `;
    return rows.map(row => ({
      ...row,
      full_datetime: row.full_datetime || row.date
    }));
  } catch (error) {
    console.error("Failed to fetch hourly data:", error);
    return [];
  }
}

export default async function AnalyticsPage({ 
  params 
}: { 
  params: Promise<{ shortCode: string }> 
}) {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
    redirect('/login');
  }

  const { shortCode } = await params;
  
  // Otteniamo tutti i dati iniziali in parallelo per ottimizzare le performance
  const [linkData, clickAnalytics, geographicData, deviceData, browserData, referrerData, timeSeriesData, hourlyData, monthlyData, weeklyData] = await Promise.all([
    getLinkData(session.userId, session.workspaceId, shortCode),
    getClickAnalytics(session.userId, session.workspaceId, shortCode),
    getGeographicData(session.userId, session.workspaceId, shortCode),
    getDeviceData(session.userId, session.workspaceId, shortCode),
    getBrowserData(session.userId, session.workspaceId, shortCode),
    getReferrerData(session.userId, session.workspaceId, shortCode),
    getTimeSeriesData(session.userId, session.workspaceId, shortCode),
    getHourlyData(session.userId, session.workspaceId, shortCode),
    getMonthlyData(session.userId, session.workspaceId, shortCode),
    getWeeklyData(session.userId, session.workspaceId, shortCode)
  ]);

  if (!linkData) {
    notFound();
  }

  const initialData = {
    linkData,
    clickAnalytics,
    geographicData,
    deviceData,
    browserData,
    referrerData,
    timeSeriesData,
    hourlyData: hourlyData || [],
    monthlyData: monthlyData || [],
    weeklyData: weeklyData || []
  };

  return <AnalyticsClient initialData={initialData} shortCode={shortCode} />;
}