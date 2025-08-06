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
        // Calcola l'ora corrente italiana in JavaScript per essere sicuri
        const now = new Date();
        const italianTime = new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'Europe/Rome',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).format(now);
        
        // Tronca all'ora (rimuovi minuti e secondi)
        const currentHourItaly = italianTime.substring(0, 13) + ':00:00';
        
        console.log(`🕐 Server time calculation - Raw now: ${now.toISOString()}, Italy formatted: ${italianTime}, Current hour Italy: ${currentHourItaly}`);
        
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
            serie_oraria.ora AS ora_italiana,
            COALESCE(COUNT(cr.id), 0) AS click_totali,
            COALESCE(SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END), 0) AS click_unici,
            -- Indica se questa è l'ora corrente
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
        queryParams = [linkId, currentHourItaly];
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

    // Formatta i risultati per garantire consistenza del fuso orario
    const formattedRows = rows.map(row => {
      const formattedRow = { ...row };
      
      // Per il filtro 24h, assicuriamoci che il timestamp sia interpretato correttamente
      if (filter === '24h' && row.ora_italiana) {
        // Forza il timestamp nel formato ISO con timezone italiano esplicito
        const date = new Date(row.ora_italiana);
        
        // Formatta usando l'ora italiana e aggiungi timezone esplicito
        const italianTimeStr = new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'Europe/Rome',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).format(date);
        
        // Per agosto 2025, forziamo l'ora legale italiana (CEST = UTC+2)
        // In futuro, questo potrebbe essere reso dinamico, ma per ora risolviamo il problema specifico
        const currentDate = new Date();
        const month = currentDate.getMonth() + 1; // getMonth() è 0-based
        
        // Da marzo a ottobre l'Italia è in ora legale (CEST = UTC+2)
        // Da novembre a febbraio è in ora solare (CET = UTC+1)
        const isDST = month >= 3 && month <= 10;
        const timezone = isDST ? '+02:00' : '+01:00';
        
        formattedRow.ora_italiana = italianTimeStr + timezone;
        
        console.log(`🕐 Month: ${month}, DST: ${isDST}, Timezone: ${timezone}`);
        console.log(`🕐 Formatted timestamp: ${row.ora_italiana} -> ${formattedRow.ora_italiana}`);
      }
      
      return formattedRow;
    });

    // Restituisci i risultati formattati
    return NextResponse.json(formattedRows, { status: 200 });

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
