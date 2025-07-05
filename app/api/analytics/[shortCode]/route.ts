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
  unique_clicks_today: number;
  unique_clicks_this_week: number;
  unique_clicks_this_month: number;
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
      // Convertiamo le date per il filtro temporale
      const startTimeUTC = new Date(startDate).toISOString();
      const endTimeUTC = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000).toISOString();
      
      // Per i filtri, usa il range di date specificato
      query = sql<ClickAnalytics>`
        WITH link_data AS (
          SELECT id FROM links 
          WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
        ),
        filtered_clicks AS (
          SELECT * FROM clicks c
          JOIN link_data ld ON c.link_id = ld.id
          WHERE clicked_at_rome >= ${startTimeUTC}::timestamptz AND clicked_at_rome < ${endTimeUTC}::timestamptz
        ),
        all_clicks AS (
          SELECT * FROM clicks c
          JOIN link_data ld ON c.link_id = ld.id
        ),
        click_stats AS (
          SELECT 
            COUNT(*) as total_clicks,
            COUNT(DISTINCT user_fingerprint) as unique_clicks,
            COUNT(DISTINCT country) as unique_countries,
            COUNT(DISTINCT referrer) as unique_referrers,
            COUNT(DISTINCT device_type) as unique_devices
          FROM filtered_clicks
        ),
        time_stats AS (
          SELECT
            -- Usa clicked_at_rome che è già nel fuso orario italiano
            COUNT(CASE WHEN clicked_at_rome::date = (NOW() AT TIME ZONE 'Europe/Rome')::date THEN 1 END) as clicks_today,
            COUNT(CASE WHEN clicked_at_rome >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '7 days') THEN 1 END) as clicks_this_week,
            COUNT(CASE WHEN clicked_at_rome >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '30 days') THEN 1 END) as clicks_this_month,
            COUNT(DISTINCT CASE WHEN clicked_at_rome::date = (NOW() AT TIME ZONE 'Europe/Rome')::date THEN user_fingerprint END) as unique_clicks_today,
            COUNT(DISTINCT CASE WHEN clicked_at_rome >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '7 days') THEN user_fingerprint END) as unique_clicks_this_week,
            COUNT(DISTINCT CASE WHEN clicked_at_rome >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '30 days') THEN user_fingerprint END) as unique_clicks_this_month
          FROM all_clicks
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
          tms.clicks_today,
          tms.clicks_this_week,
          tms.clicks_this_month,
          tms.unique_clicks_today,
          tms.unique_clicks_this_week,
          tms.unique_clicks_this_month
        FROM click_stats cs, top_stats ts, time_stats tms
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
            -- Usa clicked_at_rome che è già nel fuso orario italiano
            COUNT(CASE WHEN clicked_at_rome::date = (NOW() AT TIME ZONE 'Europe/Rome')::date THEN 1 END) as clicks_today,
            COUNT(CASE WHEN clicked_at_rome >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '7 days') THEN 1 END) as clicks_this_week,
            COUNT(CASE WHEN clicked_at_rome >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '30 days') THEN 1 END) as clicks_this_month,
            COUNT(DISTINCT CASE WHEN clicked_at_rome::date = (NOW() AT TIME ZONE 'Europe/Rome')::date THEN user_fingerprint END) as unique_clicks_today,
            COUNT(DISTINCT CASE WHEN clicked_at_rome >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '7 days') THEN user_fingerprint END) as unique_clicks_this_week,
            COUNT(DISTINCT CASE WHEN clicked_at_rome >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '30 days') THEN user_fingerprint END) as unique_clicks_this_month
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
             GROUP BY device_type ORDER BY COUNT(*) DESC LIMIT 1) as most_used_device        )
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
          cs.clicks_this_month,
          cs.unique_clicks_today,
          cs.unique_clicks_this_week,
          cs.unique_clicks_this_month
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
      clicks_this_month: 0,
      unique_clicks_today: 0,
      unique_clicks_this_week: 0,
      unique_clicks_this_month: 0
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
      clicks_this_month: 0,
      unique_clicks_today: 0,
      unique_clicks_this_week: 0,
      unique_clicks_this_month: 0
    };
  }
}

async function getFilteredGeographicData(userId: string, workspaceId: string, shortCode: string, startDate?: string, endDate?: string): Promise<GeographicData[]> {
  try {
    let query;
    if (startDate && endDate) {
      // Convertiamo le date per il filtro temporale
      const startTimeUTC = new Date(startDate).toISOString();
      const endTimeUTC = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000).toISOString();
      
      query = sql<GeographicData>`
        WITH total_clicks AS (
          SELECT COUNT(*) as total
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
          AND clicked_at_rome >= ${startTimeUTC}::timestamptz AND clicked_at_rome < ${endTimeUTC}::timestamptz
        )
        SELECT 
          country, 
          COUNT(*) as clicks,
          COALESCE(ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1), 0) as percentage
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        AND clicked_at_rome >= ${startTimeUTC}::timestamptz AND clicked_at_rome < ${endTimeUTC}::timestamptz
        GROUP BY country
        ORDER BY clicks DESC
        LIMIT 10
      `;
    } else {
      query = sql<GeographicData>`
        WITH total_clicks AS (
          SELECT COUNT(*) as total
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        )
        SELECT 
          country, 
          COUNT(*) as clicks,
          COALESCE(ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1), 0) as percentage
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
      // Convertiamo le date per il filtro temporale
      const startTimeUTC = new Date(startDate).toISOString();
      const endTimeUTC = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000).toISOString();
      
      query = sql<DeviceData>`
        WITH total_clicks AS (
          SELECT COUNT(*) as total
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
          AND clicked_at_rome >= ${startTimeUTC}::timestamptz AND clicked_at_rome < ${endTimeUTC}::timestamptz
        )
        SELECT 
          device_type, 
          COUNT(*) as clicks,
          COALESCE(ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1), 0) as percentage
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        AND clicked_at_rome >= ${startTimeUTC}::timestamptz AND clicked_at_rome < ${endTimeUTC}::timestamptz
        GROUP BY device_type
        ORDER BY clicks DESC
      `;
    } else {
      query = sql<DeviceData>`
        WITH total_clicks AS (
          SELECT COUNT(*) as total
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        )
        SELECT 
          device_type, 
          COUNT(*) as clicks,
          COALESCE(ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1), 0) as percentage
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
      // Convertiamo le date per il filtro temporale
      const startTimeUTC = new Date(startDate).toISOString();
      const endTimeUTC = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000).toISOString();
      
      query = sql<BrowserData>`
        WITH total_clicks AS (
          SELECT COUNT(*) as total
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
          AND clicked_at_rome >= ${startTimeUTC}::timestamptz AND clicked_at_rome < ${endTimeUTC}::timestamptz
        )
        SELECT 
          browser_name, 
          COUNT(*) as clicks,
          COALESCE(ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1), 0) as percentage
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        AND clicked_at_rome >= ${startTimeUTC}::timestamptz AND clicked_at_rome < ${endTimeUTC}::timestamptz
        GROUP BY browser_name
        ORDER BY clicks DESC
        LIMIT 10
      `;
    } else {
      query = sql<BrowserData>`
        WITH total_clicks AS (
          SELECT COUNT(*) as total
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        )
        SELECT 
          browser_name, 
          COUNT(*) as clicks,
          COALESCE(ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1), 0) as percentage
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
      // Convertiamo le date per il filtro temporale
      const startTimeUTC = new Date(startDate).toISOString();
      const endTimeUTC = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000).toISOString();
      
      query = sql<ReferrerData>`
        WITH total_clicks AS (
          SELECT COUNT(*) as total
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
          AND clicked_at_rome >= ${startTimeUTC}::timestamptz AND clicked_at_rome < ${endTimeUTC}::timestamptz
        )
        SELECT 
          referrer, 
          COUNT(*) as clicks,
          COALESCE(ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1), 0) as percentage
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        AND clicked_at_rome >= ${startTimeUTC}::timestamptz AND clicked_at_rome < ${endTimeUTC}::timestamptz
        GROUP BY referrer
        ORDER BY clicks DESC
        LIMIT 10
      `;
    } else {
      query = sql<ReferrerData>`
        WITH total_clicks AS (
          SELECT COUNT(*) as total
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        )
        SELECT 
          referrer, 
          COUNT(*) as clicks,
          COALESCE(ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1), 0) as percentage
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
    console.log('getFilteredTimeSeriesData called with:', { startDate, endDate, filterType });
    
    // Gestione del filtro "all" (sempre)
    if (filterType === 'all' || (!startDate && !endDate)) {
      console.log('Using "all" filter - getting all daily data from link creation to today');
      
      const { rows } = await sql<TimeSeriesData>`
        WITH link_creation_date AS (
          -- Trova la data di creazione del link (già in fuso orario italiano se created_at è TIMESTAMPTZ)
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
        date_series AS (
          SELECT generate_series(
            (SELECT creation_date FROM link_creation_date),
            (SELECT current_date FROM current_date_italy),
            INTERVAL '1 day'
          )::date AS date
        ),
        daily_clicks AS (
          SELECT 
            -- Raggruppa i click per giorno utilizzando clicked_at_rome (già in fuso orario italiano)
            clicked_at_rome::date as date,
            COUNT(*) as total_clicks,
            COUNT(DISTINCT user_fingerprint) as unique_clicks
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          WHERE l.user_id = ${userId} 
            AND l.workspace_id = ${workspaceId} 
            AND l.short_code = ${shortCode}
          GROUP BY clicked_at_rome::date
        )
        SELECT 
          ds.date::text as date,
          COALESCE(dc.total_clicks, 0) as total_clicks,
          COALESCE(dc.unique_clicks, 0) as unique_clicks
        FROM date_series ds
        LEFT JOIN daily_clicks dc ON ds.date = dc.date
        ORDER BY ds.date
      `;
      console.log('Retrieved time series data for "all" filter:', rows.length, 'days');
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
      // Per il filtro "today", mostriamo le ultime 24 ore dall'ora corrente italiana
      const { rows } = await sql<TimeSeriesData>`
        WITH current_hour_italy AS (
          -- Ora corrente in Italia, troncata all'ora
          SELECT date_trunc('hour', NOW() AT TIME ZONE 'Europe/Rome') as current_hour
        ),
        start_hour_italy AS (
          -- 24 ore fa dall'ora corrente italiana
          SELECT (SELECT current_hour FROM current_hour_italy) - INTERVAL '23 hours' as start_hour
        ),
        hour_series AS (
          -- Genera serie oraria dalle ultime 24 ore fino all'ora corrente
          SELECT generate_series(
            (SELECT start_hour FROM start_hour_italy),
            (SELECT current_hour FROM current_hour_italy),
            interval '1 hour'
          ) AS hour_rome
        ),
        hourly_clicks AS (
          SELECT 
            -- Raggruppa i click per ora utilizzando clicked_at_rome
            date_trunc('hour', clicked_at_rome) as hour_rome,
            COUNT(*) as total_clicks,
            COUNT(DISTINCT user_fingerprint) as unique_clicks
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          WHERE l.user_id = ${userId} 
            AND l.workspace_id = ${workspaceId} 
            AND l.short_code = ${shortCode}
            -- Filtra le ultime 24 ore usando clicked_at_rome
            AND date_trunc('hour', clicked_at_rome) >= (SELECT start_hour FROM start_hour_italy)
            AND date_trunc('hour', clicked_at_rome) <= (SELECT current_hour FROM current_hour_italy)
          GROUP BY date_trunc('hour', clicked_at_rome)
        )
        SELECT 
          -- Aggiunge 2 ore al timestamp per correggere il tooltip
          (hs.hour_rome + INTERVAL '2 hours')::timestamp as full_datetime,
          TO_CHAR(hs.hour_rome, 'HH24:MI') as date,
          COALESCE(hc.total_clicks, 0) as total_clicks,
          COALESCE(hc.unique_clicks, 0) as unique_clicks
        FROM hour_series hs
        LEFT JOIN hourly_clicks hc ON hs.hour_rome = hc.hour_rome
        ORDER BY hs.hour_rome
      `;
      
      return rows;
    } else {
      // Dati giornalieri per altri periodi (filtri personalizzati)
      const { rows } = await sql<TimeSeriesData>`
        WITH date_series AS (
          -- Genera serie giornaliera utilizzando le date del filtro
          SELECT generate_series(
            ${actualStartDate}::date,
            ${actualEndDate}::date,
            INTERVAL '1 day'
          )::date AS date
        ),
        daily_clicks AS (
          SELECT 
            -- Raggruppa i click per giorno utilizzando clicked_at_rome (già in fuso orario italiano)
            clicked_at_rome::date as date,
            COUNT(*) as total_clicks,
            COUNT(DISTINCT user_fingerprint) as unique_clicks
          FROM clicks c
          JOIN links l ON c.link_id = l.id
          WHERE l.user_id = ${userId} 
            AND l.workspace_id = ${workspaceId} 
            AND l.short_code = ${shortCode}
            -- Filtra usando clicked_at_rome che è già nel fuso orario italiano
            AND clicked_at_rome::date >= ${actualStartDate}::date
            AND clicked_at_rome::date <= ${actualEndDate}::date
          GROUP BY clicked_at_rome::date
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
