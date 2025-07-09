import { getSession } from '@/app/lib/session';
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const { folderId, newPosition } = await request.json();
    
    if (!folderId) {
      return NextResponse.json({ error: 'FolderId è obbligatorio' }, { status: 400 });
    }
    
    if (typeof newPosition !== 'number') {
      return NextResponse.json({ error: 'NewPosition deve essere un numero' }, { status: 400 });
    }
    
    // Verifica che la cartella appartenga all'utente
    const folderCheck = await sql`
      SELECT id, name, parent_folder_id, workspace_id, position 
      FROM folders 
      WHERE id = ${folderId} AND user_id = ${session.userId}
    `;
    
    if (folderCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Cartella non trovata' }, { status: 404 });
    }
    
    const folder = folderCheck.rows[0];
    
    // Aggiorna la posizione della cartella mantenendo la gerarchia
    // Le posizioni sono relative solo alle cartelle dello stesso livello (stesso parent_folder_id)
    await sql`
      UPDATE folders 
      SET position = ${newPosition}, updated_at = NOW()
      WHERE id = ${folderId} AND user_id = ${session.userId}
    `;
    
    return NextResponse.json({ 
      success: true, 
      message: 'Posizione cartella aggiornata con successo',
      folder: {
        id: folder.id,
        name: folder.name,
        parent_folder_id: folder.parent_folder_id,
        new_position: newPosition
      }
    });
    
  } catch (error) {
    console.error('Errore durante il riordino della cartella:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
