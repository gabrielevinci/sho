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

// Funzione per ottenere le statistiche di base del link
async function getClickAnalytics(userId: string, workspaceId: string, shortCode: string): Promise<ClickAnalytics> {
  try {
    const { rows } = await sql<ClickAnalytics>`
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
          COUNT(CASE WHEN clicked_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as clicks_this_month,
          COUNT(DISTINCT CASE WHEN clicked_at::date = CURRENT_DATE THEN user_fingerprint END) as unique_clicks_today,
          COUNT(DISTINCT CASE WHEN clicked_at >= CURRENT_DATE - INTERVAL '7 days' THEN user_fingerprint END) as unique_clicks_this_week,
          COUNT(DISTINCT CASE WHEN clicked_at >= CURRENT_DATE - INTERVAL '30 days' THEN user_fingerprint END) as unique_clicks_this_month
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
        cs.clicks_this_month,
        cs.unique_clicks_today,
        cs.unique_clicks_this_week,
        cs.unique_clicks_this_month
      FROM click_stats cs, top_stats ts
    `;
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
      unique_clicks_this_month: 0,
      avg_total_clicks_per_period: 0,
      avg_unique_clicks_per_period: 0
    };
  } catch (error) {
    console.error("Failed to fetch click analytics:", error);
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
      unique_clicks_this_month: 0,
      avg_total_clicks_per_period: 0,
      avg_unique_clicks_per_period: 0
    };
  }
}

// Funzione per ottenere i dati geografici
async function getGeographicData(userId: string, workspaceId: string, shortCode: string): Promise<GeographicData[]> {
  try {
    const { rows } = await sql<GeographicData>`
      SELECT country, COUNT(*) as clicks
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
      GROUP BY country
      ORDER BY clicks DESC
      LIMIT 10
    `;
    return rows;
  } catch (error) {
    console.error("Failed to fetch geographic data:", error);
    return [];
  }
}

// Funzione per ottenere i dati dei dispositivi
async function getDeviceData(userId: string, workspaceId: string, shortCode: string): Promise<DeviceData[]> {
  try {
    const { rows } = await sql<DeviceData>`
      SELECT device_type, COUNT(*) as clicks
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
      GROUP BY device_type
      ORDER BY clicks DESC
    `;
    return rows;
  } catch (error) {
    console.error("Failed to fetch device data:", error);
    return [];
  }
}

// Funzione per ottenere i dati dei browser
async function getBrowserData(userId: string, workspaceId: string, shortCode: string): Promise<BrowserData[]> {
  try {
    const { rows } = await sql<BrowserData>`
      SELECT browser_name, COUNT(*) as clicks
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
      GROUP BY browser_name
      ORDER BY clicks DESC
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
    const { rows } = await sql<ReferrerData>`
      SELECT referrer, COUNT(*) as clicks
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
      GROUP BY referrer
      ORDER BY clicks DESC
      LIMIT 10
    `;
    return rows;
  } catch (error) {
    console.error("Failed to fetch referrer data:", error);
    return [];
  }
}

// Funzione per ottenere i dati temporali degli ultimi 30 giorni
async function getTimeSeriesData(userId: string, workspaceId: string, shortCode: string): Promise<TimeSeriesData[]> {
  try {
    const { rows } = await sql<TimeSeriesData>`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '29 days',
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
          AND clicked_at >= CURRENT_DATE - INTERVAL '29 days'
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
  } catch (error) {
    console.error("Failed to fetch time series data:", error);
    return [];
  }
}

