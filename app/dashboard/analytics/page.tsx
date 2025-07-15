import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import WorkspaceAnalyticsClient from './workspace-analytics-client';
import Link from 'next/link';

// Tipi per i dati delle statistiche del workspace
type WorkspaceAnalytics = {
  total_links: number;
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
  avg_clicks_per_link: number;
  most_clicked_link: string | null;
  most_clicked_link_count: number;
  links_created_today: number;
  links_created_this_week: number;
  links_created_this_month: number;
};

type LinkData = {
  short_code: string;
  original_url: string;
  title: string | null;
  click_count: number;
  unique_click_count: number;
  created_at: Date;
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
};

type MonthlyData = {
  month: string;
  month_number: number;
  year: number;
  total_clicks: number;
  unique_clicks: number;
};

// Funzione per ottenere le statistiche generali del workspace
async function getWorkspaceAnalytics(userId: string, workspaceId: string): Promise<WorkspaceAnalytics> {
  try {
    const { rows } = await sql<WorkspaceAnalytics>`
      WITH workspace_links AS (
        SELECT id, short_code, created_at FROM links 
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
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
        JOIN workspace_links wl ON c.link_id = wl.id
      ),
      link_stats AS (
        SELECT 
          COUNT(*) as total_links,
          COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as links_created_today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as links_created_this_week,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as links_created_this_month
        FROM workspace_links
      ),
      top_stats AS (
        SELECT 
          (SELECT referrer FROM clicks c JOIN workspace_links wl ON c.link_id = wl.id 
           WHERE referrer != 'Direct' GROUP BY referrer ORDER BY COUNT(*) DESC LIMIT 1) as top_referrer,
          (SELECT browser_name FROM clicks c JOIN workspace_links wl ON c.link_id = wl.id 
           GROUP BY browser_name ORDER BY COUNT(*) DESC LIMIT 1) as most_used_browser,
          (SELECT device_type FROM clicks c JOIN workspace_links wl ON c.link_id = wl.id 
           GROUP BY device_type ORDER BY COUNT(*) DESC LIMIT 1) as most_used_device,
          (SELECT wl.short_code FROM clicks c JOIN workspace_links wl ON c.link_id = wl.id 
           GROUP BY wl.short_code ORDER BY COUNT(*) DESC LIMIT 1) as most_clicked_link,
          (SELECT COUNT(*) FROM clicks c JOIN workspace_links wl ON c.link_id = wl.id 
           GROUP BY wl.short_code ORDER BY COUNT(*) DESC LIMIT 1) as most_clicked_link_count
      )
      SELECT 
        ls.total_links,
        COALESCE(cs.total_clicks, 0) as total_clicks,
        COALESCE(cs.unique_clicks, 0) as unique_clicks,
        COALESCE(cs.unique_countries, 0) as unique_countries,
        COALESCE(cs.unique_referrers, 0) as unique_referrers,
        COALESCE(cs.unique_devices, 0) as unique_devices,
        ts.top_referrer,
        ts.most_used_browser,
        ts.most_used_device,
        COALESCE(cs.clicks_today, 0) as clicks_today,
        COALESCE(cs.clicks_this_week, 0) as clicks_this_week,
        COALESCE(cs.clicks_this_month, 0) as clicks_this_month,
        COALESCE(cs.unique_clicks_today, 0) as unique_clicks_today,
        COALESCE(cs.unique_clicks_this_week, 0) as unique_clicks_this_week,
        COALESCE(cs.unique_clicks_this_month, 0) as unique_clicks_this_month,
        CASE WHEN ls.total_links > 0 THEN COALESCE(cs.total_clicks, 0)::float / ls.total_links ELSE 0 END as avg_clicks_per_link,
        ts.most_clicked_link,
        COALESCE(ts.most_clicked_link_count, 0) as most_clicked_link_count,
        ls.links_created_today,
        ls.links_created_this_week,
        ls.links_created_this_month
      FROM link_stats ls
      LEFT JOIN click_stats cs ON true
      LEFT JOIN top_stats ts ON true
    `;
    return rows[0] || {
      total_links: 0,
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
      avg_clicks_per_link: 0,
      most_clicked_link: null,
      most_clicked_link_count: 0,
      links_created_today: 0,
      links_created_this_week: 0,
      links_created_this_month: 0,
    };
  } catch (error) {
    console.error("Failed to fetch workspace analytics:", error);
    return {
      total_links: 0,
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
      avg_clicks_per_link: 0,
      most_clicked_link: null,
      most_clicked_link_count: 0,
      links_created_today: 0,
      links_created_this_week: 0,
      links_created_this_month: 0,
    };
  }
}

