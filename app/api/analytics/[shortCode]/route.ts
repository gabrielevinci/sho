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

// Types for monthly and weekly data
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

async function getFilteredClickAnalytics(userId: string, workspaceId: string, shortCode: string, startDate?: string, endDate?: string, filterType?: string): Promise<ClickAnalytics> {
  try {
    let query;
    if (startDate && endDate) {
      // Determina se è un filtro personalizzato e aggiusta le date di conseguenza
      const isCustomFilter = !['today', 'week', 'month', '3months', 'year', 'all'].includes(filterType || '');
      
      let adjustedStartDate = startDate;
      if (isCustomFilter) {
        const startDateObj = new Date(startDate);
        startDateObj.setDate(startDateObj.getDate() + 1);
        adjustedStartDate = startDateObj.toISOString().split('T')[0];
        console.log(`Analytics: Adjusted start date for custom filter: ${startDate} -> ${adjustedStartDate}`);
      }
      
      // Convertiamo le date per il filtro temporale
      const startTimeUTC = new Date(adjustedStartDate).toISOString();
      const endTimeUTC = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000).toISOString();
      
      // Per i filtri, usa il range di date specificato
      query = sql<ClickAnalytics>`
        WITH link_data AS (
          SELECT id FROM links 
          WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
        ),
        filtered_enhanced AS (
          SELECT ef.* 
          FROM enhanced_fingerprints ef
          WHERE ef.link_id IN (SELECT id FROM link_data)
          AND (ef.created_at AT TIME ZONE 'Europe/Rome') >= ${startTimeUTC}::timestamptz 
          AND (ef.created_at AT TIME ZONE 'Europe/Rome') < ${endTimeUTC}::timestamptz
        ),
        all_enhanced AS (
          SELECT ef.* 
          FROM enhanced_fingerprints ef
          WHERE ef.link_id IN (SELECT id FROM link_data)
        ),
        click_stats AS (
          SELECT 
            COUNT(*) as total_clicks,
            COUNT(DISTINCT device_fingerprint) as unique_clicks,
            COUNT(DISTINCT country) as unique_countries,
            COUNT(DISTINCT referrer) as unique_referrers,
            COUNT(DISTINCT device_category) as unique_devices
          FROM filtered_enhanced
        ),
        time_stats AS (
          SELECT
            -- Usa created_at convertito al fuso orario italiano
            COUNT(CASE WHEN (created_at AT TIME ZONE 'Europe/Rome')::date = (NOW() AT TIME ZONE 'Europe/Rome')::date THEN 1 END) as clicks_today,
            COUNT(CASE WHEN created_at >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '7 days') THEN 1 END) as clicks_this_week,
            COUNT(CASE WHEN created_at >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '30 days') THEN 1 END) as clicks_this_month,
            COUNT(DISTINCT CASE WHEN (created_at AT TIME ZONE 'Europe/Rome')::date = (NOW() AT TIME ZONE 'Europe/Rome')::date THEN device_fingerprint END) as unique_clicks_today,
            COUNT(DISTINCT CASE WHEN created_at >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '7 days') THEN device_fingerprint END) as unique_clicks_this_week,
            COUNT(DISTINCT CASE WHEN created_at >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '30 days') THEN device_fingerprint END) as unique_clicks_this_month
          FROM all_enhanced
        ),
        top_stats AS (
          SELECT 
            (SELECT referrer FROM filtered_enhanced 
             WHERE referrer != 'Direct' 
             GROUP BY referrer ORDER BY COUNT(*) DESC LIMIT 1) as top_referrer,
            (SELECT browser_type FROM filtered_enhanced 
             GROUP BY browser_type ORDER BY COUNT(*) DESC LIMIT 1) as most_used_browser,
            (SELECT device_category FROM filtered_enhanced 
             GROUP BY device_category ORDER BY COUNT(*) DESC LIMIT 1) as most_used_device
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
            COUNT(ef.id) as total_clicks,
            COUNT(DISTINCT ef.device_fingerprint) as unique_clicks,
            COUNT(DISTINCT ef.country) as unique_countries,
            COUNT(DISTINCT ef.referrer) as unique_referrers,
            COUNT(DISTINCT ef.device_category) as unique_devices,
            -- Usa created_at convertito al fuso orario italiano
            COUNT(CASE WHEN (ef.created_at AT TIME ZONE 'Europe/Rome')::date = (NOW() AT TIME ZONE 'Europe/Rome')::date THEN 1 END) as clicks_today,
            COUNT(CASE WHEN ef.created_at >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '7 days') THEN 1 END) as clicks_this_week,
            COUNT(CASE WHEN ef.created_at >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '30 days') THEN 1 END) as clicks_this_month,
            COUNT(DISTINCT CASE WHEN (ef.created_at AT TIME ZONE 'Europe/Rome')::date = (NOW() AT TIME ZONE 'Europe/Rome')::date THEN ef.device_fingerprint END) as unique_clicks_today,
            COUNT(DISTINCT CASE WHEN ef.created_at >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '7 days') THEN ef.device_fingerprint END) as unique_clicks_this_week,
            COUNT(DISTINCT CASE WHEN ef.created_at >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '30 days') THEN ef.device_fingerprint END) as unique_clicks_this_month
          FROM enhanced_fingerprints ef
          WHERE ef.link_id IN (SELECT id FROM link_data)
        ),
        top_stats AS (
          SELECT 
            (SELECT ef.referrer FROM enhanced_fingerprints ef 
             WHERE ef.link_id IN (SELECT id FROM link_data) AND ef.referrer != 'Direct' 
             GROUP BY ef.referrer ORDER BY COUNT(*) DESC LIMIT 1) as top_referrer,
            (SELECT ef.browser_type FROM enhanced_fingerprints ef 
             WHERE ef.link_id IN (SELECT id FROM link_data)
             GROUP BY ef.browser_type ORDER BY COUNT(*) DESC LIMIT 1) as most_used_browser,
            (SELECT ef.device_category FROM enhanced_fingerprints ef 
             WHERE ef.link_id IN (SELECT id FROM link_data)
             GROUP BY ef.device_category ORDER BY COUNT(*) DESC LIMIT 1) as most_used_device
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
          cs.unique_clicks_this_month,
          0 as avg_total_clicks_per_period,
          0 as avg_unique_clicks_per_period
        FROM click_stats cs, top_stats ts
      `;
    }
    const { rows } = await query;
    const result = rows[0] || {
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

    // Calcola le medie in base al tipo di filtro
    let periods = 1;
    
    if (filterType === 'today') {
      // Per "24 ore" -> media click/ora (ultime 24 ore)
      periods = 24;
    } else if (startDate && endDate) {
      // Per filtri predefiniti, usa il numero teorico di giorni
      // Per filtro custom, calcola la differenza reale delle date
      if (filterType === 'week') {
        periods = 7;
      } else if (filterType === 'month') {
        periods = 30;
      } else if (filterType === '3months') {
        periods = 90;
      } else if (filterType === 'year') {
        periods = 365;
      } else {
        // Per filtro custom -> calcola il numero reale di giorni tra le date (inclusivo)
        // Usa le date aggiustate se è un filtro personalizzato
        const isCustomFilter = !['today', 'week', 'month', '3months', 'year', 'all'].includes(filterType || '');
        
        let calculationStartDate = startDate;
        if (isCustomFilter) {
          const startDateObj = new Date(startDate);
          startDateObj.setDate(startDateObj.getDate() + 1);
          calculationStartDate = startDateObj.toISOString().split('T')[0];
        }
        
        const start = new Date(calculationStartDate);
        const end = new Date(endDate);
        
        // Assicuriamoci che stiamo contando giorni completi
        const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        
        // Calcola la differenza in giorni + 1 per includere entrambi i giorni estremi
        const diffTime = endTime.getTime() - startTime.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        periods = Math.max(1, diffDays);
        
        console.log(`Average calculation: using ${calculationStartDate} to ${endDate} = ${periods} days`);
      }
    } else if (filterType === 'all') {
      // Per "all": calcola i giorni dalla creazione del link ad oggi
      try {
        const linkInfo = await sql`
          SELECT created_at 
          FROM links 
          WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
        `;
        if (linkInfo.rows.length > 0) {
          const createdAt = new Date(linkInfo.rows[0].created_at);
          const now = new Date();
          periods = Math.max(1, Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
        }
      } catch (error) {
        console.error("Error calculating periods for 'all' filter:", error);
        periods = 1;
      }
    } else {
      // Fallback per casi senza date specifiche
      periods = 1;
    }

    result.avg_total_clicks_per_period = periods > 0 ? Math.round((result.total_clicks / periods) * 100) / 100 : 0;
    result.avg_unique_clicks_per_period = periods > 0 ? Math.round((result.unique_clicks / periods) * 100) / 100 : 0;

    return result;
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
      unique_clicks_this_month: 0,
      avg_total_clicks_per_period: 0,
      avg_unique_clicks_per_period: 0
    };
  }
}

