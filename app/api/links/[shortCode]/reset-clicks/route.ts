import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function DELETE(
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

    // Verifica che il link appartenga all'utente
    const linkResult = await sql`
      SELECT id FROM links 
      WHERE short_code = ${shortCode} AND user_id = ${session.userId}
    `;

    if (linkResult.rowCount === 0) {
      return NextResponse.json({ error: 'Link non trovato' }, { status: 404 });
    }

    const linkId = linkResult.rows[0].id;

    // Elimina tutti i click del link
    await sql`DELETE FROM clicks WHERE link_id = ${linkId}`;

    // Aggiorna il contatore dei click nel link
    await sql`UPDATE links SET click_count = 0 WHERE id = ${linkId}`;

    return NextResponse.json({ message: 'Click azzerati con successo' });

  } catch (error) {
    console.error('Errore durante l\'azzeramento dei click:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
