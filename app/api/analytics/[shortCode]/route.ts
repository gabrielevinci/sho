import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Tipi TypeScript semplificati
type LinkAnalytics = {
  short_code: string;
  original_url: string;
  title: string | null;
  description: string | null;
  click_count: number;
  unique_click_count: number;
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
  avg_clicks_per_day: number;
  avg_unique_clicks_per_day: number;
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
  full_datetime?: string | Date;
};

// Funzione per ottenere i dati base del link
async function getLinkData(userId: string, workspaceId: string, shortCode: string): Promise<LinkAnalytics | null> {
  try {
    const { rows } = await sql<LinkAnalytics>`
      SELECT short_code, original_url, title, description, click_count, unique_click_count, created_at
      FROM links
      WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
      LIMIT 1
    `;
    return rows[0] || null;
  } catch (error) {
    console.error("Error fetching link data:", error);
    return null;
  }
}

// Funzione per calcolare le statistiche dei click con filtri temporali
async function getFilteredClickAnalytics(
  userId: string, 
  workspaceId: string, 
  shortCode: string, 
  startDate?: string, 
  endDate?: string
): Promise<ClickAnalytics> {
  try {
    // Prima otteniamo i dati base del link
    const linkData = await getLinkData(userId, workspaceId, shortCode);
    if (!linkData) {
      throw new Error('Link not found');
    }

    // Costruiamo le condizioni per il filtro temporale
    let dateCondition = '';
    const dateParams: (string | number)[] = [userId, workspaceId, shortCode];
    
    if (startDate && endDate) {
      dateCondition = `AND c.clicked_at_rome >= $4::timestamptz AND c.clicked_at_rome < $5::timestamptz`;
      dateParams.push(startDate, endDate);
    }

    // Query che utilizza tutte e tre le tabelle per calcoli accurati
    const query = `
      WITH link_info AS (
        SELECT id, click_count, unique_click_count, created_at
        FROM links 
        WHERE user_id = $1 AND workspace_id = $2 AND short_code = $3
      ),
      -- Ottieni tutti i click con enhanced fingerprints
      filtered_clicks AS (
        SELECT DISTINCT
          c.id as click_id,
          c.country,
          c.referrer,
          c.browser_name,
          c.device_type,
          c.user_fingerprint,
          c.clicked_at_rome,
          COALESCE(ef.fingerprint_hash, c.user_fingerprint) as enhanced_fingerprint,
          COALESCE(fc.device_cluster_id, c.user_fingerprint) as device_cluster
        FROM clicks c
        JOIN link_info li ON c.link_id = li.id
        LEFT JOIN enhanced_fingerprints ef ON c.link_id = ef.link_id 
          AND (c.user_fingerprint = ef.fingerprint_hash OR c.user_fingerprint = ef.device_fingerprint)
        LEFT JOIN fingerprint_correlations fc ON ef.fingerprint_hash = fc.fingerprint_hash
        WHERE 1=1 ${dateCondition}
      ),
      stats AS (
        SELECT 
          COUNT(*) as filtered_total_clicks,
          COUNT(DISTINCT device_cluster) as filtered_unique_clicks,
          COUNT(DISTINCT country) as unique_countries,
          COUNT(DISTINCT referrer) as unique_referrers,
          COUNT(DISTINCT device_type) as unique_devices,
          COUNT(DISTINCT browser_name) as unique_browsers
        FROM filtered_clicks
      ),
      -- Statistiche per periodi fissi (ultime 24 ore, settimana, mese)
      period_stats AS (
        SELECT 
          COUNT(CASE WHEN c.clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '1 day' THEN 1 END) as clicks_today,
          COUNT(CASE WHEN c.clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '7 days' THEN 1 END) as clicks_this_week,
          COUNT(CASE WHEN c.clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '30 days' THEN 1 END) as clicks_this_month,
          COUNT(DISTINCT CASE 
            WHEN c.clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '1 day' 
            THEN COALESCE(fc.device_cluster_id, c.user_fingerprint) 
          END) as unique_clicks_today,
          COUNT(DISTINCT CASE 
            WHEN c.clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '7 days' 
            THEN COALESCE(fc.device_cluster_id, c.user_fingerprint) 
          END) as unique_clicks_this_week,
          COUNT(DISTINCT CASE 
            WHEN c.clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '30 days' 
            THEN COALESCE(fc.device_cluster_id, c.user_fingerprint) 
          END) as unique_clicks_this_month
        FROM clicks c
        JOIN link_info li ON c.link_id = li.id
        LEFT JOIN enhanced_fingerprints ef ON c.link_id = ef.link_id 
          AND (c.user_fingerprint = ef.fingerprint_hash OR c.user_fingerprint = ef.device_fingerprint)
        LEFT JOIN fingerprint_correlations fc ON ef.fingerprint_hash = fc.fingerprint_hash
      ),
      top_values AS (
        SELECT 
          (SELECT referrer FROM filtered_clicks WHERE referrer != 'Direct' AND referrer IS NOT NULL GROUP BY referrer ORDER BY COUNT(*) DESC LIMIT 1) as top_referrer,
          (SELECT browser_name FROM filtered_clicks WHERE browser_name IS NOT NULL GROUP BY browser_name ORDER BY COUNT(*) DESC LIMIT 1) as most_used_browser,
          (SELECT device_type FROM filtered_clicks WHERE device_type IS NOT NULL GROUP BY device_type ORDER BY COUNT(*) DESC LIMIT 1) as most_used_device
      )
      SELECT 
        CASE WHEN ${startDate ? 'TRUE' : 'FALSE'} THEN s.filtered_total_clicks ELSE li.click_count END as total_clicks,
        CASE WHEN ${startDate ? 'TRUE' : 'FALSE'} THEN s.filtered_unique_clicks ELSE li.unique_click_count END as unique_clicks,
        s.unique_countries,
        s.unique_referrers,
        s.unique_devices,
        s.unique_browsers,
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
      FROM link_info li, stats s, period_stats ps, top_values tv
    `;

    const { rows } = await sql.query(query, dateParams);
    const result = rows[0];

    if (!result) {
      throw new Error('No analytics data found');
    }

    // Debug per filtro 24 ore
    if (startDate && endDate) {
      console.log('🔍 [DEBUG ANALYTICS] Query filtrata eseguita');
      console.log('🔍 [DEBUG ANALYTICS] Total clicks filtrati:', result.total_clicks);
      console.log('🔍 [DEBUG ANALYTICS] Unique clicks filtrati:', result.unique_clicks);
      console.log('🔍 [DEBUG ANALYTICS] Clicks today (fisso):', result.clicks_today);
      console.log('🔍 [DEBUG ANALYTICS] Unique clicks today (fisso):', result.unique_clicks_today);
    }

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
      avg_clicks_per_day: Math.round((parseInt(result.total_clicks) / daysSinceCreation) * 100) / 100,
      avg_unique_clicks_per_day: Math.round((parseInt(result.unique_clicks) / daysSinceCreation) * 100) / 100
    };

  } catch (error) {
    console.error("Error fetching click analytics:", error);
    throw error;
  }
}

