import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { getLinkAnalytics } from '@/lib/database-helpers';
import { sql } from '@vercel/postgres';

// API endpoint per ottenere le analitiche di un link
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    // Ottieni parametri dalla query string
    const { searchParams } = new URL(request.url);
    const shortCode = searchParams.get('shortCode');
    const days = searchParams.get('days');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!shortCode) {
      return NextResponse.json({ error: 'ShortCode mancante' }, { status: 400 });
    }
    
    // Verifica che il link appartenga all'utente usando short_code
    const linkCheck = await sql`
      SELECT id FROM links 
      WHERE short_code = ${shortCode} AND user_id = ${session.userId}
    `;
    
    if (linkCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Link non trovato o non autorizzato' }, { status: 404 });
    }
    
    const linkId = linkCheck.rows[0].id;
    
    // Ottieni le analitiche con date personalizzate o giorni
    let analytics;
    if (startDate && endDate) {
      // Usa date personalizzate
      analytics = await getLinkAnalytics(linkId, undefined, startDate, endDate);
    } else {
      // Usa il numero di giorni (default 30)
      const daysNumber = days ? parseInt(days) : 30;
      analytics = await getLinkAnalytics(linkId, daysNumber);
    }
    
    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Errore durante il recupero delle analitiche:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
