import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

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
  unique_clicks: number;        // Nuovo: click univoci reali basati su user_fingerprint
  unique_countries: number;
  unique_referrers: number;
  unique_devices: number;
  top_referrer: string | null;
  most_used_browser: string | null;
  most_used_device: string | null;
  clicks_today: number;
  clicks_this_week: number;
  clicks_this_month: number;
};

type GeographicData = {
  country: string;
  clicks: number;
};

type DeviceData = {
  device_type: string;
  clicks: number;
};

type BrowserData = {
  browser_name: string;
  clicks: number;
};

type ReferrerData = {
  referrer: string;
  clicks: number;
};

type TimeSeriesData = {
  date: string;
  total_clicks: number;
  unique_clicks: number;
};

// Funzioni per ottenere i dati filtrati
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

async function getFilteredClickAnalytics(userId: string, workspaceId: string, shortCode: string, startDate?: string, endDate?: string): Promise<ClickAnalytics> {
  try {
    let query;
    if (startDate && endDate) {
      // Per i filtri, usa il range di date specificato
      query = sql<ClickAnalytics>`
        WITH link_data AS (
          SELECT id FROM links 
          WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
        ),
        filtered_clicks AS (
          SELECT * FROM clicks c
          JOIN link_data ld ON c.link_id = ld.id
          WHERE clicked_at >= ${startDate}::timestamp AND clicked_at <= ${endDate}::timestamp
        ),
        click_stats AS (
          SELECT 
            COUNT(*) as total_clicks,
            COUNT(DISTINCT user_fingerprint) as unique_clicks,
            COUNT(DISTINCT country) as unique_countries,
            COUNT(DISTINCT referrer) as unique_referrers,
            COUNT(DISTINCT device_type) as unique_devices,
            COUNT(*) as clicks_today,
            COUNT(*) as clicks_this_week,
            COUNT(*) as clicks_this_month
          FROM filtered_clicks
        ),
        top_stats AS (
          SELECT 
            (SELECT referrer FROM filtered_clicks 
             WHERE referrer != 'Direct' 
             GROUP BY referrer ORDER BY COUNT(*) DESC LIMIT 1) as top_referrer,
            (SELECT browser_name FROM filtered_clicks 
             GROUP BY browser_name ORDER BY COUNT(*) DESC LIMIT 1) as most_used_browser,
            (SELECT device_type FROM filtered_clicks 
             GROUP BY device_type ORDER BY COUNT(*) DESC LIMIT 1) as most_used_device
        )
        SELECT 
          cs.total_clicks,
          cs.unique_clicks,
          cs.unique_countries,
          cs.unique_referrers,
          cs.unique_devices,
          ts.top_referrer,
          ts.most_used_browser,
          ts.most_used_device,
          cs.clicks_today,
          cs.clicks_this_week,
          cs.clicks_this_month
        FROM click_stats cs, top_stats ts
      `;
    } else {
      query = sql<ClickAnalytics>`
        WITH link_data AS (
          SELECT id FROM links 
          WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
        ),
        click_stats AS (
          SELECT 
            COUNT(*) as total_clicks,
            COUNT(DISTINCT user_fingerprint) as unique_clicks,
            COUNT(DISTINCT country) as unique_countries,
            COUNT(DISTINCT referrer) as unique_referrers,
            COUNT(DISTINCT device_type) as unique_devices,
            COUNT(CASE WHEN clicked_at::date = CURRENT_DATE THEN 1 END) as clicks_today,
            COUNT(CASE WHEN clicked_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as clicks_this_week,
            COUNT(CASE WHEN clicked_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as clicks_this_month
          FROM clicks c
          JOIN link_data ld ON c.link_id = ld.id
        ),
        top_stats AS (
          SELECT 
            (SELECT referrer FROM clicks c JOIN link_data ld ON c.link_id = ld.id 
             WHERE referrer != 'Direct' GROUP BY referrer ORDER BY COUNT(*) DESC LIMIT 1) as top_referrer,
            (SELECT browser_name FROM clicks c JOIN link_data ld ON c.link_id = ld.id 
             GROUP BY browser_name ORDER BY COUNT(*) DESC LIMIT 1) as most_used_browser,
            (SELECT device_type FROM clicks c JOIN link_data ld ON c.link_id = ld.id 
             GROUP BY device_type ORDER BY COUNT(*) DESC LIMIT 1) as most_used_device
        )
        SELECT 
          cs.total_clicks,
          cs.unique_clicks,
          cs.unique_countries,
          cs.unique_referrers,
          cs.unique_devices,
          ts.top_referrer,
          ts.most_used_browser,
          ts.most_used_device,
          cs.clicks_today,
          cs.clicks_this_week,
          cs.clicks_this_month
        FROM click_stats cs, top_stats ts
      `;
    }

    const { rows } = await query;
    return rows[0] || {
      total_clicks: 0,
      unique_clicks: 0,
      unique_countries: 0,
      unique_referrers: 0,
      unique_devices: 0,
      top_referrer: null,
      most_used_browser: null,
      most_used_device: null,
      clicks_today: 0,
      clicks_this_week: 0,
      clicks_this_month: 0
    };
  } catch (error) {
    console.error("Failed to fetch filtered click analytics:", error);
    return {
      total_clicks: 0,
      unique_clicks: 0,
      unique_countries: 0,
      unique_referrers: 0,
      unique_devices: 0,
      top_referrer: null,
      most_used_browser: null,
      most_used_device: null,
      clicks_today: 0,
      clicks_this_week: 0,
      clicks_this_month: 0
    };
  }
}

