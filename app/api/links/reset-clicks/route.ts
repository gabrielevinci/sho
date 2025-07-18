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

    console.log(`🔄 Inizio reset click per link ${shortCode} (ID: ${linkId})`);

    // Elimina tutti i record dalla tabella enhanced_fingerprints per questo link
    const enhancedResult = await sql`
      DELETE FROM enhanced_fingerprints
      WHERE link_id = ${linkId}
    `;
    console.log(`✅ Eliminati ${enhancedResult.rowCount || 0} record da enhanced_fingerprints`);

    // Elimina tutti i record dalla tabella advanced_fingerprints per questo link (se esiste)
    try {
      const advancedResult = await sql`
        DELETE FROM advanced_fingerprints
        WHERE link_id = ${linkId}
      `;
      console.log(`✅ Eliminati ${advancedResult.rowCount || 0} record da advanced_fingerprints`);
    } catch {
      // La tabella advanced_fingerprints potrebbe non esistere, ignora l'errore
      console.log('⚠️ Tabella advanced_fingerprints non trovata o vuota, continuando...');
    }

    // Elimina tutti i record dalla tabella clicks per questo link
    const clicksResult = await sql`
      DELETE FROM clicks
      WHERE link_id = ${linkId}
    `;
    console.log(`✅ Eliminati ${clicksResult.rowCount || 0} record da clicks`);

    // Azzera i contatori del link nella tabella links
    await sql`
      UPDATE links
      SET click_count = 0, unique_click_count = 0
      WHERE short_code = ${shortCode} AND user_id = ${session.userId}
    `;
    console.log(`✅ Azzerati contatori per link ${shortCode}`);

    return NextResponse.json({ 
      message: 'Click azzerati con successo',
      shortCode 
    });

  } catch (error) {
    console.error('Errore durante l\'azzeramento dei click:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
