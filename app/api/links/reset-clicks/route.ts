import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function PUT(request: NextRequest) {
  try {
    // Verifica autenticazione
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Ottieni i dati dal body
    const body = await request.json();
    const { shortCode } = body;

    if (!shortCode) {
      return NextResponse.json({ error: 'Short code mancante' }, { status: 400 });
    }

    // Verifica che il link appartenga all'utente
    const { rows: linkRows } = await sql`
      SELECT id, user_id
      FROM links
      WHERE short_code = ${shortCode}
    `;

    if (linkRows.length === 0) {
      return NextResponse.json({ error: 'Link non trovato' }, { status: 404 });
    }

    if (linkRows[0].user_id !== session.userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    // Ottieni l'ID del link per eliminare i record clicks
    const linkId = linkRows[0].id;

    // Elimina tutti i record dalla tabella clicks per questo link
    await sql`
      DELETE FROM clicks
      WHERE link_id = ${linkId}
    `;

    // Azzera i contatori del link nella tabella links
    await sql`
      UPDATE links
      SET click_count = 0, unique_click_count = 0
      WHERE short_code = ${shortCode} AND user_id = ${session.userId}
    `;

    return NextResponse.json({ 
      message: 'Click azzerati con successo',
      shortCode 
    });

  } catch (error) {
    console.error('Errore durante l\'azzeramento dei click:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