// Funzione per i dati geografici
async function getFilteredGeographicData(
  userId: string, 
  workspaceId: string, 
  shortCode: string,
  startDate?: string,
  endDate?: string
): Promise<GeographicData[]> {
  try {
    let dateCondition = '';
    const dateParams: (string | number)[] = [userId, workspaceId, shortCode];
    
    if (startDate && endDate) {
      dateCondition = `AND c.clicked_at_rome >= $4::timestamptz AND c.clicked_at_rome < $5::timestamptz`;
      dateParams.push(startDate, endDate);
    }

    const query = `
      WITH enhanced_clicks AS (
        SELECT DISTINCT
          c.country,
          COALESCE(fc.device_cluster_id, c.user_fingerprint) as unique_device
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        LEFT JOIN enhanced_fingerprints ef ON c.link_id = ef.link_id 
          AND (c.user_fingerprint = ef.fingerprint_hash OR c.user_fingerprint = ef.device_fingerprint)
        LEFT JOIN fingerprint_correlations fc ON ef.fingerprint_hash = fc.fingerprint_hash
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3 ${dateCondition}
      ),
      total_clicks AS (
        SELECT COUNT(*) as total FROM enhanced_clicks
      )
      SELECT 
        country,
        COUNT(*) as clicks,
        ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1) as percentage
      FROM enhanced_clicks
      WHERE country IS NOT NULL
      GROUP BY country
      ORDER BY clicks DESC
      LIMIT 10
    `;

    const { rows } = await sql.query(query, dateParams);
    return rows.map(row => ({
      country: row.country,
      clicks: parseInt(row.clicks),
      percentage: parseFloat(row.percentage) || 0
    }));
  } catch (error) {
    console.error("Error fetching geographic data:", error);
    return [];
  }
}

