import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { Folder } from '../../route';

// GET - Ottenere tutti i discendenti di una cartella
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const { shortCode } = await params;
    const folderId = shortCode;
    
    if (!folderId) {
      return NextResponse.json({ error: 'ID cartella mancante' }, { status: 400 });
    }
    
    // Verifica che la cartella appartenga all'utente
    const folderCheck = await sql`
      SELECT id FROM folders 
      WHERE id = ${folderId} AND user_id = ${session.userId}
    `;
    
    if (folderCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Cartella non trovata' }, { status: 404 });
    }
    
    // Ottieni tutti i discendenti della cartella
    const { rows } = await sql<Folder>`
      WITH RECURSIVE folder_descendants AS (
        SELECT id, name, parent_folder_id, path, workspace_id, user_id, created_at, updated_at, position
        FROM folders 
        WHERE id = ${folderId}
        
        UNION ALL
        
        SELECT f.id, f.name, f.parent_folder_id, f.path, f.workspace_id, f.user_id, f.created_at, f.updated_at, f.position
        FROM folders f
        JOIN folder_descendants fd ON f.parent_folder_id = fd.id
      )
      SELECT * FROM folder_descendants
      ORDER BY path
    `;
    
    return NextResponse.json({ descendants: rows });
  } catch (error) {
    console.error('Errore durante il recupero dei discendenti:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