// Funzione per ottenere i top link
async function getTopLinks(userId: string, workspaceId: string, limit: number = 10): Promise<LinkData[]> {
  try {
    const { rows } = await sql<LinkData>`
      SELECT 
        l.short_code,
        l.original_url,
        l.title,
        l.created_at,
        COALESCE(COUNT(c.id), 0)::integer as click_count,
        COALESCE(COUNT(DISTINCT c.user_fingerprint), 0)::integer as unique_click_count
      FROM links l
      LEFT JOIN clicks c ON c.link_id = l.id
      WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId}
      GROUP BY l.id, l.short_code, l.original_url, l.title, l.created_at
      ORDER BY click_count DESC, l.created_at DESC
      LIMIT ${limit}
    `;
    
    // Converto i valori numerici da stringhe a numeri
    return rows.map(row => ({
      short_code: row.short_code,
      original_url: row.original_url,
      title: row.title,
      created_at: row.created_at,
      click_count: Number(row.click_count),
      unique_click_count: Number(row.unique_click_count)
    }));
  } catch (error) {
    console.error("Failed to fetch top links:", error);
    return [];
  }
}

// Funzione per ottenere i dati geografici
async function getGeographicData(userId: string, workspaceId: string): Promise<GeographicData[]> {
  try {
    const { rows } = await sql<GeographicData>`
      WITH workspace_links AS (
        SELECT id FROM links 
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
      ),
      total_clicks AS (
        SELECT COUNT(*) as total
        FROM clicks c
        JOIN workspace_links wl ON c.link_id = wl.id
      )
      SELECT 
        country,
        COUNT(*) as clicks,
        (COUNT(*) * 100.0 / total.total) as percentage
      FROM clicks c
      JOIN workspace_links wl ON c.link_id = wl.id
      CROSS JOIN total_clicks total
      WHERE country IS NOT NULL AND country != ''
      GROUP BY country, total.total
      ORDER BY clicks DESC
      LIMIT 10
    `;
    
    // Converto i valori numerici da stringhe a numeri
    return rows.map(row => ({
      country: row.country,
      clicks: Number(row.clicks),
      percentage: Number(row.percentage)
    }));
  } catch (error) {
    console.error("Failed to fetch geographic data:", error);
    return [];
  }
}

// Funzione per ottenere i dati sui dispositivi
async function getDeviceData(userId: string, workspaceId: string): Promise<DeviceData[]> {
  try {
    const { rows } = await sql<DeviceData>`
      WITH workspace_links AS (
        SELECT id FROM links 
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
      ),
      total_clicks AS (
        SELECT COUNT(*) as total
        FROM clicks c
        JOIN workspace_links wl ON c.link_id = wl.id
      )
      SELECT 
        device_type,
        COUNT(*) as clicks,
        (COUNT(*) * 100.0 / total.total) as percentage
      FROM clicks c
      JOIN workspace_links wl ON c.link_id = wl.id
      CROSS JOIN total_clicks total
      WHERE device_type IS NOT NULL AND device_type != ''
      GROUP BY device_type, total.total
      ORDER BY clicks DESC
    `;
    
    // Converto i valori numerici da stringhe a numeri
    return rows.map(row => ({
      device_type: row.device_type,
      clicks: Number(row.clicks),
      percentage: Number(row.percentage)
    }));
  } catch (error) {
    console.error("Failed to fetch device data:", error);
    return [];
  }
}

// Funzione per ottenere i dati sui browser
async function getBrowserData(userId: string, workspaceId: string): Promise<BrowserData[]> {
  try {
    const { rows } = await sql<BrowserData>`
      WITH workspace_links AS (
        SELECT id FROM links 
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
      ),
      total_clicks AS (
        SELECT COUNT(*) as total
        FROM clicks c
        JOIN workspace_links wl ON c.link_id = wl.id
      )
      SELECT 
        browser_name,
        COUNT(*) as clicks,
        (COUNT(*) * 100.0 / total.total) as percentage
      FROM clicks c
      JOIN workspace_links wl ON c.link_id = wl.id
      CROSS JOIN total_clicks total
      WHERE browser_name IS NOT NULL AND browser_name != ''
      GROUP BY browser_name, total.total
      ORDER BY clicks DESC
      LIMIT 10
    `;
    
    // Converto i valori numerici da stringhe a numeri
    return rows.map(row => ({
      browser_name: row.browser_name,
      clicks: Number(row.clicks),
      percentage: Number(row.percentage)
    }));
  } catch (error) {
    console.error("Failed to fetch browser data:", error);
    return [];
  }
}