// Funzione per i dati dei dispositivi
async function getFilteredDeviceData(
  userId: string,
  workspaceId: string,
  shortCode: string,
  startDate?: string,
  endDate?: string
): Promise<DeviceData[]> {
  try {
    let dateCondition = '';
    const dateParams: (string | number)[] = [userId, workspaceId, shortCode];
    
    if (startDate && endDate) {
      dateCondition = `AND c.clicked_at_rome >= $4::timestamptz AND c.clicked_at_rome < $5::timestamptz`;
      dateParams.push(startDate, endDate);
    }

    const query = `
      WITH enhanced_clicks AS (
        SELECT DISTINCT
          c.device_type,
          COALESCE(fc.device_cluster_id, c.user_fingerprint) as unique_device
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        LEFT JOIN enhanced_fingerprints ef ON c.link_id = ef.link_id 
          AND (c.user_fingerprint = ef.fingerprint_hash OR c.user_fingerprint = ef.device_fingerprint)
        LEFT JOIN fingerprint_correlations fc ON ef.fingerprint_hash = fc.fingerprint_hash
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3 ${dateCondition}
      ),
      total_clicks AS (
        SELECT COUNT(*) as total FROM enhanced_clicks
      )
      SELECT 
        device_type,
        COUNT(*) as clicks,
        ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1) as percentage
      FROM enhanced_clicks
      WHERE device_type IS NOT NULL
      GROUP BY device_type
      ORDER BY clicks DESC
    `;

    const { rows } = await sql.query(query, dateParams);
    return rows.map(row => ({
      device_type: row.device_type,
      clicks: parseInt(row.clicks),
      percentage: parseFloat(row.percentage) || 0
    }));
  } catch (error) {
    console.error("Error fetching device data:", error);
    return [];
  }
}

// Funzione per i dati dei browser
async function getFilteredBrowserData(
  userId: string,
  workspaceId: string,
  shortCode: string,
  startDate?: string,
  endDate?: string
): Promise<BrowserData[]> {
  try {
    let dateCondition = '';
    const dateParams: (string | number)[] = [userId, workspaceId, shortCode];
    
    if (startDate && endDate) {
      dateCondition = `AND c.clicked_at_rome >= $4::timestamptz AND c.clicked_at_rome < $5::timestamptz`;
      dateParams.push(startDate, endDate);
    }

    const query = `
      WITH enhanced_clicks AS (
        SELECT DISTINCT
          c.browser_name,
          COALESCE(fc.device_cluster_id, c.user_fingerprint) as unique_device
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        LEFT JOIN enhanced_fingerprints ef ON c.link_id = ef.link_id 
          AND (c.user_fingerprint = ef.fingerprint_hash OR c.user_fingerprint = ef.device_fingerprint)
        LEFT JOIN fingerprint_correlations fc ON ef.fingerprint_hash = fc.fingerprint_hash
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3 ${dateCondition}
      ),
      total_clicks AS (
        SELECT COUNT(*) as total FROM enhanced_clicks
      )
      SELECT 
        browser_name,
        COUNT(*) as clicks,
        ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1) as percentage
      FROM enhanced_clicks
      WHERE browser_name IS NOT NULL
      GROUP BY browser_name
      ORDER BY clicks DESC
      LIMIT 10
    `;

    const { rows } = await sql.query(query, dateParams);
    return rows.map(row => ({
      browser_name: row.browser_name,
      clicks: parseInt(row.clicks),
      percentage: parseFloat(row.percentage) || 0
    }));
  } catch (error) {
    console.error("Error fetching browser data:", error);
    return [];
  }
}

