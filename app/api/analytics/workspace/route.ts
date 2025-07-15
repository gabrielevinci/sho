import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';
import { sql } from '@vercel/postgres';

// Funzione per ottenere le statistiche del workspace filtrate
async function getFilteredWorkspaceAnalytics(
  userId: string, 
  workspaceId: string, 
  startDate?: string, 
  endDate?: string
) {
  try {
    // Costruisco le condizioni per il filtro temporale
    let dateCondition = '';
    let dateParams: string[] = [];
    
    if (startDate && endDate) {
      dateCondition = `AND c.clicked_at >= $${3} AND c.clicked_at <= $${4}`;
      dateParams = [startDate, endDate];
    }

    const query = `
      WITH workspace_links AS (
        SELECT id, short_code, created_at FROM links 
        WHERE user_id = $1 AND workspace_id = $2
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
        WHERE 1=1 ${dateCondition}
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
           WHERE referrer != 'Direct' ${dateCondition} GROUP BY referrer ORDER BY COUNT(*) DESC LIMIT 1) as top_referrer,
          (SELECT browser_name FROM clicks c JOIN workspace_links wl ON c.link_id = wl.id 
           WHERE 1=1 ${dateCondition} GROUP BY browser_name ORDER BY COUNT(*) DESC LIMIT 1) as most_used_browser,
          (SELECT device_type FROM clicks c JOIN workspace_links wl ON c.link_id = wl.id 
           WHERE 1=1 ${dateCondition} GROUP BY device_type ORDER BY COUNT(*) DESC LIMIT 1) as most_used_device,
          (SELECT wl.short_code FROM clicks c JOIN workspace_links wl ON c.link_id = wl.id 
           WHERE 1=1 ${dateCondition} GROUP BY wl.short_code ORDER BY COUNT(*) DESC LIMIT 1) as most_clicked_link,
          (SELECT COUNT(*) FROM clicks c JOIN workspace_links wl ON c.link_id = wl.id 
           WHERE 1=1 ${dateCondition} GROUP BY wl.short_code ORDER BY COUNT(*) DESC LIMIT 1) as most_clicked_link_count
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

    const params = [userId, workspaceId, ...dateParams];
    const { rows } = await sql.query(query, params);
    
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
    console.error("Failed to fetch filtered workspace analytics:", error);
    throw error;
  }
}

// Funzione per ottenere i top link filtrati
async function getFilteredTopLinks(
  userId: string, 
  workspaceId: string, 
  limit: number = 10,
  startDate?: string, 
  endDate?: string
) {
  try {
    let dateCondition = '';
    let dateParams: string[] = [];
    
    if (startDate && endDate) {
      dateCondition = `AND c.clicked_at >= $${4} AND c.clicked_at <= $${5}`;
      dateParams = [startDate, endDate];
    }

    const query = `
      SELECT 
        l.short_code,
        l.original_url,
        l.title,
        l.created_at,
        COALESCE(COUNT(c.id), 0) as click_count,
        COALESCE(COUNT(DISTINCT c.user_fingerprint), 0) as unique_click_count
      FROM links l
      LEFT JOIN clicks c ON c.link_id = l.id ${dateCondition ? 'AND' + dateCondition.substring(3) : ''}
      WHERE l.user_id = $1 AND l.workspace_id = $2
      GROUP BY l.id, l.short_code, l.original_url, l.title, l.created_at
      ORDER BY click_count DESC, l.created_at DESC
      LIMIT $3
    `;

    const params = [userId, workspaceId, limit, ...dateParams];
    const { rows } = await sql.query(query, params);
    
    return rows.map((row: any) => ({
      short_code: row.short_code,
      original_url: row.original_url,
      title: row.title,
      created_at: row.created_at,
      click_count: Number(row.click_count),
      unique_click_count: Number(row.unique_click_count)
    }));
  } catch (error) {
    console.error("Failed to fetch filtered top links:", error);
    return [];
  }
}

// Funzione helper per costruire condizioni di data
function buildDateCondition(startDate?: string, endDate?: string, paramOffset: number = 3) {
  if (!startDate || !endDate) return { condition: '', params: [] };
  
  return {
    condition: `AND c.clicked_at >= $${paramOffset} AND c.clicked_at <= $${paramOffset + 1}`,
    params: [startDate, endDate]
  };
}

// Funzione per ottenere dati geografici filtrati
async function getFilteredGeographicData(
  userId: string, 
  workspaceId: string,
  startDate?: string, 
  endDate?: string
) {
  try {
    const dateFilter = buildDateCondition(startDate, endDate, 3);
    
    const query = `
      WITH workspace_links AS (
        SELECT id FROM links 
        WHERE user_id = $1 AND workspace_id = $2
      ),
      total_clicks AS (
        SELECT COUNT(*) as total
        FROM clicks c
        JOIN workspace_links wl ON c.link_id = wl.id
        WHERE 1=1 ${dateFilter.condition}
      )
      SELECT 
        country,
        COUNT(*) as clicks,
        (COUNT(*) * 100.0 / GREATEST(total.total, 1)) as percentage
      FROM clicks c
      JOIN workspace_links wl ON c.link_id = wl.id
      CROSS JOIN total_clicks total
      WHERE country IS NOT NULL AND country != '' ${dateFilter.condition}
      GROUP BY country, total.total
      ORDER BY clicks DESC
      LIMIT 10
    `;

    const params = [userId, workspaceId, ...dateFilter.params];
    const { rows } = await sql.query(query, params);
    
    return rows.map((row: any) => ({
      country: row.country,
      clicks: Number(row.clicks),
      percentage: Number(row.percentage)
    }));
  } catch (error) {
    console.error("Failed to fetch filtered geographic data:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Fetch tutti i dati necessari per le statistiche filtrate del workspace
    const [
      workspaceAnalytics,
      topLinks,
      geographicData
    ] = await Promise.all([
      getFilteredWorkspaceAnalytics(session.userId, session.workspaceId, startDate || undefined, endDate || undefined),
      getFilteredTopLinks(session.userId, session.workspaceId, 10, startDate || undefined, endDate || undefined),
      getFilteredGeographicData(session.userId, session.workspaceId, startDate || undefined, endDate || undefined)
    ]);

    return NextResponse.json({
      workspaceAnalytics,
      topLinks,
      geographicData
    });
  } catch (error) {
    console.error('Errore nel caricamento dei dati filtrati:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
