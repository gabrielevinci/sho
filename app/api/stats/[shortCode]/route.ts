import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Validazione UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(session.userId)) {
      console.error('Invalid userId UUID:', session.userId);
      return NextResponse.json({ error: 'ID utente non valido' }, { status: 400 });
    }

    const { shortCode } = await params;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'sempre';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Verifica che il link appartenga all'utente usando short_code invece di id
    const linkResult = await sql`
      SELECT id, original_url, title, description, created_at
      FROM links 
      WHERE short_code = ${shortCode} AND user_id = ${session.userId}
    `;

    if (linkResult.rowCount === 0) {
      return NextResponse.json({ error: 'Link non trovato' }, { status: 404 });
    }

    const link = linkResult.rows[0];

    // Calcola le statistiche in base al filtro
    let statsResult;
    
    if (filter === 'custom' && startDate && endDate) {
      // Per date personalizzate, calcola direttamente dalla tabella clicks
      statsResult = await sql`
        SELECT 
          COUNT(*) as click_totali,
          COUNT(DISTINCT click_fingerprint_hash) as click_unici,
          COUNT(DISTINCT CASE WHEN referrer != 'Direct' THEN referrer END) as referrer_count
        FROM clicks 
        WHERE link_id = ${link.id}
          AND clicked_at >= ${startDate}
          AND clicked_at <= ${endDate}
      `;
    } else {
      // Per tutti gli altri filtri, usa la tabella statistiche_link
      statsResult = await sql`
        SELECT 
          COALESCE(click_totali_sempre, 0) as click_totali_sempre,
          COALESCE(click_totali_24h, 0) as click_totali_24h,
          COALESCE(click_totali_7d, 0) as click_totali_7d,
          COALESCE(click_totali_30d, 0) as click_totali_30d,
          COALESCE(click_totali_90d, 0) as click_totali_90d,
          COALESCE(click_totali_365d, 0) as click_totali_365d,
          COALESCE(click_unici_sempre, 0) as click_unici_sempre,
          COALESCE(click_unici_24h, 0) as click_unici_24h,
          COALESCE(click_unici_7d, 0) as click_unici_7d,
          COALESCE(click_unici_30d, 0) as click_unici_30d,
          COALESCE(click_unici_90d, 0) as click_unici_90d,
          COALESCE(click_unici_365d, 0) as click_unici_365d,
          COALESCE(referrer_sempre, 0) as referrer_sempre,
          COALESCE(referrer_24h, 0) as referrer_24h,
          COALESCE(referrer_7d, 0) as referrer_7d,
          COALESCE(referrer_30d, 0) as referrer_30d,
          COALESCE(referrer_90d, 0) as referrer_90d,
          COALESCE(referrer_365d, 0) as referrer_365d
        FROM statistiche_link 
        WHERE link_id = ${link.id}
      `;
      
      // Se non ci sono dati nella tabella statistiche_link, crea un record vuoto
      if (statsResult.rowCount === 0) {
        statsResult = {
          rows: [{
            click_totali_sempre: 0, click_totali_24h: 0, click_totali_7d: 0, 
            click_totali_30d: 0, click_totali_90d: 0, click_totali_365d: 0,
            click_unici_sempre: 0, click_unici_24h: 0, click_unici_7d: 0,
            click_unici_30d: 0, click_unici_90d: 0, click_unici_365d: 0,
            referrer_sempre: 0, referrer_24h: 0, referrer_7d: 0,
            referrer_30d: 0, referrer_90d: 0, referrer_365d: 0
          }]
        };
      }
    }
    const stats = statsResult.rows[0] as Record<string, string | number>;
    
    // Helper function per convertire in numero
    const toNumber = (value: string | number): number => {
      if (typeof value === 'number') return value;
      return parseInt(String(value)) || 0;
    };
    
    // Determina i valori in base al tipo di filtro
    let clickTotali, clickUnici, referrerCount;
    
    if (filter === 'custom') {
      // Per date personalizzate, usa i campi calcolati
      clickTotali = toNumber(stats.click_totali);
      clickUnici = toNumber(stats.click_unici);
      referrerCount = toNumber(stats.referrer_count);
    } else {
      // Per filtri predefiniti, usa i campi della tabella statistiche_link
      const suffixMap: { [key: string]: string } = {
        'sempre': '_sempre',
        '24h': '_24h',
        '7d': '_7d',
        '30d': '_30d',
        '90d': '_90d',
        '365d': '_365d'
      };
      
      const suffix = suffixMap[filter] || '_sempre';
      
      clickTotali = toNumber(stats[`click_totali${suffix}`]);
      clickUnici = toNumber(stats[`click_unici${suffix}`]);
      referrerCount = toNumber(stats[`referrer${suffix}`]);
    }

    return NextResponse.json({
      link: {
        shortCode,
        originalUrl: link.original_url,
        title: link.title,
        description: link.description,
        createdAt: link.created_at
      },
      stats: {
        clickTotali,
        clickUnici,
        referrerCount
      }
    });

  } catch (error) {
    console.error('Errore durante il recupero delle statistiche:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
