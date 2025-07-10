import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// POST - Aggiungere link a più cartelle o più link a una cartella
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId || !session?.workspaceId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { linkIds, folderIds } = await request.json();

    if (!linkIds || !folderIds || !Array.isArray(linkIds) || !Array.isArray(folderIds)) {
      return NextResponse.json({ 
        error: 'linkIds e folderIds devono essere array non vuoti' 
      }, { status: 400 });
    }

    if (linkIds.length === 0 || folderIds.length === 0) {
      return NextResponse.json({ 
        error: 'linkIds e folderIds non possono essere vuoti' 
      }, { status: 400 });
    }

    // Verifica che tutti i link appartengano all'utente
    const linkPlaceholders = linkIds.map((_, index) => `$${index + 4}`).join(', ');
    const linkCheckQuery = `
      SELECT COUNT(*) as count FROM links 
      WHERE id IN (${linkPlaceholders}) 
        AND user_id = $1 
        AND workspace_id = $2
    `;
    
    const linkCheck = await sql.query(linkCheckQuery, [
      session.userId, 
      session.workspaceId, 
      ...linkIds
    ]);
    
    if (linkCheck.rows[0].count !== linkIds.length) {
      return NextResponse.json({ 
        error: 'Alcuni link non sono stati trovati o non appartengono all\'utente' 
      }, { status: 404 });
    }

    // Verifica che tutte le cartelle appartengano all'utente
    const folderPlaceholders = folderIds.map((_, index) => `$${index + 3 + linkIds.length}`).join(', ');
    const folderCheckQuery = `
      SELECT COUNT(*) as count FROM folders 
      WHERE id IN (${folderPlaceholders}) 
        AND user_id = $1 
        AND workspace_id = $2
    `;
    
    const folderCheck = await sql.query(folderCheckQuery, [
      session.userId, 
      session.workspaceId, 
      ...folderIds
    ]);
    
    if (folderCheck.rows[0].count !== folderIds.length) {
      return NextResponse.json({ 
        error: 'Alcune cartelle non sono state trovate o non appartengono all\'utente' 
      }, { status: 404 });
    }

    let createdCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Crea le associazioni per ogni combinazione link-cartella
    for (const linkId of linkIds) {
      for (const folderId of folderIds) {
        try {
          // Verifica se l'associazione esiste già
          const existingAssociation = await sql`
            SELECT id FROM link_folder_associations 
            WHERE link_id = ${linkId} AND folder_id = ${folderId}
          `;

          if (existingAssociation.rowCount && existingAssociation.rowCount > 0) {
            skippedCount++;
            continue;
          }

          // Crea la nuova associazione
          await sql`
            INSERT INTO link_folder_associations (link_id, folder_id, user_id, workspace_id)
            VALUES (${linkId}, ${folderId}, ${session.userId}, ${session.workspaceId})
          `;
          
          createdCount++;
        } catch (error) {
          console.error(`Errore creando associazione ${linkId}-${folderId}:`, error);
          errors.push(`Errore associando link ${linkId} alla cartella ${folderId}`);
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Operazione completata: ${createdCount} associazioni create, ${skippedCount} già esistenti`,
      created: createdCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Errore durante l\'operazione batch:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// DELETE - Rimuovere link da più cartelle o più link da una cartella
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { linkIds, folderIds } = await request.json();

    if (!linkIds || !folderIds || !Array.isArray(linkIds) || !Array.isArray(folderIds)) {
      return NextResponse.json({ 
        error: 'linkIds e folderIds devono essere array non vuoti' 
      }, { status: 400 });
    }

    if (linkIds.length === 0 || folderIds.length === 0) {
      return NextResponse.json({ 
        error: 'linkIds e folderIds non possono essere vuoti' 
      }, { status: 400 });
    }

    // Rimuovi tutte le associazioni che corrispondono ai criteri
    const linkPlaceholders = linkIds.map((_, index) => `$${index + 3}`).join(', ');
    const folderPlaceholders = folderIds.map((_, index) => `$${index + 3 + linkIds.length}`).join(', ');
    
    const deleteQuery = `
      DELETE FROM link_folder_associations 
      WHERE link_id IN (${linkPlaceholders}) 
        AND folder_id IN (${folderPlaceholders})
        AND user_id = $1
    `;

    const result = await sql.query(deleteQuery, [
      session.userId,
      ...linkIds,
      ...folderIds
    ]);

    return NextResponse.json({ 
      success: true,
      message: `${result.rowCount || 0} associazioni rimosse con successo`,
      removed: result.rowCount || 0
    });
  } catch (error) {
    console.error('Errore durante la rimozione batch:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
