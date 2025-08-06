import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/app/lib/session';

interface StatsParams {
  params: Promise<{
    shortCode: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: StatsParams
) {
  try {
    // Verifica autenticazione
    const session = await getSession();
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Estrai lo shortCode dai parametri
    const { shortCode } = await params;
    
    // Prima ottieni l'ID del link dallo shortCode e verifica che appartenga all'utente
    const linkResult = await sql`
      SELECT id FROM links 
      WHERE short_code = ${shortCode} AND user_id = ${session.userId}
    `;

    if (linkResult.rowCount === 0) {
      return NextResponse.json({ error: 'Link non trovato' }, { status: 404 });
    }

    const linkId = linkResult.rows[0].id;

    // Estrai i parametri di query
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    
    // Valida che il parametro filter sia presente e valido
    if (!filter) {
      return NextResponse.json(
        { error: 'Missing filter parameter' },
        { status: 400 }
      );
    }

    const validFilters = ['24h', '7d', '30d', '90d', '365d', 'all', 'custom'];
    if (!validFilters.includes(filter)) {
      return NextResponse.json(
        { error: 'Invalid filter parameter. Allowed values: 24h, 7d, 30d, 90d, 365d, all, custom' },
        { status: 400 }
      );
    }

    // Per il filtro custom, valida i parametri startDate e endDate
    let startDate: string | null = null;
    let endDate: string | null = null;
    
    if (filter === 'custom') {
      startDate = searchParams.get('startDate');
      endDate = searchParams.get('endDate');
      
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'Missing startDate or endDate parameters for custom filter' },
          { status: 400 }
        );
      }

