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
    const linkId = searchParams.get('linkId');
    const days = searchParams.get('days') || '30';
    
    if (!linkId) {
      return NextResponse.json({ error: 'LinkId mancante' }, { status: 400 });
    }
    
    // Verifica che il link appartenga all'utente
    const linkCheck = await sql`
      SELECT id FROM links 
      WHERE id = ${parseInt(linkId)} AND user_id = ${parseInt(session.userId)}
    `;
    
    if (linkCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Link non trovato o non autorizzato' }, { status: 404 });
    }
    
    // Ottieni le analitiche
    const analytics = await getLinkAnalytics(parseInt(linkId), parseInt(days));
    
    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Errore durante il recupero delle analitiche:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