// Funzione per i dati dei referrer
async function getFilteredReferrerData(
  userId: string,
  workspaceId: string,
  shortCode: string,
  startDate?: string,
  endDate?: string
): Promise<ReferrerData[]> {
  try {
    let dateCondition = '';
    const dateParams: (string | number)[] = [userId, workspaceId, shortCode];
    
    if (startDate && endDate) {
      dateCondition = `AND c.clicked_at_rome >= $4::timestamptz AND c.clicked_at_rome < $5::timestamptz`;
      dateParams.push(startDate, endDate);
    }

    const query = `
      WITH enhanced_clicks AS (
        SELECT DISTINCT
          c.referrer,
          COALESCE(fc.device_cluster_id, c.user_fingerprint) as unique_device
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        LEFT JOIN enhanced_fingerprints ef ON c.link_id = ef.link_id 
          AND (c.user_fingerprint = ef.fingerprint_hash OR c.user_fingerprint = ef.device_fingerprint)
        LEFT JOIN fingerprint_correlations fc ON ef.fingerprint_hash = fc.fingerprint_hash
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3 ${dateCondition}
      ),
      total_clicks AS (
        SELECT COUNT(*) as total FROM enhanced_clicks
      )
      SELECT 
        referrer,
        COUNT(*) as clicks,
        ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1) as percentage
      FROM enhanced_clicks
      WHERE referrer IS NOT NULL
      GROUP BY referrer
      ORDER BY clicks DESC
      LIMIT 10
    `;

    const { rows } = await sql.query(query, dateParams);
    return rows.map(row => ({
      referrer: row.referrer,
      clicks: parseInt(row.clicks),
      percentage: parseFloat(row.percentage) || 0
    }));
  } catch (error) {
    console.error("Error fetching referrer data:", error);
    return [];
  }
}

