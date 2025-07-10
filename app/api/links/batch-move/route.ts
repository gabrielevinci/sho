import { getSession } from '@/app/lib/session';
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const { linkIds, folderId, sourceFolderId } = await request.json();
    
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

    // LOGICA INTELLIGENTE BATCH per spostamento multiple links
    
    // Caso 1: Spostamento da "Tutti i link" a una cartella
    // → AGGIUNGE le associazioni senza rimuovere le altre
    if (!sourceFolderId && folderId) {
      // Inserisci tutte le associazioni in batch
      const insertValues = linkIds.map(linkId => 
        `(${linkId}, '${folderId}', '${session.userId}', '${session.workspaceId}')`
      ).join(', ');
      
      await sql.query(`
        INSERT INTO link_folder_associations (link_id, folder_id, user_id, workspace_id)
        VALUES ${insertValues}
        ON CONFLICT (link_id, folder_id) DO NOTHING
      `);
      
      // Aggiorna il campo legacy per compatibilità per i link che non hanno folder_id
      const placeholders = linkIds.map((_, index) => `$${index + 4}`).join(', ');
      await sql.query(`
        UPDATE links 
        SET folder_id = $1 
        WHERE id IN (${placeholders}) 
        AND user_id = $2 
        AND workspace_id = $3
        AND folder_id IS NULL
      `, [folderId, session.userId, session.workspaceId, ...linkIds]);
      
      return NextResponse.json({ 
        success: true, 
        message: `${linkIds.length} link aggiunti alla cartella mantenendo le altre associazioni` 
      });
    }
    
    // Caso 2: Spostamento da una cartella specifica a un'altra cartella
    // → RIMUOVE dalla cartella di origine e AGGIUNGE alla cartella di destinazione
    if (sourceFolderId && folderId) {
      // Rimuovi dalle associazioni della cartella di origine
      const placeholders = linkIds.map((_, index) => `$${index + 4}`).join(', ');
      await sql.query(`
        DELETE FROM link_folder_associations 
        WHERE folder_id = $1 
        AND user_id = $2 
        AND workspace_id = $3
        AND link_id IN (${placeholders})
      `, [sourceFolderId, session.userId, session.workspaceId, ...linkIds]);
      
      // Aggiungi alle associazioni della cartella di destinazione
      const insertValues = linkIds.map(linkId => 
        `(${linkId}, '${folderId}', '${session.userId}', '${session.workspaceId}')`
      ).join(', ');
      
      await sql.query(`
        INSERT INTO link_folder_associations (link_id, folder_id, user_id, workspace_id)
        VALUES ${insertValues}
        ON CONFLICT (link_id, folder_id) DO NOTHING
      `);
      
      // Aggiorna il campo legacy
      await sql.query(`
        UPDATE links 
        SET folder_id = $1 
        WHERE id IN (${placeholders}) 
        AND user_id = $2 
        AND workspace_id = $3
      `, [folderId, session.userId, session.workspaceId, ...linkIds]);
      
      return NextResponse.json({ 
        success: true, 
        message: `${linkIds.length} link spostati dalla cartella di origine a quella di destinazione` 
      });
    }
    
    // Caso 3: Spostamento da una cartella a "Tutti i link"
    // → RIMUOVE dalla cartella specifica
    if (sourceFolderId && !folderId) {
      const placeholders = linkIds.map((_, index) => `$${index + 4}`).join(', ');
      await sql.query(`
        DELETE FROM link_folder_associations 
        WHERE folder_id = $1 
        AND user_id = $2 
        AND workspace_id = $3
        AND link_id IN (${placeholders})
      `, [sourceFolderId, session.userId, session.workspaceId, ...linkIds]);
      
      // Per ogni link, verifica se ha altre associazioni, se no aggiorna il campo legacy a null
      for (const linkId of linkIds) {
        const remainingAssociations = await sql`
          SELECT COUNT(*) as count FROM link_folder_associations 
          WHERE link_id = ${linkId} AND user_id = ${session.userId}
        `;
        
        if (remainingAssociations.rows[0].count == 0) {
          await sql`
            UPDATE links 
            SET folder_id = NULL
            WHERE id = ${linkId} AND user_id = ${session.userId}
          `;
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `${linkIds.length} link rimossi dalla cartella specifica` 
      });
    }
    
    // Fallback: comportamento legacy per compatibilità
    const placeholders = linkIds.map((_, index) => `$${index + 4}`).join(', ');
    await sql.query(`
      UPDATE links 
      SET folder_id = $1 
      WHERE id IN (${placeholders}) 
      AND user_id = $2 
      AND workspace_id = $3
    `, [folderId, session.userId, session.workspaceId, ...linkIds]);
    
    return NextResponse.json({ 
      success: true, 
      message: `${linkIds.length} link spostati con successo (modalità legacy)` 
    });
    
  } catch (error) {
    console.error('Errore durante lo spostamento batch:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