async function getFilteredGeographicData(userId: string, workspaceId: string, shortCode: string, startDate?: string, endDate?: string, filterType?: string): Promise<GeographicData[]> {
  try {
    let query;
    if (startDate && endDate) {
      // Determina se è un filtro personalizzato e aggiusta le date di conseguenza
      const isCustomFilter = !['today', 'week', 'month', '3months', 'year', 'all'].includes(filterType || '');
      
      let adjustedStartDate = startDate;
      if (isCustomFilter) {
        const startDateObj = new Date(startDate);
        startDateObj.setDate(startDateObj.getDate() + 1);
        adjustedStartDate = startDateObj.toISOString().split('T')[0];
        console.log(`Geographic: Adjusted start date for custom filter: ${startDate} -> ${adjustedStartDate}`);
      }
      
      // Convertiamo le date per il filtro temporale
      const startTimeUTC = new Date(adjustedStartDate).toISOString();
      const endTimeUTC = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000).toISOString();
      
      query = sql<GeographicData>`
        WITH total_clicks AS (
          SELECT COUNT(*) as total
          FROM enhanced_fingerprints ef
          JOIN links l ON ef.link_id = l.id
          WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
          AND (ef.created_at AT TIME ZONE 'Europe/Rome') >= ${startTimeUTC}::timestamptz 
          AND (ef.created_at AT TIME ZONE 'Europe/Rome') < ${endTimeUTC}::timestamptz
        )
        SELECT 
          ef.country, 
          COUNT(*) as clicks,
          COALESCE(ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1), 0) as percentage
        FROM enhanced_fingerprints ef
        JOIN links l ON ef.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        AND (ef.created_at AT TIME ZONE 'Europe/Rome') >= ${startTimeUTC}::timestamptz 
        AND (ef.created_at AT TIME ZONE 'Europe/Rome') < ${endTimeUTC}::timestamptz
        GROUP BY ef.country
        ORDER BY clicks DESC
        LIMIT 10
      `;
    } else {
      query = sql<GeographicData>`
        WITH total_clicks AS (
          SELECT COUNT(*) as total
          FROM enhanced_fingerprints ef
          JOIN links l ON ef.link_id = l.id
          WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        )
        SELECT 
          ef.country, 
          COUNT(*) as clicks,
          COALESCE(ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1), 0) as percentage
        FROM enhanced_fingerprints ef
        JOIN links l ON ef.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        GROUP BY ef.country
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

async function getFilteredDeviceData(userId: string, workspaceId: string, shortCode: string, startDate?: string, endDate?: string, filterType?: string): Promise<DeviceData[]> {
  try {
    let query;
    if (startDate && endDate) {
      // Determina se è un filtro personalizzato e aggiusta le date di conseguenza
      const isCustomFilter = !['today', 'week', 'month', '3months', 'year', 'all'].includes(filterType || '');
      
      let adjustedStartDate = startDate;
      if (isCustomFilter) {
        const startDateObj = new Date(startDate);
        startDateObj.setDate(startDateObj.getDate() + 1);
        adjustedStartDate = startDateObj.toISOString().split('T')[0];
        console.log(`Device: Adjusted start date for custom filter: ${startDate} -> ${adjustedStartDate}`);
      }
      
      // Convertiamo le date per il filtro temporale
      const startTimeUTC = new Date(adjustedStartDate).toISOString();
      const endTimeUTC = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000).toISOString();
      
      query = sql<DeviceData>`
        WITH total_clicks AS (
          SELECT COUNT(*) as total
          FROM enhanced_fingerprints ef
          JOIN links l ON ef.link_id = l.id
          WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
          AND (ef.created_at AT TIME ZONE 'Europe/Rome') >= ${startTimeUTC}::timestamptz 
          AND (ef.created_at AT TIME ZONE 'Europe/Rome') < ${endTimeUTC}::timestamptz
        )
        SELECT 
          ef.device_category as device_type, 
          COUNT(*) as clicks,
          COALESCE(ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1), 0) as percentage
        FROM enhanced_fingerprints ef
        JOIN links l ON ef.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        AND (ef.created_at AT TIME ZONE 'Europe/Rome') >= ${startTimeUTC}::timestamptz 
        AND (ef.created_at AT TIME ZONE 'Europe/Rome') < ${endTimeUTC}::timestamptz
        GROUP BY ef.device_category
        ORDER BY clicks DESC
      `;
    } else {
      query = sql<DeviceData>`
        WITH total_clicks AS (
          SELECT COUNT(*) as total
          FROM enhanced_fingerprints ef
          JOIN links l ON ef.link_id = l.id
          WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        )
        SELECT 
          ef.device_category as device_type, 
          COUNT(*) as clicks,
          COALESCE(ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1), 0) as percentage
        FROM enhanced_fingerprints ef
        JOIN links l ON ef.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        GROUP BY ef.device_category
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