async function getFilteredGeographicData(userId: string, workspaceId: string, shortCode: string, startDate?: string, endDate?: string): Promise<GeographicData[]> {
  try {
    let query;
    if (startDate && endDate) {
      query = sql<GeographicData>`
        SELECT country, COUNT(*) as clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        AND clicked_at >= ${startDate}::timestamp AND clicked_at <= ${endDate}::timestamp
        GROUP BY country
        ORDER BY clicks DESC
        LIMIT 10
      `;
    } else {
      query = sql<GeographicData>`
        SELECT country, COUNT(*) as clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        GROUP BY country
        ORDER BY clicks DESC
        LIMIT 10
      `;
    }
    const { rows } = await query;
    return rows;
  } catch (error) {
    console.error("Failed to fetch filtered geographic data:", error);
    return [];
  }
}

async function getFilteredDeviceData(userId: string, workspaceId: string, shortCode: string, startDate?: string, endDate?: string): Promise<DeviceData[]> {
  try {
    let query;
    if (startDate && endDate) {
      query = sql<DeviceData>`
        SELECT device_type, COUNT(*) as clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        AND clicked_at >= ${startDate}::timestamp AND clicked_at <= ${endDate}::timestamp
        GROUP BY device_type
        ORDER BY clicks DESC
      `;
    } else {
      query = sql<DeviceData>`
        SELECT device_type, COUNT(*) as clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        GROUP BY device_type
        ORDER BY clicks DESC
      `;
    }
    const { rows } = await query;
    return rows;
  } catch (error) {
    console.error("Failed to fetch filtered device data:", error);
    return [];
  }
}

async function getFilteredBrowserData(userId: string, workspaceId: string, shortCode: string, startDate?: string, endDate?: string): Promise<BrowserData[]> {
  try {
    let query;
    if (startDate && endDate) {
      query = sql<BrowserData>`
        SELECT browser_name, COUNT(*) as clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        AND clicked_at >= ${startDate}::timestamp AND clicked_at <= ${endDate}::timestamp
        GROUP BY browser_name
        ORDER BY clicks DESC
        LIMIT 10
      `;
    } else {
      query = sql<BrowserData>`
        SELECT browser_name, COUNT(*) as clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        GROUP BY browser_name
        ORDER BY clicks DESC
        LIMIT 10
      `;
    }
    const { rows } = await query;
    return rows;
  } catch (error) {
    console.error("Failed to fetch filtered browser data:", error);
    return [];
  }
}

async function getFilteredReferrerData(userId: string, workspaceId: string, shortCode: string, startDate?: string, endDate?: string): Promise<ReferrerData[]> {
  try {
    let query;
    if (startDate && endDate) {
      query = sql<ReferrerData>`
        SELECT referrer, COUNT(*) as clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        AND clicked_at >= ${startDate}::timestamp AND clicked_at <= ${endDate}::timestamp
        GROUP BY referrer
        ORDER BY clicks DESC
        LIMIT 10
      `;
    } else {
      query = sql<ReferrerData>`
        SELECT referrer, COUNT(*) as clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        GROUP BY referrer
        ORDER BY clicks DESC
        LIMIT 10
      `;
    }
    const { rows } = await query;
    return rows;
  } catch (error) {
    console.error("Failed to fetch filtered referrer data:", error);
    return [];
  }
}

