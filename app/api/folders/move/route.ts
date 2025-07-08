import { getSession } from '@/app/lib/session';
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const { folderId, newParentId, newPosition } = await request.json();
    
    if (!folderId) {
      return NextResponse.json({ error: 'FolderId è obbligatorio' }, { status: 400 });
    }
    
    // Verifica che la cartella appartenga all'utente
    const folderCheck = await sql`
      SELECT id, name, parent_folder_id, workspace_id FROM folders 
      WHERE id = ${folderId} AND user_id = ${session.userId}
    `;
    
    if (folderCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Cartella non trovata' }, { status: 404 });
    }
    
    const folder = folderCheck.rows[0];
    
    // Se c'è un nuovo parent, verifica che esista e appartenga all'utente
    if (newParentId) {
      const parentCheck = await sql`
        SELECT id, workspace_id FROM folders 
        WHERE id = ${newParentId} AND user_id = ${session.userId}
      `;
      
      if (parentCheck.rowCount === 0) {
        return NextResponse.json({ error: 'Cartella parent non trovata' }, { status: 404 });
      }
      
      const parentFolder = parentCheck.rows[0];
      
      // Verifica che la cartella parent sia nello stesso workspace
      if (parentFolder.workspace_id !== folder.workspace_id) {
        return NextResponse.json({ error: 'Non puoi spostare cartelle tra workspace diversi' }, { status: 400 });
      }
      
      // Verifica che non stiamo creando un loop (parent che diventa figlio di se stesso)
      if (await wouldCreateLoop(folderId, newParentId)) {
        return NextResponse.json({ error: 'Operazione non consentita: creerebbe un loop nella struttura delle cartelle' }, { status: 400 });
      }
    }
    
    // Calcola la nuova posizione se non fornita
    let finalPosition = newPosition;
    if (typeof finalPosition !== 'number') {
      finalPosition = await calculateOptimalPosition(newParentId, session.userId, folder.workspace_id);
    }
    
    // Esegui l'operazione di spostamento in una transazione
    await sql`BEGIN`;
    
    try {
      // Aggiorna la cartella con il nuovo parent e posizione
      await sql`
        UPDATE folders 
        SET parent_folder_id = ${newParentId || null}, 
            position = ${finalPosition}, 
            updated_at = NOW() 
        WHERE id = ${folderId} AND user_id = ${session.userId}
      `;
      
      // Ricompatta le posizioni nel livello di origine (se necessario)
      if (folder.parent_folder_id !== newParentId) {
        await recompactPositions(folder.parent_folder_id, session.userId, folder.workspace_id);
      }
      
      // Ricompatta le posizioni nel livello di destinazione (se necessario)
      if (newParentId !== folder.parent_folder_id) {
        await recompactPositions(newParentId, session.userId, folder.workspace_id);
      }
      
      await sql`COMMIT`;
      
      return NextResponse.json({ success: true });
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    console.error('Errore durante lo spostamento della cartella:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// Funzione per verificare se lo spostamento creerebbe un loop
async function wouldCreateLoop(folderId: string, newParentId: string): Promise<boolean> {
  if (folderId === newParentId) {
    return true;
  }
  
  // Verifica ricorsivamente se newParentId è un discendente di folderId
  const descendants = await sql`
    WITH RECURSIVE folder_tree AS (
      SELECT id, parent_folder_id, name
      FROM folders
      WHERE id = ${folderId}
      
      UNION ALL
      
      SELECT f.id, f.parent_folder_id, f.name
      FROM folders f
      INNER JOIN folder_tree ft ON f.parent_folder_id = ft.id
    )
    SELECT id FROM folder_tree WHERE id = ${newParentId}
  `;
  
  return (descendants.rowCount || 0) > 0;
}

// Funzione per calcolare la posizione ottimale
async function calculateOptimalPosition(parentId: string | null, userId: string, workspaceId: string): Promise<number> {
  const siblings = await sql`
    SELECT MAX(position) as max_position
    FROM folders
    WHERE parent_folder_id = ${parentId || null}
      AND user_id = ${userId}
      AND workspace_id = ${workspaceId}
  `;
  
  const maxPosition = siblings.rows[0]?.max_position || 0;
  return maxPosition + 1;
}

// Funzione per ricompattare le posizioni
async function recompactPositions(parentId: string | null, userId: string, workspaceId: string): Promise<void> {
  const folders = await sql`
    SELECT id 
    FROM folders
    WHERE parent_folder_id = ${parentId || null}
      AND user_id = ${userId}
      AND workspace_id = ${workspaceId}
    ORDER BY position ASC, name ASC
  `;
  
  // Riassegna posizioni sequenziali
  for (let i = 0; i < folders.rows.length; i++) {
    await sql`
      UPDATE folders 
      SET position = ${i + 1}
      WHERE id = ${folders.rows[i].id}
    `;
  }
}
