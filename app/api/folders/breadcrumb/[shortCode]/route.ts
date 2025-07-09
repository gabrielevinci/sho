import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { Folder } from '../../route';

// GET - Ottenere il percorso breadcrumb per una cartella
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
    
    // Ottieni il percorso ancestrale (breadcrumb) per la cartella
    const { rows } = await sql<Folder>`
      WITH RECURSIVE folder_ancestry AS (
        SELECT id, name, parent_folder_id, path, workspace_id, user_id, created_at, updated_at, position
        FROM folders 
        WHERE id = ${folderId}
        
        UNION ALL
        
        SELECT f.id, f.name, f.parent_folder_id, f.path, f.workspace_id, f.user_id, f.created_at, f.updated_at, f.position
        FROM folders f
        JOIN folder_ancestry fa ON f.id = fa.parent_folder_id
      )
      SELECT * FROM folder_ancestry
      ORDER BY CASE WHEN parent_folder_id IS NULL THEN 0 ELSE 1 END, path
    `;
    
    return NextResponse.json({ breadcrumb: rows });
  } catch (error) {
    console.error('Errore durante il recupero del breadcrumb:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
