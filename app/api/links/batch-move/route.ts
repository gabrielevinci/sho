import { getSession } from '@/app/lib/session';
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const { linkIds, folderId } = await request.json();
    
    if (!linkIds || !Array.isArray(linkIds) || linkIds.length === 0) {
      return NextResponse.json({ error: 'LinkIds array mancante o vuoto' }, { status: 400 });
    }
    
    // Se folderId è specificato, verifica che la cartella esista
    if (folderId) {
      const folderCheck = await sql`
        SELECT id FROM folders 
        WHERE id = ${folderId} AND user_id = ${session.userId} AND workspace_id = ${session.workspaceId}
      `;
      
      if (folderCheck.rowCount === 0) {
        return NextResponse.json({ error: 'Cartella non trovata' }, { status: 404 });
      }
    }
    
    // Sposta tutti i link nella cartella specificata
    const placeholders = linkIds.map((_, index) => `$${index + 4}`).join(', ');
    const query = `
      UPDATE links 
      SET folder_id = $1 
      WHERE id IN (${placeholders}) 
      AND user_id = $2 
      AND workspace_id = $3
    `;
    
    await sql.query(query, [folderId, session.userId, session.workspaceId, ...linkIds]);
    
    return NextResponse.json({ 
      success: true, 
      message: `${linkIds.length} link spostati con successo` 
    });
    
  } catch (error) {
    console.error('Errore durante lo spostamento batch:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
