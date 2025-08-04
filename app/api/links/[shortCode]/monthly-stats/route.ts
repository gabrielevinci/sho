import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/app/lib/session';

interface MonthlyStatsParams {
  params: Promise<{
    shortCode: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: MonthlyStatsParams
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
    const year = searchParams.get('year');
    
    // Valida che il parametro year sia presente e valido
    if (!year) {
      return NextResponse.json(
        { error: 'Missing year parameter' },
        { status: 400 }
      );
    }

    const yearNumber = parseInt(year);
    if (isNaN(yearNumber) || yearNumber < 2020 || yearNumber > 2030) {
      return NextResponse.json(
        { error: 'Invalid year parameter. Must be between 2020 and 2030' },
        { status: 400 }
      );
    }

    // Query SQL per le statistiche mensili
    const query = `
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
      monthly_stats AS (
        SELECT
          DATE_TRUNC('month', clicked_at_rome) AS click_month,
          COUNT(*) AS total_clicks,
          COUNT(*) FILTER (WHERE rn = 1) AS unique_clicks
        FROM
          ranked_clicks
        WHERE
          EXTRACT(YEAR FROM clicked_at_rome) = $2
        GROUP BY
          click_month
      )
      SELECT
        TO_CHAR(serie.mese, 'YYYY-MM') AS mese,
        COALESCE(ms.total_clicks, 0) AS numero_di_click,
        COALESCE(ms.unique_clicks, 0) AS numero_di_click_unici
      FROM
        generate_series(
          ($2 || '-01-01')::date,
          ($2 || '-12-01')::date,
          '1 month'
        ) AS serie(mese)
      LEFT JOIN
        monthly_stats ms ON serie.mese = ms.click_month
      ORDER BY
        serie.mese ASC;
    `;

    // Esegui la query con parametri
    const { rows } = await sql.query(query, [linkId, yearNumber]);

    // Restituisci i risultati
    return NextResponse.json(rows, { status: 200 });

  } catch (error) {
    console.error('Error fetching monthly stats:', error);
    
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