// Funzione per ottenere i dati mensili dei click
async function getMonthlyData(userId: string, workspaceId: string, shortCode: string): Promise<MonthlyData[]> {
  try {
    const { rows } = await sql<MonthlyData>`
      WITH month_series AS (
        SELECT 
          generate_series(1, 12) as month_number,
          EXTRACT(YEAR FROM CURRENT_DATE) as year,
          TO_CHAR(make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, generate_series(1, 12), 1), 'Month') as month
      ),
      monthly_clicks AS (
        SELECT 
          EXTRACT(MONTH FROM clicked_at)::integer as month_number,
          EXTRACT(YEAR FROM clicked_at)::integer as year,
          COUNT(*)::integer as total_clicks,
          COUNT(DISTINCT user_fingerprint)::integer as unique_clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = ${userId} 
          AND l.workspace_id = ${workspaceId} 
          AND l.short_code = ${shortCode}
          AND EXTRACT(YEAR FROM clicked_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY EXTRACT(MONTH FROM clicked_at), EXTRACT(YEAR FROM clicked_at)
      )
      SELECT 
        TRIM(ms.month) as month,
        ms.month_number::integer,
        ms.year::integer,
        COALESCE(mc.total_clicks, 0) as total_clicks,
        COALESCE(mc.unique_clicks, 0) as unique_clicks
      FROM month_series ms
      LEFT JOIN monthly_clicks mc ON ms.month_number = mc.month_number AND ms.year = mc.year
      ORDER BY ms.month_number
    `;
    return rows || [];
  } catch (error) {
    console.error("Failed to fetch monthly data:", error);
    return [];
  }
}

// Funzione per ottenere i dati settimanali dei click dell'anno corrente
async function getWeeklyData(userId: string, workspaceId: string, shortCode: string): Promise<WeeklyData[]> {
  try {
    const { rows } = await sql<WeeklyData>`
      WITH week_series AS (
        SELECT 
          generate_series(1, 52) as week,
          EXTRACT(YEAR FROM CURRENT_DATE) as year,
          (DATE_TRUNC('year', CURRENT_DATE) + (generate_series(1, 52) - 1) * INTERVAL '1 week')::date as week_start,
          (DATE_TRUNC('year', CURRENT_DATE) + (generate_series(1, 52) - 1) * INTERVAL '1 week' + INTERVAL '6 days')::date as week_end
      ),
      weekly_clicks AS (
        SELECT 
          DATE_PART('week', clicked_at)::integer as week,
          EXTRACT(YEAR FROM clicked_at)::integer as year,
          COUNT(*)::integer as total_clicks,
          COUNT(DISTINCT user_fingerprint)::integer as unique_clicks
        FROM clicks c
        JOIN links l ON c.link_id = l.id
        WHERE l.user_id = ${userId} 
          AND l.workspace_id = ${workspaceId} 
          AND l.short_code = ${shortCode}
          AND EXTRACT(YEAR FROM clicked_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY DATE_PART('week', clicked_at), EXTRACT(YEAR FROM clicked_at)
      )
      SELECT 
        ws.week::integer,
        ws.year::integer,
        ws.week_start::text,
        ws.week_end::text,
        COALESCE(wc.total_clicks, 0) as total_clicks,
        COALESCE(wc.unique_clicks, 0) as unique_clicks
      FROM week_series ws
      LEFT JOIN weekly_clicks wc ON ws.week = wc.week AND ws.year = wc.year
      WHERE ws.week <= DATE_PART('week', CURRENT_DATE)
      ORDER BY ws.week
    `;
    return rows || [];
  } catch (error) {
    console.error("Failed to fetch weekly data:", error);
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
  const [linkData, clickAnalytics, geographicData, deviceData, browserData, referrerData, timeSeriesData, monthlyData, weeklyData] = await Promise.all([
    getLinkData(session.userId, session.workspaceId, shortCode),
    getClickAnalytics(session.userId, session.workspaceId, shortCode),
    getGeographicData(session.userId, session.workspaceId, shortCode),
    getDeviceData(session.userId, session.workspaceId, shortCode),
    getBrowserData(session.userId, session.workspaceId, shortCode),
    getReferrerData(session.userId, session.workspaceId, shortCode),
    getTimeSeriesData(session.userId, session.workspaceId, shortCode),
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
    monthlyData: monthlyData || [],
    weeklyData: weeklyData || []
  };

  return <AnalyticsClient initialData={initialData} shortCode={shortCode} />;
}
