import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/app/lib/session';

interface WeeklyStatsParams {
  params: Promise<{
    shortCode: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: WeeklyStatsParams
) {
  try {
    // Verifica autenticazione
    const session = await getSession();
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Await the params Promise
    const { shortCode } = await params;
    
    console.log('🔍 [weekly-stats] Inizio richiesta per shortCode:', shortCode);

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

    console.log('✅ [weekly-stats] Link trovato con ID:', linkId, 'per anno:', yearNumber);

    // Query SQL per le statistiche settimanali
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
      weekly_stats AS (
          SELECT
              DATE_TRUNC('week', clicked_at_rome) AS click_week,
              COUNT(*) AS total_clicks,
              COUNT(*) FILTER (WHERE rn = 1) AS unique_clicks
          FROM
              ranked_clicks
          WHERE
              EXTRACT(ISOYEAR FROM clicked_at_rome) = $2
          GROUP BY
              click_week
      )
      SELECT
          TO_CHAR(serie.settimana, 'IYYY-IW') AS settimana,
          TO_CHAR(serie.settimana, 'YYYY-MM-DD') AS inizio_settimana,
          TO_CHAR(serie.settimana + INTERVAL '6 days', 'YYYY-MM-DD') AS fine_settimana,
          COALESCE(ws.total_clicks, 0) AS numero_di_click,
          COALESCE(ws.unique_clicks, 0) AS numero_di_click_unici
      FROM
          generate_series(
              DATE_TRUNC('week', ($2 || '-01-04')::date),
              DATE_TRUNC('week', ($2 || '-12-28')::date),
              '1 week'
          ) AS serie(settimana)
      LEFT JOIN
          weekly_stats ws ON serie.settimana = ws.click_week
      ORDER BY
          serie.settimana ASC;
    `;

    console.log('🔍 [weekly-stats] Esecuzione query settimanale...');
    
    // Esegui la query con parametri
    const { rows } = await sql.query(query, [linkId, yearNumber]);
    
    console.log('📊 [weekly-stats] Risultati trovati:', rows.length);
    console.log('📊 [weekly-stats] Primi 3 risultati:', rows.slice(0, 3));

    // Restituisci i risultati
    return NextResponse.json(rows, { status: 200 });
    
  } catch (error) {
    console.error('❌ [weekly-stats] Errore durante il recupero delle statistiche settimanali:', error);
    
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
