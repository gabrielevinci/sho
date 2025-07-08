import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  workspace_id: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  position: number; // Add position field for ordering
}

// GET - Ottenere tutte le cartelle di un workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'WorkspaceId mancante' }, { status: 400 });
    }
    
    const { rows } = await sql<Folder>`
      SELECT id, name, parent_folder_id, workspace_id, user_id, created_at, updated_at, position
      FROM folders
      WHERE user_id = ${session.userId} AND workspace_id = ${workspaceId}
      ORDER BY position ASC, name ASC
    `;
    
    return NextResponse.json({ folders: rows });
  } catch (error) {
    console.error('Errore durante il recupero delle cartelle:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// POST - Creare una nuova cartella
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, parentFolderId, workspaceId } = body;
    
    if (!name || !workspaceId) {
      return NextResponse.json({ 
        error: 'Nome cartella e workspace sono obbligatori' 
      }, { status: 400 });
    }
    
    // Verifica che il workspace appartenga all'utente
    const workspaceCheck = await sql`
      SELECT id FROM workspaces WHERE id = ${workspaceId} AND user_id = ${session.userId}
    `;
    
    if (workspaceCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Workspace non trovato' }, { status: 404 });
    }
    
    // Se c'è un parent folder, verifica che esista e appartenga all'utente
    if (parentFolderId) {
      const parentCheck = await sql`
        SELECT id FROM folders 
        WHERE id = ${parentFolderId} AND user_id = ${session.userId} AND workspace_id = ${workspaceId}
      `;
      
      if (parentCheck.rowCount === 0) {
        return NextResponse.json({ error: 'Cartella parent non trovata' }, { status: 404 });
      }
    }
    
    // Crea la nuova cartella
    const { rows } = await sql<Folder>`
      INSERT INTO folders (name, parent_folder_id, workspace_id, user_id)
      VALUES (${name}, ${parentFolderId || null}, ${workspaceId}, ${session.userId})
      RETURNING id, name, parent_folder_id, workspace_id, user_id, created_at, updated_at, position
    `;
    
    return NextResponse.json({ 
      success: true,
      folder: rows[0]
    });
  } catch (error) {
    console.error('Errore durante la creazione della cartella:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// PUT - Aggiornare una cartella (rinominare)
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const body = await request.json();
    const { folderId, name } = body;
    
    if (!folderId || !name) {
      return NextResponse.json({ 
        error: 'ID cartella e nome sono obbligatori' 
      }, { status: 400 });
    }
    
    // Verifica che la cartella appartenga all'utente
    const folderCheck = await sql`
      SELECT id FROM folders WHERE id = ${folderId} AND user_id = ${session.userId}
    `;
    
    if (folderCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Cartella non trovata' }, { status: 404 });
    }
    
    // Aggiorna la cartella
    const { rows } = await sql<Folder>`
      UPDATE folders 
      SET name = ${name}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${folderId} AND user_id = ${session.userId}
      RETURNING id, name, parent_folder_id, workspace_id, user_id, created_at, updated_at, position
    `;
    
    return NextResponse.json({ 
      success: true,
      folder: rows[0]
    });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento della cartella:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// DELETE - Eliminare una cartella
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    
    if (!folderId) {
      return NextResponse.json({ error: 'ID cartella mancante' }, { status: 400 });
    }
    
    // Verifica che la cartella appartenga all'utente
    const folderCheck = await sql`
      SELECT id, name, workspace_id FROM folders 
      WHERE id = ${folderId} AND user_id = ${session.userId}
    `;
    
    if (folderCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Cartella non trovata' }, { status: 404 });
    }
    
    const folder = folderCheck.rows[0];
    
    // Non permettere l'eliminazione della cartella "Tutti i link"
    if (folder.name === 'Tutti i link') {
      return NextResponse.json({ 
        error: 'Non è possibile eliminare la cartella "Tutti i link"' 
      }, { status: 400 });
    }
    
    // Prima di eliminare la cartella, sposta tutti i link nella cartella "Tutti i link"
    await sql`
      UPDATE links 
      SET folder_id = (
        SELECT f.id FROM folders f 
        WHERE f.workspace_id = ${folder.workspace_id} 
        AND f.name = 'Tutti i link'
      )
      WHERE folder_id = ${folderId}
    `;
    
    // Sposta anche i link delle sottocartelle nella cartella "Tutti i link"
    await sql`
      WITH RECURSIVE folder_tree AS (
        SELECT id FROM folders WHERE id = ${folderId}
        UNION ALL
        SELECT f.id FROM folders f
        INNER JOIN folder_tree ft ON f.parent_folder_id = ft.id
      )
      UPDATE links 
      SET folder_id = (
        SELECT f.id FROM folders f 
        WHERE f.workspace_id = ${folder.workspace_id} 
        AND f.name = 'Tutti i link'
      )
      WHERE folder_id IN (SELECT id FROM folder_tree)
    `;
    
    // Elimina la cartella (CASCADE eliminerà automaticamente le sottocartelle)
    await sql`
      DELETE FROM folders WHERE id = ${folderId} AND user_id = ${session.userId}
    `;
    
    return NextResponse.json({ 
      success: true,
      message: 'Cartella eliminata con successo. I link sono stati spostati nella cartella "Tutti i link".'
    });
  } catch (error) {
    console.error('Errore durante l\'eliminazione della cartella:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