// Funzione per i dati delle serie temporali
async function getFilteredTimeSeriesData(
  userId: string,
  workspaceId: string,
  shortCode: string,
  startDate?: string,
  endDate?: string,
  filterType?: string
): Promise<TimeSeriesData[]> {
  try {
    // Se è il filtro "today", usiamo dati orari
    if (filterType === 'today') {
      const query = `
        WITH hour_series AS (
          SELECT generate_series(
            DATE_TRUNC('hour', (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '23 hours'),
            DATE_TRUNC('hour', NOW() AT TIME ZONE 'Europe/Rome'),
            INTERVAL '1 hour'
          ) AS hour
        ),
        -- Conteggio dei click totali orari
        hourly_total_clicks AS (
          SELECT 
            DATE_TRUNC('hour', c.clicked_at_rome) as hour,
            COUNT(*) as total_clicks
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3
            AND c.clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '24 hours'
          GROUP BY DATE_TRUNC('hour', c.clicked_at_rome)
        ),
        -- Conteggio dei click unici orari
        hourly_unique_clicks AS (
          SELECT 
            DATE_TRUNC('hour', c.clicked_at_rome) as hour,
            COUNT(DISTINCT COALESCE(fc.device_cluster_id, ef.fingerprint_hash, c.user_fingerprint)) as unique_clicks
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          LEFT JOIN enhanced_fingerprints ef ON c.link_id = ef.link_id 
            AND (c.user_fingerprint = ef.fingerprint_hash OR c.user_fingerprint = ef.device_fingerprint)
          LEFT JOIN fingerprint_correlations fc ON ef.fingerprint_hash = fc.fingerprint_hash
          WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3
            AND c.clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '24 hours'
          GROUP BY DATE_TRUNC('hour', c.clicked_at_rome)
        )
        SELECT 
          TO_CHAR(hs.hour, 'HH24:MI') as date,
          hs.hour as full_datetime,
          COALESCE(htc.total_clicks, 0) as total_clicks,
          COALESCE(huc.unique_clicks, 0) as unique_clicks
        FROM hour_series hs
        LEFT JOIN hourly_total_clicks htc ON htc.hour = hs.hour
        LEFT JOIN hourly_unique_clicks huc ON huc.hour = hs.hour
        GROUP BY hs.hour, htc.total_clicks, huc.unique_clicks
        ORDER BY hs.hour
      `;
      
      const { rows } = await sql.query(query, [userId, workspaceId, shortCode]);
      return rows.map(row => ({
        date: row.date,
        total_clicks: parseInt(row.total_clicks) || 0,
        unique_clicks: parseInt(row.unique_clicks) || 0,
        full_datetime: row.full_datetime
      }));
    }

    // Per altri filtri, usiamo dati giornalieri
    let startDateForSeries = startDate;
    let endDateForSeries = endDate;

    // Se non ci sono filtri di data specifici, determina il range basandoti sulla data di creazione del link
    if (!startDate || !endDate) {
      // Prima ottieni la data di creazione del link
      const linkCreationQuery = await sql`
        SELECT created_at
        FROM links
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
        LIMIT 1
      `;
      
      if (linkCreationQuery.rows.length === 0) {
        throw new Error('Link not found');
      }
      
      const linkCreatedAt = new Date(linkCreationQuery.rows[0].created_at);
      const today = new Date();
      
      // Per il filtro "always", usa dalla data di creazione fino ad oggi
      startDateForSeries = linkCreatedAt.toISOString().split('T')[0];
      endDateForSeries = today.toISOString().split('T')[0];
      
      console.log(`Time series range for "always": ${startDateForSeries} to ${endDateForSeries}`);
    }

    const query = `
      WITH date_series AS (
        SELECT generate_series(
          $4::date,
          $5::date,
          INTERVAL '1 day'
        )::date AS date
      ),
      -- Conteggio dei click totali giornalieri (tutti i click, senza distinzione)
      daily_total_clicks AS (
        SELECT 
          c.clicked_at_rome::date as click_date,
          COUNT(*) as total_clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3
          AND c.clicked_at_rome::date >= $4::date
          AND c.clicked_at_rome::date <= $5::date
        GROUP BY c.clicked_at_rome::date
      ),
      -- Conteggio dei click unici giornalieri usando enhanced fingerprints e correlazioni
      daily_unique_clicks AS (
        SELECT 
          c.clicked_at_rome::date as click_date,
          COUNT(DISTINCT COALESCE(fc.device_cluster_id, ef.fingerprint_hash, c.user_fingerprint)) as unique_clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        LEFT JOIN enhanced_fingerprints ef ON c.link_id = ef.link_id 
          AND (c.user_fingerprint = ef.fingerprint_hash OR c.user_fingerprint = ef.device_fingerprint)
        LEFT JOIN fingerprint_correlations fc ON ef.fingerprint_hash = fc.fingerprint_hash
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3
          AND c.clicked_at_rome::date >= $4::date
          AND c.clicked_at_rome::date <= $5::date
        GROUP BY c.clicked_at_rome::date
      )
      SELECT 
        ds.date::text as date,
        COALESCE(dtc.total_clicks, 0) as total_clicks,
        COALESCE(duc.unique_clicks, 0) as unique_clicks
      FROM date_series ds
      LEFT JOIN daily_total_clicks dtc ON dtc.click_date = ds.date
      LEFT JOIN daily_unique_clicks duc ON duc.click_date = ds.date
      GROUP BY ds.date, dtc.total_clicks, duc.unique_clicks
      ORDER BY ds.date
    `;

    const { rows } = await sql.query(query, [userId, workspaceId, shortCode, startDateForSeries, endDateForSeries]);
    
    console.log(`Time series query executed for ${shortCode}:`);
    console.log(`- Date range: ${startDateForSeries} to ${endDateForSeries}`);
    console.log(`- Filter type: ${filterType}`);
    console.log(`- Results: ${rows.length} data points`);
    
    if (rows.length > 0) {
      const totalSum = rows.reduce((sum, row) => sum + parseInt(row.total_clicks || 0), 0);
      const uniqueSum = rows.reduce((sum, row) => sum + parseInt(row.unique_clicks || 0), 0);
      console.log(`- Total clicks sum: ${totalSum}`);
      console.log(`- Unique clicks sum: ${uniqueSum}`);
      
      // Log anomalie
      const anomalies = rows.filter(row => parseInt(row.unique_clicks || 0) > parseInt(row.total_clicks || 0));
      if (anomalies.length > 0) {
        console.warn(`⚠️  ${anomalies.length} anomalies detected in time series data`);
        anomalies.forEach(row => {
          console.warn(`  ${row.date}: unique=${row.unique_clicks}, total=${row.total_clicks}`);
        });
      }
    }
    
    return rows.map(row => ({
      date: row.date,
      total_clicks: parseInt(row.total_clicks) || 0,
      unique_clicks: parseInt(row.unique_clicks) || 0
    }));
  } catch (error) {
    console.error("Error fetching time series data:", error);
    return [];
  }
}

