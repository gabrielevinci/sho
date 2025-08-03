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
        query = `
          WITH series AS (
            SELECT generate_series(
              DATE_TRUNC('hour', NOW() - INTERVAL '23 hours'),
              DATE_TRUNC('hour', NOW()),
              '1 hour'
            ) AS ora
          )
          SELECT
            s.ora AT TIME ZONE 'Europe/Rome' AS ora_italiana,
            COALESCE(COUNT(c.id), 0) AS click_totali,
            COALESCE(COUNT(DISTINCT c.click_fingerprint_hash), 0) AS click_unici
          FROM
            series s
          LEFT JOIN
            clicks c ON DATE_TRUNC('hour', c.clicked_at_rome AT TIME ZONE 'Europe/Rome') = s.ora
                     AND c.link_id = $1
          GROUP BY
            s.ora
          ORDER BY
            s.ora ASC;
        `;
        queryParams = [linkId];
        break;

      case '7d':
        query = `
          WITH series AS (
            SELECT generate_series(
              (NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '6 days')::date,
              (NOW() AT TIME ZONE 'Europe/Rome')::date,
              '1 day'
            ) AS data
          )
          SELECT
            s.data AS data_italiana,
            COALESCE(COUNT(c.id), 0) AS click_totali,
            COALESCE(COUNT(DISTINCT c.click_fingerprint_hash), 0) AS click_unici
          FROM
            series s
          LEFT JOIN
            clicks c ON DATE(c.clicked_at_rome) = s.data
                     AND c.link_id = $1
          GROUP BY
            s.data
          ORDER BY
            s.data ASC;
        `;
        queryParams = [linkId];
        break;

      case '30d':
        query = `
          WITH series AS (
            SELECT generate_series(
              (NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '29 days')::date,
              (NOW() AT TIME ZONE 'Europe/Rome')::date,
              '1 day'
            ) AS data
          )
          SELECT
            s.data AS data_italiana,
            COALESCE(COUNT(c.id), 0) AS click_totali,
            COALESCE(COUNT(DISTINCT c.click_fingerprint_hash), 0) AS click_unici
          FROM
            series s
          LEFT JOIN
            clicks c ON DATE(c.clicked_at_rome) = s.data
                     AND c.link_id = $1
          GROUP BY
            s.data
          ORDER BY
            s.data ASC;
        `;
        queryParams = [linkId];
        break;

      case '90d':
        query = `
          WITH series AS (
            SELECT generate_series(
              (NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '89 days')::date,
              (NOW() AT TIME ZONE 'Europe/Rome')::date,
              '1 day'
            ) AS data
          )
          SELECT
            s.data AS data_italiana,
            COALESCE(COUNT(c.id), 0) AS click_totali,
            COALESCE(COUNT(DISTINCT c.click_fingerprint_hash), 0) AS click_unici
          FROM
            series s
          LEFT JOIN
            clicks c ON DATE(c.clicked_at_rome) = s.data
                     AND c.link_id = $1
          GROUP BY
            s.data
          ORDER BY
            s.data ASC;
        `;
        queryParams = [linkId];
        break;

      case '365d':
        query = `
          WITH series AS (
            SELECT generate_series(
              (NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '364 days')::date,
              (NOW() AT TIME ZONE 'Europe/Rome')::date,
              '1 day'
            ) AS data
          )
          SELECT
            s.data AS data_italiana,
            COALESCE(COUNT(c.id), 0) AS click_totali,
            COALESCE(COUNT(DISTINCT c.click_fingerprint_hash), 0) AS click_unici
          FROM
            series s
          LEFT JOIN
            clicks c ON DATE(c.clicked_at_rome) = s.data
                     AND c.link_id = $1
          GROUP BY
            s.data
          ORDER BY
            s.data ASC;
        `;
        queryParams = [linkId];
        break;

      case 'all':
        // Per il filtro "all", utilizziamo i dati dalla tabella statistiche_link quando disponibile
        // per essere coerenti con l'API esistente e le card delle statistiche
        try {
          const statsCheck = await sql`
            SELECT 
              COALESCE(click_totali_sempre, 0) as total_from_stats,
              COALESCE(click_unici_sempre, 0) as unique_from_stats
            FROM statistiche_link 
            WHERE link_id = ${linkId}
          `;
          
          if (statsCheck.rowCount && statsCheck.rowCount > 0) {
            const statsData = statsCheck.rows[0];
            console.log(`📊 Utilizzo dati da statistiche_link: ${statsData.total_from_stats} click totali, ${statsData.unique_from_stats} click unici`);
            
            // Se abbiamo dati da statistiche_link, generiamo una distribuzione temporale
            // basata sui dati reali ma normalizzata per corrispondere al totale
            // IMPORTANTE: Generiamo una serie completa dalla creazione ad oggi
            const fullTimelineQuery = await sql`
              WITH date_series AS (
                SELECT generate_series(
                  (SELECT DATE(created_at AT TIME ZONE 'Europe/Rome') FROM links WHERE id = ${linkId}),
                  (NOW() AT TIME ZONE 'Europe/Rome')::date,
                  '1 day'
                ) AS data_italiana
              ),
              clicks_by_date AS (
                SELECT
                  DATE(clicked_at_rome) AS data_italiana,
                  COUNT(*) AS click_totali_raw,
                  COUNT(DISTINCT click_fingerprint_hash) AS click_unici_raw
                FROM clicks
                WHERE link_id = ${linkId}
                GROUP BY DATE(clicked_at_rome)
              )
              SELECT
                ds.data_italiana,
                COALESCE(cbd.click_totali_raw, 0) AS click_totali_raw,
                COALESCE(cbd.click_unici_raw, 0) AS click_unici_raw
              FROM date_series ds
              LEFT JOIN clicks_by_date cbd ON ds.data_italiana = cbd.data_italiana
              ORDER BY ds.data_italiana ASC
            `;
            
            if (fullTimelineQuery.rowCount && fullTimelineQuery.rowCount > 0) {
              // Calcola il fattore di correzione per normalizzare ai dati di statistiche_link
              const rawTotal = fullTimelineQuery.rows.reduce((sum: number, row: any) => sum + parseInt(row.click_totali_raw || 0), 0);
              const correctionFactor = rawTotal > 0 ? statsData.total_from_stats / rawTotal : 1;
              
              console.log(`📊 Serie temporale completa generata: ${fullTimelineQuery.rows.length} giorni dalla creazione`);
              console.log(`📊 Fattore di correzione applicato: ${correctionFactor} (da ${rawTotal} a ${statsData.total_from_stats})`);
              
              // Applica il fattore di correzione ai dati giornalieri
              const correctedData = fullTimelineQuery.rows.map((row: any) => ({
                data_italiana: row.data_italiana,
                click_totali: Math.round(parseInt(row.click_totali_raw || 0) * correctionFactor),
                click_unici: parseInt(row.click_unici_raw || 0) // Click unici non vengono corretti
              }));
              
              return NextResponse.json(correctedData);
            }
          }
        } catch (error) {
          console.log('⚠️ Fallback su calcolo diretto da clicks:', error);
        }

        // Fallback: calcolo diretto dalla tabella clicks con serie temporale completa
        query = `
          WITH series AS (
            SELECT generate_series(
              (SELECT DATE(created_at AT TIME ZONE 'Europe/Rome') FROM links WHERE id = $1),
              (NOW() AT TIME ZONE 'Europe/Rome')::date,
              '1 day'
            ) AS data
          )
          SELECT
            s.data AS data_italiana,
            COALESCE(COUNT(c.id), 0) AS click_totali,
            COALESCE(COUNT(DISTINCT c.click_fingerprint_hash), 0) AS click_unici
          FROM
            series s
          LEFT JOIN
            clicks c ON DATE(c.clicked_at_rome) = s.data
                     AND c.link_id = $1
          GROUP BY
            s.data
          ORDER BY
            s.data ASC;
        `;
        queryParams = [linkId];
        break;

      case 'custom':
        query = `
          WITH series AS (
            SELECT generate_series(
              $2::date,
              $3::date,
              '1 day'
            ) AS data
          )
          SELECT
            s.data AS data_italiana,
            COALESCE(COUNT(c.id), 0) AS click_totali,
            COALESCE(COUNT(DISTINCT c.click_fingerprint_hash), 0) AS click_unici
          FROM
            series s
          LEFT JOIN
            clicks c ON DATE(c.clicked_at_rome) = s.data
                     AND c.link_id = $1
          GROUP BY
            s.data
          ORDER BY
            s.data ASC;
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

    // Restituisci i risultati
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
