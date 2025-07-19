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
    let dateParams: any[] = [userId, workspaceId, shortCode];
    
    if (startDate && endDate) {
      dateCondition = `AND clicked_at_rome >= $4::timestamptz AND clicked_at_rome < $5::timestamptz`;
      dateParams.push(startDate, endDate);
    }

    // Query semplificata che usa solo la tabella clicks
    const query = `
      WITH link_info AS (
        SELECT id, click_count, unique_click_count, created_at
        FROM links 
        WHERE user_id = $1 AND workspace_id = $2 AND short_code = $3
      ),
      filtered_clicks AS (
        SELECT 
          c.country,
          c.referrer,
          c.browser_name,
          c.device_type,
          c.user_fingerprint,
          c.clicked_at_rome
        FROM clicks c
        JOIN link_info li ON c.link_id = li.id
        WHERE 1=1 ${dateCondition}
      ),
      stats AS (
        SELECT 
          COUNT(*) as filtered_total_clicks,
          COUNT(DISTINCT user_fingerprint) as filtered_unique_clicks,
          COUNT(DISTINCT country) as unique_countries,
          COUNT(DISTINCT referrer) as unique_referrers,
          COUNT(DISTINCT device_type) as unique_devices,
          COUNT(DISTINCT browser_name) as unique_browsers
        FROM filtered_clicks
      ),
      period_stats AS (
        SELECT 
          COUNT(CASE WHEN clicked_at_rome::date = CURRENT_DATE THEN 1 END) as clicks_today,
          COUNT(CASE WHEN clicked_at_rome >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as clicks_this_week,
          COUNT(CASE WHEN clicked_at_rome >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as clicks_this_month,
          COUNT(DISTINCT CASE WHEN clicked_at_rome::date = CURRENT_DATE THEN user_fingerprint END) as unique_clicks_today,
          COUNT(DISTINCT CASE WHEN clicked_at_rome >= CURRENT_DATE - INTERVAL '7 days' THEN user_fingerprint END) as unique_clicks_this_week,
          COUNT(DISTINCT CASE WHEN clicked_at_rome >= CURRENT_DATE - INTERVAL '30 days' THEN user_fingerprint END) as unique_clicks_this_month
        FROM clicks c
        JOIN link_info li ON c.link_id = li.id
      ),
      top_values AS (
        SELECT 
          (SELECT referrer FROM filtered_clicks WHERE referrer != 'Direct' GROUP BY referrer ORDER BY COUNT(*) DESC LIMIT 1) as top_referrer,
          (SELECT browser_name FROM filtered_clicks GROUP BY browser_name ORDER BY COUNT(*) DESC LIMIT 1) as most_used_browser,
          (SELECT device_type FROM filtered_clicks GROUP BY device_type ORDER BY COUNT(*) DESC LIMIT 1) as most_used_device
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
    let dateParams: any[] = [userId, workspaceId, shortCode];
    
    if (startDate && endDate) {
      dateCondition = `AND clicked_at_rome >= $4::timestamptz AND clicked_at_rome < $5::timestamptz`;
      dateParams.push(startDate, endDate);
    }

    const query = `
      WITH total_clicks AS (
        SELECT COUNT(*) as total
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3 ${dateCondition}
      )
      SELECT 
        country,
        COUNT(*) as clicks,
        ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1) as percentage
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3 ${dateCondition}
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
    let dateParams: any[] = [userId, workspaceId, shortCode];
    
    if (startDate && endDate) {
      dateCondition = `AND clicked_at_rome >= $4::timestamptz AND clicked_at_rome < $5::timestamptz`;
      dateParams.push(startDate, endDate);
    }

    const query = `
      WITH total_clicks AS (
        SELECT COUNT(*) as total
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3 ${dateCondition}
      )
      SELECT 
        device_type,
        COUNT(*) as clicks,
        ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1) as percentage
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3 ${dateCondition}
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
    let dateParams: any[] = [userId, workspaceId, shortCode];
    
    if (startDate && endDate) {
      dateCondition = `AND clicked_at_rome >= $4::timestamptz AND clicked_at_rome < $5::timestamptz`;
      dateParams.push(startDate, endDate);
    }

    const query = `
      WITH total_clicks AS (
        SELECT COUNT(*) as total
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3 ${dateCondition}
      )
      SELECT 
        browser_name,
        COUNT(*) as clicks,
        ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1) as percentage
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3 ${dateCondition}
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
    let dateParams: any[] = [userId, workspaceId, shortCode];
    
    if (startDate && endDate) {
      dateCondition = `AND clicked_at_rome >= $4::timestamptz AND clicked_at_rome < $5::timestamptz`;
      dateParams.push(startDate, endDate);
    }

    const query = `
      WITH total_clicks AS (
        SELECT COUNT(*) as total
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3 ${dateCondition}
      )
      SELECT 
        referrer,
        COUNT(*) as clicks,
        ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1) as percentage
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      WHERE l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3 ${dateCondition}
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
            DATE_TRUNC('hour', NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '23 hours'),
            DATE_TRUNC('hour', NOW() AT TIME ZONE 'Europe/Rome'),
            INTERVAL '1 hour'
          ) AS hour
        )
        SELECT 
          TO_CHAR(hs.hour, 'HH24:MI') as date,
          hs.hour as full_datetime,
          COALESCE(COUNT(c.id), 0) as total_clicks,
          COALESCE(COUNT(DISTINCT c.user_fingerprint), 0) as unique_clicks
        FROM hour_series hs
        LEFT JOIN clicks c ON DATE_TRUNC('hour', c.clicked_at_rome) = hs.hour
        LEFT JOIN links l ON c.link_id = l.id AND l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3
        GROUP BY hs.hour
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

    if (!startDate || !endDate) {
      // Se non ci sono filtri di data, mostra gli ultimi 30 giorni
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      startDateForSeries = thirtyDaysAgo.toISOString().split('T')[0];
      endDateForSeries = new Date().toISOString().split('T')[0];
    }

    const query = `
      WITH date_series AS (
        SELECT generate_series(
          $4::date,
          $5::date,
          INTERVAL '1 day'
        )::date AS date
      )
      SELECT 
        ds.date::text as date,
        COALESCE(COUNT(c.id), 0) as total_clicks,
        COALESCE(COUNT(DISTINCT c.user_fingerprint), 0) as unique_clicks
      FROM date_series ds
      LEFT JOIN clicks c ON c.clicked_at_rome::date = ds.date
      LEFT JOIN links l ON c.link_id = l.id AND l.user_id = $1 AND l.workspace_id = $2 AND l.short_code = $3
      GROUP BY ds.date
      ORDER BY ds.date
    `;

    const { rows } = await sql.query(query, [userId, workspaceId, shortCode, startDateForSeries, endDateForSeries]);
    
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

    // Ottieni tutti i dati in parallelo
    const [
      linkData,
      clickAnalytics,
      geographicData,
      deviceData,
      browserData,
      referrerData,
      timeSeriesData
    ] = await Promise.all([
      getLinkData(session.userId, session.workspaceId, shortCode),
      getFilteredClickAnalytics(session.userId, session.workspaceId, shortCode, startDate, endDate),
      getFilteredGeographicData(session.userId, session.workspaceId, shortCode, startDate, endDate),
      getFilteredDeviceData(session.userId, session.workspaceId, shortCode, startDate, endDate),
      getFilteredBrowserData(session.userId, session.workspaceId, shortCode, startDate, endDate),
      getFilteredReferrerData(session.userId, session.workspaceId, shortCode, startDate, endDate),
      getFilteredTimeSeriesData(session.userId, session.workspaceId, shortCode, startDate, endDate, filterType)
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
      timeSeriesData
    });

  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
