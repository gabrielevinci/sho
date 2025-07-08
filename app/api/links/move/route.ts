import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// PUT - Spostare un link in una cartella
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const body = await request.json();
    const { linkId, folderId } = body;
    
    if (!linkId) {
      return NextResponse.json({ 
        error: 'ID link obbligatorio' 
      }, { status: 400 });
    }
    
    // Verifica che il link appartenga all'utente
    const linkCheck = await sql`
      SELECT id, workspace_id FROM links 
      WHERE id = ${linkId} AND user_id = ${session.userId}
    `;
    
    if (linkCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Link non trovato' }, { status: 404 });
    }
    
    const link = linkCheck.rows[0];
    
    // Se folderId è specificato, verifica che la cartella esista e appartenga all'utente nello stesso workspace
    if (folderId) {
      const folderCheck = await sql`
        SELECT id FROM folders 
        WHERE id = ${folderId} AND user_id = ${session.userId} AND workspace_id = ${link.workspace_id}
      `;
      
      if (folderCheck.rowCount === 0) {
        return NextResponse.json({ error: 'Cartella non trovata' }, { status: 404 });
      }
    }
    
    // Sposta il link nella cartella (o rimuovilo se folderId è null)
    await sql`
      UPDATE links 
      SET folder_id = ${folderId || null}
      WHERE id = ${linkId} AND user_id = ${session.userId}
    `;
    
    return NextResponse.json({ 
      success: true,
      message: 'Link spostato con successo'
    });
  } catch (error) {
    console.error('Errore durante lo spostamento del link:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
