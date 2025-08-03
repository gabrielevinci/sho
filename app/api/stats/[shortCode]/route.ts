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
    const mode = searchParams.get('mode'); // 'all' per recuperare tutti i dati
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
    
    // Se mode=all, restituisci tutti i dati dalla tabella statistiche_link
    if (mode === 'all') {
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
          COALESCE(referrer_365d, 0) as referrer_365d,
          COALESCE(country_sempre, 0) as country_sempre,
          COALESCE(country_24h, 0) as country_24h,
          COALESCE(country_7d, 0) as country_7d,
          COALESCE(country_30d, 0) as country_30d,
          COALESCE(country_90d, 0) as country_90d,
          COALESCE(country_365d, 0) as country_365d,
          COALESCE(city_sempre, 0) as city_sempre,
          COALESCE(city_24h, 0) as city_24h,
          COALESCE(city_7d, 0) as city_7d,
          COALESCE(city_30d, 0) as city_30d,
          COALESCE(city_90d, 0) as city_90d,
          COALESCE(city_365d, 0) as city_365d,
          COALESCE(browser_sempre, 0) as browser_sempre,
          COALESCE(browser_24h, 0) as browser_24h,
          COALESCE(browser_7d, 0) as browser_7d,
          COALESCE(browser_30d, 0) as browser_30d,
          COALESCE(browser_90d, 0) as browser_90d,
          COALESCE(browser_365d, 0) as browser_365d,
          COALESCE(lingua_sempre, 0) as lingua_sempre,
          COALESCE(lingua_24h, 0) as lingua_24h,
          COALESCE(lingua_7d, 0) as lingua_7d,
          COALESCE(lingua_30d, 0) as lingua_30d,
          COALESCE(lingua_90d, 0) as lingua_90d,
          COALESCE(lingua_365d, 0) as lingua_365d,
          COALESCE(dispositivo_sempre, 0) as dispositivo_sempre,
          COALESCE(dispositivo_24h, 0) as dispositivo_24h,
          COALESCE(dispositivo_7d, 0) as dispositivo_7d,
          COALESCE(dispositivo_30d, 0) as dispositivo_30d,
          COALESCE(dispositivo_90d, 0) as dispositivo_90d,
          COALESCE(dispositivo_365d, 0) as dispositivo_365d,
          COALESCE(sistema_operativo_sempre, 0) as sistema_operativo_sempre,
          COALESCE(sistema_operativo_24h, 0) as sistema_operativo_24h,
          COALESCE(sistema_operativo_7d, 0) as sistema_operativo_7d,
          COALESCE(sistema_operativo_30d, 0) as sistema_operativo_30d,
          COALESCE(sistema_operativo_90d, 0) as sistema_operativo_90d,
          COALESCE(sistema_operativo_365d, 0) as sistema_operativo_365d
        FROM statistiche_link 
        WHERE link_id = ${link.id}
      `;
      
      // Se non ci sono dati, crea un record vuoto
      if (statsResult.rowCount === 0) {
        const emptyStats = {
          click_totali_sempre: 0, click_totali_24h: 0, click_totali_7d: 0,
          click_totali_30d: 0, click_totali_90d: 0, click_totali_365d: 0,
          click_unici_sempre: 0, click_unici_24h: 0, click_unici_7d: 0,
          click_unici_30d: 0, click_unici_90d: 0, click_unici_365d: 0,
          referrer_sempre: 0, referrer_24h: 0, referrer_7d: 0,
          referrer_30d: 0, referrer_90d: 0, referrer_365d: 0,
          country_sempre: 0, country_24h: 0, country_7d: 0,
          country_30d: 0, country_90d: 0, country_365d: 0,
          city_sempre: 0, city_24h: 0, city_7d: 0,
          city_30d: 0, city_90d: 0, city_365d: 0,
          browser_sempre: 0, browser_24h: 0, browser_7d: 0,
          browser_30d: 0, browser_90d: 0, browser_365d: 0,
          lingua_sempre: 0, lingua_24h: 0, lingua_7d: 0,
          lingua_30d: 0, lingua_90d: 0, lingua_365d: 0,
          dispositivo_sempre: 0, dispositivo_24h: 0, dispositivo_7d: 0,
          dispositivo_30d: 0, dispositivo_90d: 0, dispositivo_365d: 0,
          sistema_operativo_sempre: 0, sistema_operativo_24h: 0, sistema_operativo_7d: 0,
          sistema_operativo_30d: 0, sistema_operativo_90d: 0, sistema_operativo_365d: 0
        };
        
        // Restituisci tutti i dati per la cache
        return NextResponse.json({
          link: {
            id: link.id,
            shortCode,
            originalUrl: link.original_url,
            title: link.title,
            description: link.description,
            createdAt: link.created_at
          },
          allStats: emptyStats
        });
      }
      
      const allStats = statsResult.rows[0];
      
      // Helper function per convertire in numero
      const toNumber = (value: string | number): number => {
        if (typeof value === 'number') return value;
        return parseInt(String(value)) || 0;
      };
      
      // Converte tutti i valori in numeri
      const convertedStats = Object.fromEntries(
        Object.entries(allStats).map(([key, value]) => [key, toNumber(value)])
      );
      
      return NextResponse.json({
        link: {
          id: link.id,
          shortCode,
          originalUrl: link.original_url,
          title: link.title,
          description: link.description,
          createdAt: link.created_at
        },
        allStats: convertedStats
      });
    }
    
    // Comportamento esistente per filtri specifici
    if (filter === 'custom' && startDate && endDate) {
      // Per date personalizzate, calcola direttamente dalla tabella clicks
      statsResult = await sql`
        SELECT 
          COUNT(*) as click_totali,
          COUNT(DISTINCT click_fingerprint_hash) as click_unici,
          COUNT(DISTINCT CASE WHEN referrer != 'Direct' THEN referrer END) as referrer_count,
          COUNT(DISTINCT CASE WHEN country IS NOT NULL THEN country END) as country_count,
          COUNT(DISTINCT CASE WHEN city IS NOT NULL THEN city END) as city_count,
          COUNT(DISTINCT CASE WHEN browser_name IS NOT NULL THEN browser_name END) as browser_count,
          COUNT(DISTINCT CASE WHEN language IS NOT NULL THEN language END) as lingua_count,
          COUNT(DISTINCT CASE WHEN device_type IS NOT NULL THEN device_type END) as dispositivo_count,
          COUNT(DISTINCT CASE WHEN os_name IS NOT NULL THEN os_name END) as sistema_operativo_count
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
          COALESCE(referrer_365d, 0) as referrer_365d,
          COALESCE(country_sempre, 0) as country_sempre,
          COALESCE(country_24h, 0) as country_24h,
          COALESCE(country_7d, 0) as country_7d,
          COALESCE(country_30d, 0) as country_30d,
          COALESCE(country_90d, 0) as country_90d,
          COALESCE(country_365d, 0) as country_365d,
          COALESCE(city_sempre, 0) as city_sempre,
          COALESCE(city_24h, 0) as city_24h,
          COALESCE(city_7d, 0) as city_7d,
          COALESCE(city_30d, 0) as city_30d,
          COALESCE(city_90d, 0) as city_90d,
          COALESCE(city_365d, 0) as city_365d,
          COALESCE(browser_sempre, 0) as browser_sempre,
          COALESCE(browser_24h, 0) as browser_24h,
          COALESCE(browser_7d, 0) as browser_7d,
          COALESCE(browser_30d, 0) as browser_30d,
          COALESCE(browser_90d, 0) as browser_90d,
          COALESCE(browser_365d, 0) as browser_365d,
          COALESCE(lingua_sempre, 0) as lingua_sempre,
          COALESCE(lingua_24h, 0) as lingua_24h,
          COALESCE(lingua_7d, 0) as lingua_7d,
          COALESCE(lingua_30d, 0) as lingua_30d,
          COALESCE(lingua_90d, 0) as lingua_90d,
          COALESCE(lingua_365d, 0) as lingua_365d,
          COALESCE(dispositivo_sempre, 0) as dispositivo_sempre,
          COALESCE(dispositivo_24h, 0) as dispositivo_24h,
          COALESCE(dispositivo_7d, 0) as dispositivo_7d,
          COALESCE(dispositivo_30d, 0) as dispositivo_30d,
          COALESCE(dispositivo_90d, 0) as dispositivo_90d,
          COALESCE(dispositivo_365d, 0) as dispositivo_365d,
          COALESCE(sistema_operativo_sempre, 0) as sistema_operativo_sempre,
          COALESCE(sistema_operativo_24h, 0) as sistema_operativo_24h,
          COALESCE(sistema_operativo_7d, 0) as sistema_operativo_7d,
          COALESCE(sistema_operativo_30d, 0) as sistema_operativo_30d,
          COALESCE(sistema_operativo_90d, 0) as sistema_operativo_90d,
          COALESCE(sistema_operativo_365d, 0) as sistema_operativo_365d
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
            referrer_30d: 0, referrer_90d: 0, referrer_365d: 0,
            country_sempre: 0, country_24h: 0, country_7d: 0,
            country_30d: 0, country_90d: 0, country_365d: 0,
            city_sempre: 0, city_24h: 0, city_7d: 0,
            city_30d: 0, city_90d: 0, city_365d: 0,
            browser_sempre: 0, browser_24h: 0, browser_7d: 0,
            browser_30d: 0, browser_90d: 0, browser_365d: 0,
            lingua_sempre: 0, lingua_24h: 0, lingua_7d: 0,
            lingua_30d: 0, lingua_90d: 0, lingua_365d: 0,
            dispositivo_sempre: 0, dispositivo_24h: 0, dispositivo_7d: 0,
            dispositivo_30d: 0, dispositivo_90d: 0, dispositivo_365d: 0,
            sistema_operativo_sempre: 0, sistema_operativo_24h: 0, sistema_operativo_7d: 0,
            sistema_operativo_30d: 0, sistema_operativo_90d: 0, sistema_operativo_365d: 0
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
    let clickTotali, clickUnici, referrerCount, countryCount, cityCount, browserCount, linguaCount, dispositivoCount, sistemaOperativoCount;
    
    if (filter === 'custom') {
      // Per date personalizzate, usa i campi calcolati
      clickTotali = toNumber(stats.click_totali);
      clickUnici = toNumber(stats.click_unici);
      referrerCount = toNumber(stats.referrer_count);
      countryCount = toNumber(stats.country_count);
      cityCount = toNumber(stats.city_count);
      browserCount = toNumber(stats.browser_count);
      linguaCount = toNumber(stats.lingua_count);
      dispositivoCount = toNumber(stats.dispositivo_count);
      sistemaOperativoCount = toNumber(stats.sistema_operativo_count);
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
      countryCount = toNumber(stats[`country${suffix}`]);
      cityCount = toNumber(stats[`city${suffix}`]);
      browserCount = toNumber(stats[`browser${suffix}`]);
      linguaCount = toNumber(stats[`lingua${suffix}`]);
      dispositivoCount = toNumber(stats[`dispositivo${suffix}`]);
      sistemaOperativoCount = toNumber(stats[`sistema_operativo${suffix}`]);
    }

    return NextResponse.json({
      link: {
        id: link.id,
        shortCode,
        originalUrl: link.original_url,
        title: link.title,
        description: link.description,
        createdAt: link.created_at
      },
      stats: {
        clickTotali,
        clickUnici,
        referrerCount,
        countryCount,
        cityCount,
        browserCount,
        linguaCount,
        dispositivoCount,
        sistemaOperativoCount
      }
    });

  } catch (error) {
    console.error('Errore durante il recupero delle statistiche:', error);
    
    // Restituisci un messaggio di errore più specifico se possibile
    let errorMessage = 'Errore interno del server';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}
