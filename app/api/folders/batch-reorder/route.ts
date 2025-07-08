import { getSession } from '@/app/lib/session';
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const { folderOrders } = await request.json();
    
    if (!folderOrders || !Array.isArray(folderOrders) || folderOrders.length === 0) {
      return NextResponse.json({ error: 'folderOrders array richiesto' }, { status: 400 });
    }

    const workspaceId = folderOrders[0]?.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId è obbligatorio' }, { status: 400 });
    }
    
    // Verifica che il workspace appartenga all'utente
    const workspaceCheck = await sql`
      SELECT id FROM workspaces WHERE id = ${workspaceId} AND user_id = ${session.userId}
    `;
    
    if (workspaceCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Workspace non trovato' }, { status: 404 });
    }

    // Aggiorna le posizioni in batch
    for (const order of folderOrders) {
      const { folderId, position } = order;
      
      if (!folderId || typeof position !== 'number') {
        continue;
      }
      
      await sql`
        UPDATE folders 
        SET position = ${position}, updated_at = NOW() 
        WHERE id = ${folderId} AND user_id = ${session.userId} AND workspace_id = ${workspaceId}
      `;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore durante la riordinazione batch delle cartelle:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