// Funzione per ottenere i dati mensili aggregati
async function getMonthlyData(
  userId: string,
  workspaceId: string,
  shortCode: string,
  startDate?: string,
  endDate?: string
): Promise<{ month: string; month_number: number; year: number; total_clicks: number; unique_clicks: number }[]> {
  try {
    // Se non ci sono filtri di data, usa l'ultimo anno
    let dateCondition = '';
    const dateParams: (string | number)[] = [userId, workspaceId, shortCode];
    
    if (startDate && endDate) {
      dateCondition = `AND c.clicked_at_rome::date >= $4::date AND c.clicked_at_rome::date <= $5::date`;
      dateParams.push(startDate, endDate);
    } else {
      // Default: ultimi 12 mesi
      dateCondition = `AND c.clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '12 months'`;
    }

    const query = `
      WITH monthly_total_clicks AS (
        SELECT 
          EXTRACT(MONTH FROM c.clicked_at_rome AT TIME ZONE 'Europe/Rome') as month_number,
          EXTRACT(YEAR FROM c.clicked_at_rome AT TIME ZONE 'Europe/Rome') as year,
          COUNT(*) as total_clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3 ${dateCondition}
        GROUP BY EXTRACT(MONTH FROM c.clicked_at_rome AT TIME ZONE 'Europe/Rome'), EXTRACT(YEAR FROM c.clicked_at_rome AT TIME ZONE 'Europe/Rome')
      ),
      monthly_unique_clicks AS (
        SELECT 
          EXTRACT(MONTH FROM c.clicked_at_rome AT TIME ZONE 'Europe/Rome') as month_number,
          EXTRACT(YEAR FROM c.clicked_at_rome AT TIME ZONE 'Europe/Rome') as year,
          COUNT(DISTINCT COALESCE(fc.device_cluster_id, ef.fingerprint_hash, c.user_fingerprint)) as unique_clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        LEFT JOIN enhanced_fingerprints ef ON c.link_id = ef.link_id 
          AND (c.user_fingerprint = ef.fingerprint_hash OR c.user_fingerprint = ef.device_fingerprint)
        LEFT JOIN fingerprint_correlations fc ON ef.fingerprint_hash = fc.fingerprint_hash
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3 ${dateCondition}
        GROUP BY EXTRACT(MONTH FROM c.clicked_at_rome AT TIME ZONE 'Europe/Rome'), EXTRACT(YEAR FROM c.clicked_at_rome AT TIME ZONE 'Europe/Rome')
      )
      SELECT 
        CASE mtc.month_number
          WHEN 1 THEN 'Gennaio'
          WHEN 2 THEN 'Febbraio'
          WHEN 3 THEN 'Marzo'
          WHEN 4 THEN 'Aprile'
          WHEN 5 THEN 'Maggio'
          WHEN 6 THEN 'Giugno'
          WHEN 7 THEN 'Luglio'
          WHEN 8 THEN 'Agosto'
          WHEN 9 THEN 'Settembre'
          WHEN 10 THEN 'Ottobre'
          WHEN 11 THEN 'Novembre'
          WHEN 12 THEN 'Dicembre'
        END as month,
        mtc.month_number::integer,
        mtc.year::integer,
        COALESCE(mtc.total_clicks, 0) as total_clicks,
        COALESCE(muc.unique_clicks, 0) as unique_clicks
      FROM monthly_total_clicks mtc
      LEFT JOIN monthly_unique_clicks muc ON mtc.month_number = muc.month_number AND mtc.year = muc.year
      ORDER BY mtc.year, mtc.month_number
    `;

    const { rows } = await sql.query(query, dateParams);
    
    return rows.map(row => ({
      month: row.month,
      month_number: parseInt(row.month_number) || 0,
      year: parseInt(row.year) || 0,
      total_clicks: parseInt(row.total_clicks) || 0,
      unique_clicks: parseInt(row.unique_clicks) || 0
    }));
  } catch (error) {
    console.error("Error fetching monthly data:", error);
    return [];
  }
}