// Funzione per ottenere i dati sui referrer
async function getReferrerData(userId: string, workspaceId: string): Promise<ReferrerData[]> {
  try {
    const { rows } = await sql<ReferrerData>`
      WITH workspace_links AS (
        SELECT id FROM links 
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
      ),
      total_clicks AS (
        SELECT COUNT(*) as total
        FROM clicks c
        JOIN workspace_links wl ON c.link_id = wl.id
      )
      SELECT 
        referrer,
        COUNT(*) as clicks,
        (COUNT(*) * 100.0 / total.total) as percentage
      FROM clicks c
      JOIN workspace_links wl ON c.link_id = wl.id
      CROSS JOIN total_clicks total
      WHERE referrer IS NOT NULL AND referrer != ''
      GROUP BY referrer, total.total
      ORDER BY clicks DESC
      LIMIT 10
    `;
    
    // Converto i valori numerici da stringhe a numeri
    return rows.map(row => ({
      referrer: row.referrer,
      clicks: Number(row.clicks),
      percentage: Number(row.percentage)
    }));
  } catch (error) {
    console.error("Failed to fetch referrer data:", error);
    return [];
  }
}

// Funzione per ottenere i dati temporali giornalieri
async function getDailyTimeSeriesData(userId: string, workspaceId: string, days: number = 30): Promise<TimeSeriesData[]> {
  try {
    const intervalQuery = `
      WITH workspace_links AS (
        SELECT id FROM links 
        WHERE user_id = $1 AND workspace_id = $2
      ),
      date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${days} days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      )
      SELECT 
        ds.date::text,
        COALESCE(COUNT(c.id), 0) as total_clicks,
        COALESCE(COUNT(DISTINCT c.user_fingerprint), 0) as unique_clicks
      FROM date_series ds
      LEFT JOIN clicks c ON c.clicked_at::date = ds.date
      LEFT JOIN workspace_links wl ON c.link_id = wl.id
      GROUP BY ds.date
      ORDER BY ds.date ASC
    `;
    
    const { rows } = await sql.query(intervalQuery, [userId, workspaceId]);
    
    // Converto i valori numerici da stringhe a numeri
    return (rows as { 
      date: string; 
      total_clicks: string; 
      unique_clicks: string; 
    }[]).map(row => ({
      date: row.date,
      total_clicks: Number(row.total_clicks),
      unique_clicks: Number(row.unique_clicks)
    }));
  } catch (error) {
    console.error("Failed to fetch daily time series data:", error);
    return [];
  }
}

// Funzione per ottenere i dati mensili
async function getMonthlyData(userId: string, workspaceId: string): Promise<MonthlyData[]> {
  try {
    const { rows } = await sql<MonthlyData>`
      WITH workspace_links AS (
        SELECT id FROM links 
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
      )
      SELECT 
        TO_CHAR(clicked_at, 'Month YYYY') as month,
        EXTRACT(MONTH FROM clicked_at)::integer as month_number,
        EXTRACT(YEAR FROM clicked_at)::integer as year,
        COUNT(*) as total_clicks,
        COUNT(DISTINCT user_fingerprint) as unique_clicks
      FROM clicks c
      JOIN workspace_links wl ON c.link_id = wl.id
      GROUP BY EXTRACT(YEAR FROM clicked_at), EXTRACT(MONTH FROM clicked_at), TO_CHAR(clicked_at, 'Month YYYY')
      ORDER BY year DESC, month_number DESC
      LIMIT 12
    `;
    
    // Converto i valori numerici da stringhe a numeri
    return rows.map(row => ({
      month: row.month,
      month_number: Number(row.month_number),
      year: Number(row.year),
      total_clicks: Number(row.total_clicks),
      unique_clicks: Number(row.unique_clicks)
    }));
  } catch (error) {
    console.error("Failed to fetch monthly data:", error);
    return [];
  }
}

export default async function WorkspaceAnalyticsPage() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
    redirect('/login');
  }

  // Fetch tutti i dati necessari per le statistiche del workspace
  const [
    workspaceAnalytics,
    topLinks,
    geographicData,
    deviceData,
    browserData,
    referrerData,
    dailyData,
    monthlyData
  ] = await Promise.all([
    getWorkspaceAnalytics(session.userId, session.workspaceId),
    getTopLinks(session.userId, session.workspaceId, 10),
    getGeographicData(session.userId, session.workspaceId),
    getDeviceData(session.userId, session.workspaceId),
    getBrowserData(session.userId, session.workspaceId),
    getReferrerData(session.userId, session.workspaceId),
    getDailyTimeSeriesData(session.userId, session.workspaceId, 30),
    getMonthlyData(session.userId, session.workspaceId)
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link 
              href="/dashboard"
              className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300"
            >
              ← Torna alla Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Statistiche Workspace</h1>
          </div>
        </div>
      </header>

      <div className="p-6">
        <WorkspaceAnalyticsClient
          workspaceAnalytics={workspaceAnalytics}
          topLinks={topLinks}
          geographicData={geographicData}
          deviceData={deviceData}
          browserData={browserData}
          referrerData={referrerData}
          dailyData={dailyData}
          monthlyData={monthlyData}
        />
      </div>
    </div>
  );
}
