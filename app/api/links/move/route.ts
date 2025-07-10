import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// PUT - Spostare un link in una cartella con logica intelligente
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const body = await request.json();
    const { linkId, folderId, sourceFolderId } = body; // Aggiunto sourceFolderId per sapere da dove viene spostato
    
    if (!linkId) {
      return NextResponse.json({ 
        error: 'ID link obbligatorio' 
      }, { status: 400 });
    }
    
    // Verifica che il link appartenga all'utente
    const linkCheck = await sql`
      SELECT id, workspace_id, folder_id FROM links 
      WHERE id = ${linkId} AND user_id = ${session.userId}
    `;
    
    if (linkCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Link non trovato' }, { status: 404 });
    }
    
    const link = linkCheck.rows[0];
    
    // Se folderId è specificato, verifica che la cartella esista e appartenga all'utente nello stesso workspace
    if (folderId) {
      const folderCheck = await sql`
        SELECT id FROM folders 
        WHERE id = ${folderId} AND user_id = ${session.userId} AND workspace_id = ${link.workspace_id}
      `;
      
      if (folderCheck.rowCount === 0) {
        return NextResponse.json({ error: 'Cartella non trovata' }, { status: 404 });
      }
    }

    // LOGICA INTELLIGENTE DI SPOSTAMENTO
    
    // Caso 1: Spostamento da "Tutti i link" (sourceFolderId è null o undefined) a una cartella
    // → AGGIUNGE l'associazione senza rimuovere le altre
    if (!sourceFolderId && folderId) {
      await sql`
        INSERT INTO link_folder_associations (link_id, folder_id, user_id, workspace_id)
        VALUES (${linkId}, ${folderId}, ${session.userId}, ${link.workspace_id})
        ON CONFLICT (link_id, folder_id) DO NOTHING
      `;
      
      // CORRETTO: Aggiorna il campo legacy SOLO se non è già impostato
      // Questo evita di sovrascrivere associazioni esistenti
      if (!link.folder_id) {
        await sql`
          UPDATE links 
          SET folder_id = ${folderId}
          WHERE id = ${linkId} AND user_id = ${session.userId}
        `;
      }
      // Se folder_id è già impostato, NON lo cambiamo per mantenere la compatibilità
      
      return NextResponse.json({ 
        success: true,
        message: 'Link aggiunto alla cartella mantenendo le altre associazioni'
      });
    }
    
    // Caso 2: Spostamento da una cartella specifica a un'altra cartella
    // → RIMUOVE dalla cartella di origine e AGGIUNGE alla cartella di destinazione
    if (sourceFolderId && folderId) {
      // Rimuovi dalla cartella di origine
      await sql`
        DELETE FROM link_folder_associations 
        WHERE link_id = ${linkId} AND folder_id = ${sourceFolderId} AND user_id = ${session.userId}
      `;
      
      // Aggiungi alla cartella di destinazione
      await sql`
        INSERT INTO link_folder_associations (link_id, folder_id, user_id, workspace_id)
        VALUES (${linkId}, ${folderId}, ${session.userId}, ${link.workspace_id})
        ON CONFLICT (link_id, folder_id) DO NOTHING
      `;
      
      // Aggiorna il campo legacy
      await sql`
        UPDATE links 
        SET folder_id = ${folderId}
        WHERE id = ${linkId} AND user_id = ${session.userId}
      `;
      
      return NextResponse.json({ 
        success: true,
        message: 'Link spostato dalla cartella di origine a quella di destinazione'
      });
    }
    
    // Caso 3: Spostamento da una cartella a "Tutti i link" (folderId è null)
    // → RIMUOVE dalla cartella specifica
    if (sourceFolderId && !folderId) {
      await sql`
        DELETE FROM link_folder_associations 
        WHERE link_id = ${linkId} AND folder_id = ${sourceFolderId} AND user_id = ${session.userId}
      `;
      
      // Verifica se ci sono altre associazioni, se no aggiorna il campo legacy a null
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
      
      return NextResponse.json({ 
        success: true,
        message: 'Link rimosso dalla cartella specifica'
      });
    }
    
    // Fallback: comportamento legacy per compatibilità
    await sql`
      UPDATE links 
      SET folder_id = ${folderId || null}
      WHERE id = ${linkId} AND user_id = ${session.userId}
    `;
    
    return NextResponse.json({ 
      success: true,
      message: 'Link spostato con successo (modalità legacy)'
    });
  } catch (error) {
    console.error('Errore durante lo spostamento del link:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