// Funzione per ottenere i dati settimanali aggregati
async function getWeeklyData(
  userId: string,
  workspaceId: string,
  shortCode: string,
  startDate?: string,
  endDate?: string
): Promise<{ week: number; year: number; week_start: string; week_end: string; total_clicks: number; unique_clicks: number }[]> {
  try {
    // Se non ci sono filtri di data, usa le ultime 12 settimane
    let dateCondition = '';
    const dateParams: (string | number)[] = [userId, workspaceId, shortCode];
    
    if (startDate && endDate) {
      dateCondition = `AND c.clicked_at_rome::date >= $4::date AND c.clicked_at_rome::date <= $5::date`;
      dateParams.push(startDate, endDate);
    } else {
      // Default: ultime 12 settimane
      dateCondition = `AND c.clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '12 weeks'`;
    }

    const query = `
      WITH weekly_total_clicks AS (
        SELECT 
          EXTRACT(WEEK FROM c.clicked_at_rome AT TIME ZONE 'Europe/Rome') as week,
          EXTRACT(YEAR FROM c.clicked_at_rome AT TIME ZONE 'Europe/Rome') as year,
          DATE_TRUNC('week', c.clicked_at_rome AT TIME ZONE 'Europe/Rome')::date as week_start,
          (DATE_TRUNC('week', c.clicked_at_rome AT TIME ZONE 'Europe/Rome') + INTERVAL '6 days')::date as week_end,
          COUNT(*) as total_clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3 ${dateCondition}
        GROUP BY EXTRACT(WEEK FROM c.clicked_at_rome AT TIME ZONE 'Europe/Rome'), 
                 EXTRACT(YEAR FROM c.clicked_at_rome AT TIME ZONE 'Europe/Rome'),
                 DATE_TRUNC('week', c.clicked_at_rome AT TIME ZONE 'Europe/Rome')
      ),
      weekly_unique_clicks AS (
        SELECT 
          EXTRACT(WEEK FROM c.clicked_at_rome AT TIME ZONE 'Europe/Rome') as week,
          EXTRACT(YEAR FROM c.clicked_at_rome AT TIME ZONE 'Europe/Rome') as year,
          COUNT(DISTINCT COALESCE(fc.device_cluster_id, ef.fingerprint_hash, c.user_fingerprint)) as unique_clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        LEFT JOIN enhanced_fingerprints ef ON c.link_id = ef.link_id 
          AND (c.user_fingerprint = ef.fingerprint_hash OR c.user_fingerprint = ef.device_fingerprint)
        LEFT JOIN fingerprint_correlations fc ON ef.fingerprint_hash = fc.fingerprint_hash
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3 ${dateCondition}
        GROUP BY EXTRACT(WEEK FROM c.clicked_at_rome AT TIME ZONE 'Europe/Rome'), 
                 EXTRACT(YEAR FROM c.clicked_at_rome AT TIME ZONE 'Europe/Rome')
      )
      SELECT 
        wtc.week::integer,
        wtc.year::integer,
        wtc.week_start::text,
        wtc.week_end::text,
        COALESCE(wtc.total_clicks, 0) as total_clicks,
        COALESCE(wuc.unique_clicks, 0) as unique_clicks
      FROM weekly_total_clicks wtc
      LEFT JOIN weekly_unique_clicks wuc ON wtc.week = wuc.week AND wtc.year = wuc.year
      ORDER BY wtc.year, wtc.week
    `;

    const { rows } = await sql.query(query, dateParams);
    
    return rows.map(row => ({
      week: parseInt(row.week) || 0,
      year: parseInt(row.year) || 0,
      week_start: row.week_start,
      week_end: row.week_end,
      total_clicks: parseInt(row.total_clicks) || 0,
      unique_clicks: parseInt(row.unique_clicks) || 0
    }));
  } catch (error) {
    console.error("Error fetching weekly data:", error);
    return [];
  }
}

