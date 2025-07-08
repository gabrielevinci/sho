import { getSession } from '@/app/lib/session';
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const { operations } = await request.json();
    
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json({ error: 'Operations array è obbligatorio' }, { status: 400 });
    }
    
    // Validate all operations before executing any
    for (const op of operations) {
      if (!op.folderId || !op.type) {
        return NextResponse.json({ error: 'Ogni operazione deve avere folderId e type' }, { status: 400 });
      }
      
      if (!['move', 'reorder'].includes(op.type)) {
        return NextResponse.json({ error: 'Type deve essere "move" o "reorder"' }, { status: 400 });
      }
      
      // Verifica che la cartella appartenga all'utente
      const folderCheck = await sql`
        SELECT id, workspace_id FROM folders 
        WHERE id = ${op.folderId} AND user_id = ${session.userId}
      `;
      
      if (folderCheck.rowCount === 0) {
        return NextResponse.json({ error: `Cartella ${op.folderId} non trovata` }, { status: 404 });
      }
    }
    
    // Execute all operations in a transaction
    await sql`BEGIN`;
    
    try {
      const results = [];
      
      for (const op of operations) {
        if (op.type === 'move') {
          await sql`
            UPDATE folders 
            SET parent_folder_id = ${op.newParentId || null}, 
                position = ${op.newPosition || 0}, 
                updated_at = NOW() 
            WHERE id = ${op.folderId} AND user_id = ${session.userId}
          `;
          results.push({ folderId: op.folderId, success: true });
        } else if (op.type === 'reorder') {
          await sql`
            UPDATE folders 
            SET position = ${op.newPosition}, 
                updated_at = NOW() 
            WHERE id = ${op.folderId} AND user_id = ${session.userId}
          `;
          results.push({ folderId: op.folderId, success: true });
        }
      }
      
      await sql`COMMIT`;
      
      return NextResponse.json({ 
        success: true, 
        results,
        message: `${operations.length} operazioni completate con successo` 
      });
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    console.error('Errore durante le operazioni batch:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
