import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export interface LinkFolderAssociation {
  id: string;
  link_id: string;
  folder_id: string;
  user_id: string;
  workspace_id: string;
  created_at: Date;
}

// GET - Ottenere tutte le associazioni link-cartelle per un workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId || !session?.workspaceId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');
    const folderId = searchParams.get('folderId');

    let query = `
      SELECT lfa.*, l.short_code, l.title as link_title, f.name as folder_name
      FROM link_folder_associations lfa
      JOIN links l ON lfa.link_id = l.id
      JOIN folders f ON lfa.folder_id = f.id
      WHERE lfa.user_id = $1 AND lfa.workspace_id = $2
    `;
    
    const params = [session.userId, session.workspaceId];
    let paramIndex = 3;

    if (linkId) {
      query += ` AND lfa.link_id = $${paramIndex}`;
      params.push(linkId);
      paramIndex++;
    }

    if (folderId) {
      query += ` AND lfa.folder_id = $${paramIndex}`;
      params.push(folderId);
      paramIndex++;
    }

    query += ` ORDER BY lfa.created_at DESC`;

    const { rows } = await sql.query(query, params);
    
    return NextResponse.json({ associations: rows });
  } catch (error) {
    console.error('Errore durante il recupero delle associazioni:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// POST - Creare una nuova associazione link-cartella
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId || !session?.workspaceId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { linkId, folderId } = await request.json();

    if (!linkId || !folderId) {
      return NextResponse.json({ 
        error: 'Link ID e Folder ID sono obbligatori' 
      }, { status: 400 });
    }

    // Verifica che il link appartenga all'utente
    const linkCheck = await sql`
      SELECT id FROM links 
      WHERE id = ${linkId} AND user_id = ${session.userId} AND workspace_id = ${session.workspaceId}
    `;
    
    if (linkCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Link non trovato' }, { status: 404 });
    }

    // Verifica che la cartella appartenga all'utente
    const folderCheck = await sql`
      SELECT id FROM folders 
      WHERE id = ${folderId} AND user_id = ${session.userId} AND workspace_id = ${session.workspaceId}
    `;
    
    if (folderCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Cartella non trovata' }, { status: 404 });
    }

    // Verifica se l'associazione esiste già
    const existingAssociation = await sql`
      SELECT id FROM link_folder_associations 
      WHERE link_id = ${linkId} AND folder_id = ${folderId}
    `;

    if (existingAssociation.rowCount && existingAssociation.rowCount > 0) {
      return NextResponse.json({ 
        error: 'Link già presente in questa cartella' 
      }, { status: 409 });
    }

    // Crea la nuova associazione
    const { rows } = await sql<LinkFolderAssociation>`
      INSERT INTO link_folder_associations (link_id, folder_id, user_id, workspace_id)
      VALUES (${linkId}, ${folderId}, ${session.userId}, ${session.workspaceId})
      RETURNING *
    `;

    return NextResponse.json({ 
      success: true,
      message: 'Link aggiunto alla cartella con successo',
      association: rows[0]
    });
  } catch (error) {
    console.error('Errore durante la creazione dell\'associazione:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// DELETE - Rimuovere un'associazione link-cartella
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { linkId, folderId } = await request.json();

    if (!linkId || !folderId) {
      return NextResponse.json({ 
        error: 'Link ID e Folder ID sono obbligatori' 
      }, { status: 400 });
    }

    // Rimuovi l'associazione se appartiene all'utente
    const result = await sql`
      DELETE FROM link_folder_associations 
      WHERE link_id = ${linkId} 
        AND folder_id = ${folderId} 
        AND user_id = ${session.userId}
    `;

    if (result.rowCount === 0) {
      return NextResponse.json({ 
        error: 'Associazione non trovata' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Link rimosso dalla cartella con successo'
    });
  } catch (error) {
    console.error('Errore durante la rimozione dell\'associazione:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