      // Valida formato delle date (ISO string o YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD format' },
          { status: 400 }
        );
      }
    }

    // Determina la query SQL da eseguire basandosi sul filtro
    let query: string;
    let queryParams: (number | string)[];

    switch (filter) {
      case '24h':
        // Approccio UTC: tutto in UTC, conversione solo per visualizzazione
        const nowUTC = new Date();
        
        // Calcola l'offset dell'ora italiana dinamicamente
        const italianTime = new Date(nowUTC.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
        const utcTime = new Date(nowUTC.toLocaleString("en-US", {timeZone: "UTC"}));
        const offsetMs = italianTime.getTime() - utcTime.getTime();
        
        // Calcola l'ora corrente italiana convertendo da UTC
        const currentHourItalyUTC = new Date(nowUTC.getTime() + offsetMs);
        currentHourItalyUTC.setMinutes(0, 0, 0); // Tronca ai minuti
        
        // Converte di nuovo in UTC per la query (ora rappresenta l'ora italiana ma in UTC)
        const queryBaseTime = new Date(currentHourItalyUTC.getTime() - offsetMs);
        
        console.log(`🕐 UTC-based calculation:`);
        console.log(`🕐 Server UTC time: ${nowUTC.toISOString()}`);
        console.log(`🕐 Italian offset: ${offsetMs/1000/60/60} hours`);
        console.log(`🕐 Italian hour (UTC adjusted): ${currentHourItalyUTC.toISOString()}`);
        console.log(`🕐 Query base time (UTC): ${queryBaseTime.toISOString()}`);
        
        query = `
          WITH clicks_ranked_globally AS (
            SELECT
              id,
              clicked_at_rome,
              click_fingerprint_hash,
              ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
            FROM
              clicks
            WHERE
              link_id = $1
          )
          SELECT
            -- Restituiamo timestamp UTC che il client convertirà per la visualizzazione
            serie_oraria.ora AT TIME ZONE 'UTC' AS ora_italiana,
            COALESCE(COUNT(cr.id), 0) AS click_totali,
            COALESCE(SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END), 0) AS click_unici,
            -- Indica se questa è l'ora corrente (confronto in UTC)
            CASE 
              WHEN serie_oraria.ora = $2::timestamp
              THEN true 
              ELSE false 
            END AS is_current_hour
          FROM
            generate_series(
              $2::timestamp - INTERVAL '23 hours',
              $2::timestamp,
              '1 hour'
            ) AS serie_oraria(ora)
          LEFT JOIN
            clicks_ranked_globally cr ON DATE_TRUNC('hour', cr.clicked_at_rome) = serie_oraria.ora
            AND cr.clicked_at_rome >= ($2::timestamp - INTERVAL '24 hours')
          GROUP BY
            serie_oraria.ora
          ORDER BY
            serie_oraria.ora ASC;
        `;
        queryParams = [linkId, queryBaseTime.toISOString()];
        break;

      case '7d':
        query = `
          WITH clicks_ranked AS (
            SELECT
              id,
              clicked_at_rome,
              click_fingerprint_hash,
              ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
            FROM
              clicks
            WHERE
              link_id = $1 AND
              clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '6 days')::date
          )
          SELECT
            serie_giornaliera.giorno AS data_italiana,
            COALESCE(COUNT(cr.id), 0) AS click_totali,
            COALESCE(SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END), 0) AS click_unici
          FROM
            generate_series(
              DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '6 days'),
              DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome'),
              '1 day'
            ) AS serie_giornaliera(giorno)
          LEFT JOIN
            clicks_ranked cr ON DATE_TRUNC('day', cr.clicked_at_rome) = serie_giornaliera.giorno
          GROUP BY
            serie_giornaliera.giorno
          ORDER BY
            serie_giornaliera.giorno ASC;
        `;
        queryParams = [linkId];
        break;

      case '30d':
        query = `
          WITH clicks_ranked AS (
            SELECT
              id,
              clicked_at_rome,
              click_fingerprint_hash,
              ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
            FROM
              clicks
            WHERE
              link_id = $1 AND
              clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '29 days')::date
          )
          SELECT
            serie_giornaliera.giorno AS data_italiana,
            COALESCE(COUNT(cr.id), 0) AS click_totali,
            COALESCE(SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END), 0) AS click_unici
          FROM
            generate_series(
              DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '29 days'),
              DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome'),
              '1 day'
            ) AS serie_giornaliera(giorno)
          LEFT JOIN
            clicks_ranked cr ON DATE_TRUNC('day', cr.clicked_at_rome) = serie_giornaliera.giorno
          GROUP BY
            serie_giornaliera.giorno
          ORDER BY
            serie_giornaliera.giorno ASC;
        `;
        queryParams = [linkId];
        break;

      case '90d':
        query = `
          WITH clicks_ranked AS (
            SELECT
              id,
              clicked_at_rome,
              click_fingerprint_hash,
              ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
            FROM
              clicks
            WHERE
              link_id = $1 AND
              clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '89 days')::date
          )
          SELECT
            serie_giornaliera.giorno AS data_italiana,
            COALESCE(COUNT(cr.id), 0) AS click_totali,
            COALESCE(SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END), 0) AS click_unici
          FROM
            generate_series(
              DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '89 days'),
              DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome'),
              '1 day'
            ) AS serie_giornaliera(giorno)
          LEFT JOIN
            clicks_ranked cr ON DATE_TRUNC('day', cr.clicked_at_rome) = serie_giornaliera.giorno
          GROUP BY
            serie_giornaliera.giorno
          ORDER BY
            serie_giornaliera.giorno ASC;
        `;
        queryParams = [linkId];
        break;

      case '365d':
        query = `
          WITH clicks_ranked AS (
            SELECT
              id,
              clicked_at_rome,
              click_fingerprint_hash,
              ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
            FROM
              clicks
            WHERE
              link_id = $1 AND
              clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '364 days')::date
          )
          SELECT
            serie_giornaliera.giorno AS data_italiana,
            COALESCE(COUNT(cr.id), 0) AS click_totali,
            COALESCE(SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END), 0) AS click_unici
          FROM
            generate_series(
              DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '364 days'),
              DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome'),
              '1 day'
            ) AS serie_giornaliera(giorno)
          LEFT JOIN
            clicks_ranked cr ON DATE_TRUNC('day', cr.clicked_at_rome) = serie_giornaliera.giorno
          GROUP BY
            serie_giornaliera.giorno
          ORDER BY
            serie_giornaliera.giorno ASC;
        `;
        queryParams = [linkId];
        break;

      case 'all':
        // Filtro "sempre" con logica avanzata per click unici accurati
        query = `
          WITH ranked_clicks AS (
            SELECT
              clicked_at_rome,
              click_fingerprint_hash,
              ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
            FROM
              clicks
            WHERE
              link_id = $1
          ),
          daily_stats AS (
            SELECT
              DATE_TRUNC('day', clicked_at_rome) AS click_day,
              COUNT(*) AS total_clicks,
              COUNT(*) FILTER (WHERE rn = 1) AS unique_clicks
            FROM
              ranked_clicks
            GROUP BY
              click_day
          )
          SELECT
            serie.giorno AS data_italiana,
            COALESCE(ds.total_clicks, 0) AS click_totali,
            COALESCE(ds.unique_clicks, 0) AS click_unici
          FROM
            generate_series(
              (SELECT COALESCE(DATE_TRUNC('day', MIN(clicked_at_rome)), (SELECT DATE(created_at AT TIME ZONE 'Europe/Rome') FROM links WHERE id = $1)) FROM clicks WHERE link_id = $1),
              DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Rome'),
              '1 day'
            ) AS serie(giorno)
          LEFT JOIN
            daily_stats ds ON serie.giorno = ds.click_day
          ORDER BY
            serie.giorno ASC;
        `;
        queryParams = [linkId];
        break;

      case 'custom':
        query = `
          WITH all_clicks_ranked AS (
            SELECT
              clicked_at_rome,
              click_fingerprint_hash,
              ROW_NUMBER() OVER(PARTITION BY click_fingerprint_hash ORDER BY clicked_at_rome ASC) as rn
            FROM
              clicks
            WHERE
              link_id = $1
          ),
          clicks_in_range AS (
            SELECT
              clicked_at_rome,
              click_fingerprint_hash,
              rn
            FROM
              all_clicks_ranked
            WHERE
              clicked_at_rome >= $2::date 
              AND clicked_at_rome < ($3::date + INTERVAL '1 day')
          ),
          daily_stats AS (
            SELECT
              DATE_TRUNC('day', clicked_at_rome) AS click_day,
              COUNT(*) AS total_clicks,
              COUNT(*) FILTER (WHERE rn = 1) AS unique_clicks
            FROM
              clicks_in_range
            GROUP BY
              click_day
          )
          SELECT
            serie.giorno AS data_italiana,
            COALESCE(ds.total_clicks, 0) AS click_totali,
            COALESCE(ds.unique_clicks, 0) AS click_unici
          FROM
            generate_series(
              $2::date,
              $3::date,
              '1 day'
            ) AS serie(giorno)
          LEFT JOIN
            daily_stats ds ON serie.giorno = ds.click_day
          ORDER BY
            serie.giorno ASC;
        `;
        queryParams = [linkId, startDate!, endDate!];
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid filter parameter' },
          { status: 400 }
        );
    }

    // Esegui la query con parametri
    const { rows } = await sql.query(query, queryParams);

    console.log(`🕐 Raw database rows for filter ${filter}:`, rows.length > 0 ? rows[0] : 'No data');

    // Per il filtro 24h, non facciamo alcuna trasformazione dei timestamp
    // I timestamp dal database sono già corretti (clicked_at_rome è già in ora italiana)
    return NextResponse.json(rows, { status: 200 });

  } catch (error) {
    console.error('Error fetching link stats:', error);
    
    // Gestisci errori specifici del database
    if (error instanceof Error) {
      // Se è un errore di sintassi SQL o di connessione
      if (error.message.includes('syntax error') || 
          error.message.includes('connection') ||
          error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Database query failed' },
          { status: 500 }
        );
      }
      
      // Se è un errore di constraint o di tabella non esistente
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Required database tables not found' },
          { status: 500 }
        );
      }
    }

    // Errore generico del server
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