async function getFilteredTimeSeriesData(userId: string, workspaceId: string, shortCode: string, startDate?: string, endDate?: string, filterType?: string): Promise<TimeSeriesData[]> {
  try {
    // Gestione del filtro "all" (sempre)
    if (filterType === 'all' || (!startDate && !endDate)) {
      // Per "sempre", ottieni tutti i dati giornalieri
      const { rows } = await sql<TimeSeriesData>`
        WITH first_click AS (
          SELECT MIN(clicked_at::date) as min_date
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          WHERE l.user_id = ${userId} 
            AND l.workspace_id = ${workspaceId} 
            AND l.short_code = ${shortCode}
        ),
        date_series AS (
          SELECT generate_series(
            COALESCE((SELECT min_date FROM first_click), CURRENT_DATE),
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS date
        ),
        daily_clicks AS (
          SELECT 
            clicked_at::date as date,
            COUNT(*) as total_clicks,
            COUNT(DISTINCT user_fingerprint) as unique_clicks
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          WHERE l.user_id = ${userId} 
            AND l.workspace_id = ${workspaceId} 
            AND l.short_code = ${shortCode}
          GROUP BY clicked_at::date
        )
        SELECT 
          ds.date::text as date,
          COALESCE(dc.total_clicks, 0) as total_clicks,
          COALESCE(dc.unique_clicks, 0) as unique_clicks
        FROM date_series ds
        LEFT JOIN daily_clicks dc ON ds.date = dc.date
        ORDER BY ds.date
      `;
      return rows;
    }

    // Se non ci sono date specifiche ma non è "all", usa gli ultimi 30 giorni
    const actualStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const actualEndDate = endDate || new Date().toISOString().split('T')[0];

    // Determina se usare dati orari basandosi sul filtro o sulla differenza di date
    const startDateObj = new Date(actualStartDate);
    const endDateObj = new Date(actualEndDate);
    const daysDiff = Math.floor((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    // Usa dati orari se è "today" o se è lo stesso giorno
    const useHourlyData = filterType === 'today' || daysDiff === 0;

    if (useHourlyData) {
      // Per il filtro "today", usa i parametri startDate e endDate dal frontend
      const startTime = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endTime = endDate || new Date().toISOString();
      
      // Dati orari per le ultime 24h con corretta gestione del fuso orario italiano
      const { rows } = await sql<TimeSeriesData>`
        WITH hour_series AS (
          -- Genera 24 ore consecutive partendo dall'ora di inizio UTC+2
          SELECT generate_series(
            (${startTime}::timestamp + interval '2 hours')::timestamp,
            (${endTime}::timestamp + interval '2 hours')::timestamp,
            interval '1 hour'
          ) AS hour_italian
        ),
        hourly_clicks AS (
          SELECT 
            date_trunc('hour', clicked_at + interval '2 hours') as hour_italian,
            COUNT(*) as total_clicks,
            COUNT(DISTINCT user_fingerprint) as unique_clicks
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          WHERE l.user_id = ${userId} 
            AND l.workspace_id = ${workspaceId} 
            AND l.short_code = ${shortCode}
            AND clicked_at >= ${startTime}::timestamp
            AND clicked_at < ${endTime}::timestamp + interval '1 hour'
          GROUP BY date_trunc('hour', clicked_at + interval '2 hours')
        )
        SELECT 
          TO_CHAR(hs.hour_italian, 'HH24:MI') as date,
          COALESCE(hc.total_clicks, 0) as total_clicks,
          COALESCE(hc.unique_clicks, 0) as unique_clicks
        FROM hour_series hs
        LEFT JOIN hourly_clicks hc ON hs.hour_italian = hc.hour_italian
        ORDER BY hs.hour_italian
      `;
      
      return rows;
    } else {
      // Dati giornalieri per altri periodi
      const { rows } = await sql<TimeSeriesData>`
        WITH date_series AS (
          SELECT generate_series(
            ${actualStartDate}::date,
            ${actualEndDate}::date,
            INTERVAL '1 day'
          )::date AS date
        ),
        daily_clicks AS (
          SELECT 
            clicked_at::date as date,
            COUNT(*) as total_clicks,
            COUNT(DISTINCT user_fingerprint) as unique_clicks
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          WHERE l.user_id = ${userId} 
            AND l.workspace_id = ${workspaceId} 
            AND l.short_code = ${shortCode}
            AND clicked_at >= ${actualStartDate}::timestamp
            AND clicked_at <= ${actualEndDate}::timestamp
          GROUP BY clicked_at::date
        )
        SELECT 
          ds.date::text as date,
          COALESCE(dc.total_clicks, 0) as total_clicks,
          COALESCE(dc.unique_clicks, 0) as unique_clicks
        FROM date_series ds
        LEFT JOIN daily_clicks dc ON ds.date = dc.date
        ORDER BY ds.date
      `;
      return rows;
    }
  } catch (error) {
    console.error("Failed to fetch filtered time series data:", error);
    return [];
  }
}

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

    // Otteniamo tutti i dati filtrati in parallelo
    const [linkData, clickAnalytics, geographicData, deviceData, browserData, referrerData, timeSeriesData] = await Promise.all([
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
