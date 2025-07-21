/**
 * Shared utility for resetting link clicks
 * Logica condivisa per resettare i click di un link
 */

import { sql } from '@vercel/postgres';

export interface ResetClicksResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Reset dei click di un link con pulizia completa di tutte le tabelle
 */
export async function resetLinkClicks(shortCode: string, userId: string, workspaceId?: string): Promise<ResetClicksResult> {
  try {
    console.log(`🔄 Inizio reset click per link ${shortCode} (User: ${userId})`);

    // Verifica che il link appartenga all'utente
    const linkQuery = workspaceId 
      ? sql`
          SELECT id, user_id
          FROM links
          WHERE short_code = ${shortCode} 
          AND user_id = ${userId} 
          AND workspace_id = ${workspaceId}
        `
      : sql`
          SELECT id, user_id
          FROM links
          WHERE short_code = ${shortCode} 
          AND user_id = ${userId}
        `;

    const { rows: linkRows } = await linkQuery;

    if (linkRows.length === 0) {
      return { success: false, error: 'Link non trovato' };
    }

    if (linkRows[0].user_id !== userId) {
      return { success: false, error: 'Non autorizzato' };
    }

    const linkId = linkRows[0].id;

    // Prima ottieni i dati che saranno eliminati per la reportistica
    let clicksToDelete = 0;
    try {
      // Contiamo i click dalla tabella clicks
      const clickResult = await sql`
        SELECT COUNT(*) as count
        FROM clicks 
        WHERE link_id = ${linkId}
      `;
      clicksToDelete = parseInt(clickResult.rows[0]?.count || '0');
      console.log(`📋 Trovati ${clicksToDelete} click da eliminare`);
    } catch (error) {
      console.log('⚠️ Impossibile contare i click:', error);
    }

    // Elimina tutti i click per questo link
    const clicksDeleteResult = await sql`
      DELETE FROM clicks
      WHERE link_id = ${linkId}
    `;
    console.log(`✅ Eliminati ${clicksDeleteResult.rowCount || 0} click dal database`);

    // Aggiorna i contatori nella tabella links
    await sql`
      UPDATE links 
      SET click_count = 0, unique_click_count = 0
      WHERE id = ${linkId}
    `;
    console.log(`✅ Contatori del link aggiornati`);

    // Azzera i contatori del link nella tabella links (per compatibilità con la vecchia logica)
    const updateQuery = workspaceId
      ? sql`
          UPDATE links
          SET click_count = 0, unique_click_count = 0
          WHERE short_code = ${shortCode} 
          AND user_id = ${userId} 
          AND workspace_id = ${workspaceId}
        `
      : sql`
          UPDATE links
          SET click_count = 0, unique_click_count = 0
          WHERE short_code = ${shortCode} 
          AND user_id = ${userId}
        `;
    
    await updateQuery;
    console.log(`✅ Azzerati contatori per link ${shortCode}`);

    console.log(`🎉 Reset completato con successo per link ${shortCode}`);
    
    return { 
      success: true, 
      message: `Click azzerati con successo per il link ${shortCode}` 
    };

  } catch (error) {
    console.error('❌ Errore durante l\'azzeramento:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Errore interno del server' 
    };
  }
}

/**
 * Reset batch dei click per più link
 */
export async function resetBatchLinkClicks(shortCodes: string[], userId: string, workspaceId?: string): Promise<ResetClicksResult> {
  try {
    if (!shortCodes || !Array.isArray(shortCodes) || shortCodes.length === 0) {
      return { success: false, error: 'ShortCodes array mancante o vuoto' };
    }

    console.log(`🔄 Inizio reset batch per ${shortCodes.length} link`);

    // Prima ottieni gli ID dei link per eliminare i record
    const linkPlaceholders = shortCodes.map((_, index) => `$${index + 2}`).join(', ');
    const linkQuery = workspaceId
      ? `
          SELECT id FROM links 
          WHERE short_code IN (${linkPlaceholders}) 
          AND user_id = $1 AND workspace_id = $${shortCodes.length + 2}
        `
      : `
          SELECT id FROM links 
          WHERE short_code IN (${linkPlaceholders}) 
          AND user_id = $1
        `;

    const queryParams = workspaceId 
      ? [userId, ...shortCodes, workspaceId]
      : [userId, ...shortCodes];

    const { rows: linkRows } = await sql.query(linkQuery, queryParams);
    const linkIds = linkRows.map(row => row.id);

    if (linkIds.length === 0) {
      return { success: false, error: 'Nessun link trovato' };
    }

    const linkIdPlaceholders = linkIds.map((_, index) => `$${index + 1}`).join(', ');
    
    // Elimina tutti i record dalla tabella clicks per questi link
    const deleteClicksQuery = `
      DELETE FROM clicks
      WHERE link_id IN (${linkIdPlaceholders})
    `;
    await sql.query(deleteClicksQuery, linkIds);

    // Azzera i contatori dei link nella tabella links
    const updateQuery = workspaceId
      ? `
          UPDATE links 
          SET click_count = 0, unique_click_count = 0 
          WHERE short_code IN (${linkPlaceholders}) 
          AND user_id = $1 AND workspace_id = $${shortCodes.length + 2}
        `
      : `
          UPDATE links 
          SET click_count = 0, unique_click_count = 0 
          WHERE short_code IN (${linkPlaceholders}) 
          AND user_id = $1
        `;

    await sql.query(updateQuery, queryParams);

    return { 
      success: true, 
      message: `Click azzerati per ${shortCodes.length} link` 
    };

  } catch (error) {
    console.error('Errore durante l\'azzeramento batch:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Errore interno del server' 
    };
  }
}
