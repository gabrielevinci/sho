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
              clicked_at_rome >= NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '23 hours'
          )
          SELECT
            serie_oraria.ora AS ora_italiana,
            COALESCE(COUNT(cr.id), 0) AS click_totali,
            COALESCE(SUM(CASE WHEN cr.rn = 1 THEN 1 ELSE 0 END), 0) AS click_unici
          FROM
            generate_series(
              DATE_TRUNC('hour', NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '23 hours'),
              DATE_TRUNC('hour', NOW() AT TIME ZONE 'Europe/Rome'),
              '1 hour'
            ) AS serie_oraria(ora)
          LEFT JOIN
            clicks_ranked cr ON DATE_TRUNC('hour', cr.clicked_at_rome) = serie_oraria.ora
          GROUP BY
            serie_oraria.ora
          ORDER BY
            serie_oraria.ora ASC;
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
        // Per il filtro "all", utilizziamo ESATTAMENTE la stessa logica delle card
        // che utilizzano click_totali_sempre dalla tabella statistiche_link
        console.log(`📊 Filtro 'all': utilizzo logica identica alle card (count di tutti i click)`);
        
        // Query IDENTICA a quella che popola click_totali_sempre in statistiche_link
        const allClicksQuery = await sql`
          SELECT
            DATE(clicked_at_rome) AS data_italiana,
            COUNT(c.id) AS click_totali,
            COUNT(DISTINCT c.click_fingerprint_hash) AS click_unici
          FROM clicks c
          WHERE c.link_id = ${linkId}
          GROUP BY DATE(clicked_at_rome)
          ORDER BY data_italiana ASC
        `;
        
        // Verifica la coerenza con statistiche_link
        try {
          const statsCheck = await sql`
            SELECT COALESCE(click_totali_sempre, 0) as total_from_stats
            FROM statistiche_link 
            WHERE link_id = ${linkId}
          `;
          
          if (statsCheck.rowCount && statsCheck.rowCount > 0) {
            const expectedTotal = statsCheck.rows[0].total_from_stats;
            const actualTotal = allClicksQuery.rows.reduce((sum: number, row: any) => sum + parseInt(row.click_totali), 0);
            console.log(`📊 Verifica coerenza: card=${expectedTotal}, grafico=${actualTotal}`);
            
            if (expectedTotal !== actualTotal) {
              console.warn(`⚠️ DISCREPANZA: Differenza di ${Math.abs(expectedTotal - actualTotal)} click tra card e grafico`);
            }
          }
        } catch (error) {
          console.log('⚠️ Impossibile verificare coerenza con statistiche_link:', error);
        }
        
        // Se ci sono dati dai click, genera la serie temporale completa
        if (allClicksQuery.rowCount && allClicksQuery.rowCount > 0) {
          // Ottieni la data di creazione del link
          const linkCreationQuery = await sql`
            SELECT DATE(created_at AT TIME ZONE 'Europe/Rome') as creation_date
            FROM links
            WHERE id = ${linkId}
          `;
          
          const creationDate = linkCreationQuery.rows[0]?.creation_date;
          if (!creationDate) {
            console.error('❌ Impossibile ottenere data di creazione del link');
            return NextResponse.json({ error: 'Errore nel recupero dei dati del link' }, { status: 500 });
          }
          
          // Genera serie temporale completa dalla creazione ad oggi
          const fullTimelineQuery = await sql`
            WITH date_series AS (
              SELECT generate_series(
                ${creationDate}::date,
                (NOW() AT TIME ZONE 'Europe/Rome')::date,
                '1 day'
              ) AS data_italiana
            ),
            clicks_by_date AS (
              SELECT
                DATE(clicked_at_rome) AS data_italiana,
                COUNT(c.id) AS click_totali,
                COUNT(DISTINCT c.click_fingerprint_hash) AS click_unici
              FROM clicks c
              WHERE c.link_id = ${linkId}
              GROUP BY DATE(clicked_at_rome)
            )
            SELECT
              ds.data_italiana,
              COALESCE(cbd.click_totali, 0) AS click_totali,
              COALESCE(cbd.click_unici, 0) AS click_unici
            FROM date_series ds
            LEFT JOIN clicks_by_date cbd ON ds.data_italiana = cbd.data_italiana
            ORDER BY ds.data_italiana ASC
          `;
          
          console.log(`📊 Serie temporale completa: ${fullTimelineQuery.rows.length} giorni dalla creazione`);
          return NextResponse.json(fullTimelineQuery.rows);
        } else {
          // Nessun click: genera serie temporale vuota dalla creazione ad oggi
          const linkCreationQuery = await sql`
            SELECT DATE(created_at AT TIME ZONE 'Europe/Rome') as creation_date
            FROM links
            WHERE id = ${linkId}
          `;
          
          const creationDate = linkCreationQuery.rows[0]?.creation_date;
          if (!creationDate) {
            console.error('❌ Impossibile ottenere data di creazione del link');
            return NextResponse.json({ error: 'Errore nel recupero dei dati del link' }, { status: 500 });
          }
          
          const emptyTimelineQuery = await sql`
            SELECT 
              generate_series(
                ${creationDate}::date,
                (NOW() AT TIME ZONE 'Europe/Rome')::date,
                '1 day'
              ) AS data_italiana,
              0 AS click_totali,
              0 AS click_unici
            ORDER BY data_italiana ASC
          `;
          
          console.log(`📊 Serie temporale vuota: ${emptyTimelineQuery.rows.length} giorni dalla creazione (nessun click)`);
          return NextResponse.json(emptyTimelineQuery.rows);
        }

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