// Handler GET principale
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shortCode } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const filterType = searchParams.get('filterType') || undefined;

    console.log('Analytics API called with:', { shortCode, startDate, endDate, filterType });
    
    // Debug specifico per filtro 24 ore
    if (filterType === 'today') {
      console.log('🔍 [DEBUG 24H] Filtro 24 ore rilevato');
      console.log('🔍 [DEBUG 24H] Start date:', startDate);
      console.log('🔍 [DEBUG 24H] End date:', endDate);
      console.log('🔍 [DEBUG 24H] Ora italiana corrente:', new Date().toLocaleString("it-IT", {timeZone: "Europe/Rome"}));
    }

    // Ottieni tutti i dati in parallelo
    const [
      linkData,
      clickAnalytics,
      geographicData,
      deviceData,
      browserData,
      referrerData,
      timeSeriesData,
      monthlyData,
      weeklyData
    ] = await Promise.all([
      getLinkData(session.userId, session.workspaceId, shortCode),
      getFilteredClickAnalytics(session.userId, session.workspaceId, shortCode, startDate, endDate),
      getFilteredGeographicData(session.userId, session.workspaceId, shortCode, startDate, endDate),
      getFilteredDeviceData(session.userId, session.workspaceId, shortCode, startDate, endDate),
      getFilteredBrowserData(session.userId, session.workspaceId, shortCode, startDate, endDate),
      getFilteredReferrerData(session.userId, session.workspaceId, shortCode, startDate, endDate),
      getFilteredTimeSeriesData(session.userId, session.workspaceId, shortCode, startDate, endDate, filterType),
      getMonthlyData(session.userId, session.workspaceId, shortCode, startDate, endDate),
      getWeeklyData(session.userId, session.workspaceId, shortCode, startDate, endDate)
    ]);

    if (!linkData) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    return NextResponse.json({
      linkData,
      clickAnalytics,
      geographicData,
      deviceData,
      browserData,
      referrerData,
      timeSeriesData,
      monthlyData,
      weeklyData
    });

  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