async function getFilteredBrowserData(userId: string, workspaceId: string, shortCode: string, startDate?: string, endDate?: string, filterType?: string): Promise<BrowserData[]> {
  try {
    let query;
    if (startDate && endDate) {
      // Determina se è un filtro personalizzato e aggiusta le date di conseguenza
      const isCustomFilter = !['today', 'week', 'month', '3months', 'year', 'all'].includes(filterType || '');
      
      let adjustedStartDate = startDate;
      if (isCustomFilter) {
        const startDateObj = new Date(startDate);
        startDateObj.setDate(startDateObj.getDate() + 1);
        adjustedStartDate = startDateObj.toISOString().split('T')[0];
        console.log(`Browser: Adjusted start date for custom filter: ${startDate} -> ${adjustedStartDate}`);
      }
      
      // Convertiamo le date per il filtro temporale
      const startTimeUTC = new Date(adjustedStartDate).toISOString();
      const endTimeUTC = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000).toISOString();
      
      query = sql<BrowserData>`
        WITH total_clicks AS (
          SELECT COUNT(*) as total
          FROM enhanced_fingerprints ef
          JOIN links l ON ef.link_id = l.id
          WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
          AND (ef.created_at AT TIME ZONE 'Europe/Rome') >= ${startTimeUTC}::timestamptz 
          AND (ef.created_at AT TIME ZONE 'Europe/Rome') < ${endTimeUTC}::timestamptz
        )
        SELECT 
          ef.browser_type as browser_name, 
          COUNT(*) as clicks,
          COALESCE(ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1), 0) as percentage
        FROM enhanced_fingerprints ef
        JOIN links l ON ef.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        AND (ef.created_at AT TIME ZONE 'Europe/Rome') >= ${startTimeUTC}::timestamptz 
        AND (ef.created_at AT TIME ZONE 'Europe/Rome') < ${endTimeUTC}::timestamptz
        GROUP BY ef.browser_type
        ORDER BY clicks DESC
        LIMIT 10
      `;
    } else {
      query = sql<BrowserData>`
        WITH total_clicks AS (
          SELECT COUNT(*) as total
          FROM enhanced_fingerprints ef
          JOIN links l ON ef.link_id = l.id
          WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        )
        SELECT 
          ef.browser_type as browser_name, 
          COUNT(*) as clicks,
          COALESCE(ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_clicks), 0)), 1), 0) as percentage
        FROM enhanced_fingerprints ef
        JOIN links l ON ef.link_id = l.id
        WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
        GROUP BY ef.browser_type
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

async function getFilteredReferrerData(userId: string, workspaceId: string, shortCode: string, startDate?: string, endDate?: string, filterType?: string): Promise<ReferrerData[]> {
  try {
    let query;
    if (startDate && endDate) {
      // Determina se è un filtro personalizzato e aggiusta le date di conseguenza
      const isCustomFilter = !['today', 'week', 'month', '3months', 'year', 'all'].includes(filterType || '');
      
      let adjustedStartDate = startDate;
      if (isCustomFilter) {
        const startDateObj = new Date(startDate);
        startDateObj.setDate(startDateObj.getDate() + 1);
        adjustedStartDate = startDateObj.toISOString().split('T')[0];
        console.log(`Referrer: Adjusted start date for custom filter: ${startDate} -> ${adjustedStartDate}`);
      }
      
      // Convertiamo le date per il filtro temporale
      const startTimeUTC = new Date(adjustedStartDate).toISOString();
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
      
      // Se è stato specificato startDate, dobbiamo usare quella invece della data di creazione
      if (startDate) {
        // Formatta correttamente la data di inizio per garantire la corrispondenza esatta
        const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
        console.log(`Using "all" filter with specific start date: ${formattedStartDate}`);
        
        const { rows } = await sql<TimeSeriesData>`
          WITH date_series AS (
            SELECT generate_series(
              ${formattedStartDate}::date,
              (NOW() AT TIME ZONE 'Europe/Rome')::date,
              INTERVAL '1 day'
            )::date AS date
          ),
          daily_clicks AS (
            SELECT 
              ef.created_at::date as date,
              COUNT(ef.id) as total_clicks,
              COUNT(DISTINCT ef.device_fingerprint) as unique_clicks
            FROM enhanced_fingerprints ef
            JOIN links l ON ef.link_id = l.id
            WHERE l.user_id = ${userId} 
              AND l.workspace_id = ${workspaceId} 
              AND l.short_code = ${shortCode}
            GROUP BY ef.created_at::date
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
      
      // Altrimenti usa la data di creazione del link
      const { rows } = await sql<TimeSeriesData>`
        WITH link_creation_date AS (
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
        date_series AS (
          SELECT generate_series(
            (SELECT creation_date FROM link_creation_date),
            (SELECT current_date FROM current_date_italy),
            INTERVAL '1 day'
          )::date AS date
        ),
        daily_clicks AS (
          SELECT 
            -- Raggruppa i click per giorno utilizzando enhanced_fingerprints
            ef.created_at::date as date,
            COUNT(ef.id) as total_clicks,
            COUNT(DISTINCT ef.device_fingerprint) as unique_clicks
          FROM enhanced_fingerprints ef
          JOIN links l ON ef.link_id = l.id
          WHERE l.user_id = ${userId} 
            AND l.workspace_id = ${workspaceId} 
            AND l.short_code = ${shortCode}
          GROUP BY ef.created_at::date
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
    // Garantisce che le date utilizzate siano esattamente quelle specificate dall'utente quando disponibili
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
      console.log(`Using custom date range filter from ${actualStartDate} to ${actualEndDate}`);
      
      // Determina se è un filtro personalizzato (non predefinito)
      const isCustomFilter = !['today', 'week', 'month', '3months', 'year', 'all'].includes(filterType || '');
      
      // Per i filtri personalizzati, aggiungi un giorno alla data di inizio per correggere il problema di visualizzazione
      let adjustedStartDate = actualStartDate;
      if (isCustomFilter && actualStartDate) {
        const startDateObj = new Date(actualStartDate);
        startDateObj.setDate(startDateObj.getDate() + 1);
        adjustedStartDate = startDateObj.toISOString().split('T')[0];
        console.log(`Adjusted start date for custom filter: ${actualStartDate} -> ${adjustedStartDate}`);
      }
      
      // Assicuriamoci che le date siano formattate correttamente
      const formattedStartDate = new Date(adjustedStartDate).toISOString().split('T')[0];
      const formattedEndDate = new Date(actualEndDate).toISOString().split('T')[0];
      
      console.log(`Formatted dates: from ${formattedStartDate} to ${formattedEndDate}`);
      
      const { rows } = await sql<TimeSeriesData>`
        WITH date_series AS (
          -- Genera serie giornaliera utilizzando esattamente le date specificate dall'utente
          -- Assicuriamoci che la prima data sia esattamente quella specificata dall'utente
          SELECT generate_series(
            ${formattedStartDate}::date,
            ${formattedEndDate}::date,
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
            -- Usiamo le date formattate per garantire la corrispondenza esatta
            AND clicked_at_rome::date >= ${formattedStartDate}::date
            AND clicked_at_rome::date <= ${formattedEndDate}::date
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

// Function to get monthly data
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
          EXTRACT(MONTH FROM ef.created_at)::integer as month_number,
          EXTRACT(YEAR FROM ef.created_at)::integer as year,
          COUNT(*)::integer as total_clicks,
          COUNT(DISTINCT ef.device_fingerprint)::integer as unique_clicks
        FROM enhanced_fingerprints ef
        JOIN links l ON ef.link_id = l.id
        WHERE l.user_id = ${userId} 
          AND l.workspace_id = ${workspaceId} 
          AND l.short_code = ${shortCode}
          AND EXTRACT(YEAR FROM ef.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY EXTRACT(MONTH FROM ef.created_at), EXTRACT(YEAR FROM ef.created_at)
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

// Function to get weekly data
async function getWeeklyData(userId: string, workspaceId: string, shortCode: string): Promise<WeeklyData[]> {
  try {
    const { rows } = await sql<WeeklyData>`
      WITH week_boundaries AS (
        -- Calcola le settimane ISO per il 2025
        -- La settimana 1 del 2025 va dal 30 dicembre 2024 al 5 gennaio 2025
        SELECT 
          week_num,
          EXTRACT(YEAR FROM CURRENT_DATE) as year,
          -- Calcola l'inizio di ogni settimana ISO
          ('2024-12-30'::date + (week_num - 1) * INTERVAL '7 days')::date as week_start,
          -- Calcola la fine di ogni settimana ISO
          ('2024-12-30'::date + (week_num - 1) * INTERVAL '7 days' + INTERVAL '6 days')::date as week_end
        FROM generate_series(1, 52) as week_num
      ),
      weekly_clicks AS (
        SELECT 
          -- Usa la settimana ISO standard di PostgreSQL
          EXTRACT(week FROM ef.created_at)::integer as week,
          EXTRACT(isoyear FROM ef.created_at)::integer as year,
          COUNT(*)::integer as total_clicks,
          COUNT(DISTINCT ef.device_fingerprint)::integer as unique_clicks
        FROM enhanced_fingerprints ef
        JOIN links l ON ef.link_id = l.id
        WHERE l.user_id = ${userId} 
          AND l.workspace_id = ${workspaceId} 
          AND l.short_code = ${shortCode}
          -- Filtra per l'anno ISO 2025 (che include i click dal 30-12-2024)
          AND EXTRACT(isoyear FROM ef.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY 
          EXTRACT(week FROM ef.created_at), 
          EXTRACT(isoyear FROM ef.created_at)
      )
      SELECT 
        wb.week_num::integer as week,
        wb.year::integer,
        wb.week_start::text,
        wb.week_end::text,
        COALESCE(wc.total_clicks, 0) as total_clicks,
        COALESCE(wc.unique_clicks, 0) as unique_clicks
      FROM week_boundaries wb
      LEFT JOIN weekly_clicks wc ON wb.week_num = wc.week AND wb.year = wc.year
      ORDER BY wb.week_num
    `;
    return rows || [];
  } catch (error) {
    console.error("Failed to fetch weekly data:", error);
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
    const [linkData, clickAnalytics, geographicData, deviceData, browserData, referrerData, timeSeriesData, monthlyData, weeklyData] = await Promise.all([
      getLinkData(session.userId, session.workspaceId, shortCode),
      getFilteredClickAnalytics(session.userId, session.workspaceId, shortCode, startDate, endDate, filterType),
      getFilteredGeographicData(session.userId, session.workspaceId, shortCode, startDate, endDate, filterType),
      getFilteredDeviceData(session.userId, session.workspaceId, shortCode, startDate, endDate, filterType),
      getFilteredBrowserData(session.userId, session.workspaceId, shortCode, startDate, endDate, filterType),
      getFilteredReferrerData(session.userId, session.workspaceId, shortCode, startDate, endDate, filterType),
      getFilteredTimeSeriesData(session.userId, session.workspaceId, shortCode, startDate, endDate, filterType),
      getMonthlyData(session.userId, session.workspaceId, shortCode),
      getWeeklyData(session.userId, session.workspaceId, shortCode)
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
