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

    // Prima ottieni gli hash dei fingerprint che saranno eliminati per pulire le correlazioni
    let fingerprintHashes: string[] = [];
    try {
      // Recuperiamo solo dalla tabella enhanced_fingerprints che sappiamo esistere
      const hashResult = await sql`
        SELECT DISTINCT browser_fingerprint as hash 
        FROM enhanced_fingerprints 
        WHERE link_id = ${linkId}
      `;
      fingerprintHashes = hashResult.rows.map(row => (row as {hash: string}).hash).filter(Boolean);
      console.log(`📋 Trovati ${fingerprintHashes.length} hash fingerprint da eliminare dalle correlazioni`);
    } catch (error) {
      console.log('⚠️ Impossibile ottenere hash fingerprint per correlazioni:', error);
    }

    // Elimina tutti i record dalla tabella enhanced_fingerprints per questo link
    const enhancedResult = await sql`
      DELETE FROM enhanced_fingerprints
      WHERE link_id = ${linkId}
    `;
    console.log(`✅ Eliminati ${enhancedResult.rowCount || 0} record da enhanced_fingerprints`);

    // Verifichiamo se esiste la tabella fingerprint_correlations e eliminiamo i record
    if (fingerprintHashes.length > 0) {
      try {
        let correlationsDeleted = 0;
        for (const hash of fingerprintHashes) {
          const correlationsResult = await sql`
            DELETE FROM fingerprint_correlations
            WHERE fingerprint_hash = ${hash}
          `;
          correlationsDeleted += correlationsResult.rowCount || 0;
        }
        console.log(`✅ Eliminati ${correlationsDeleted} record da fingerprint_correlations`);
      } catch (error) {
        console.log('⚠️ Tabella fingerprint_correlations non trovata o errore nella pulizia, continuando...', error);
      }
    }

    // Elimina tutti i record dalla tabella clicks per questo link
    const clicksResult = await sql`
      DELETE FROM clicks
      WHERE link_id = ${linkId}
    `;
    console.log(`✅ Eliminati ${clicksResult.rowCount || 0} record da clicks`);

    // Azzera i contatori del link nella tabella links
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
    
    // Prima ottieni gli hash dei fingerprint che saranno eliminati per pulire le correlazioni
    let fingerprintHashes: string[] = [];
    try {
      // Recuperiamo solo dalla tabella enhanced_fingerprints che sappiamo esistere
      const fingerprintHashQuery = `
        SELECT DISTINCT browser_fingerprint as hash 
        FROM enhanced_fingerprints 
        WHERE link_id IN (${linkIdPlaceholders})
      `;
      const { rows: hashRows } = await sql.query(fingerprintHashQuery, linkIds);
      fingerprintHashes = hashRows.map(row => row.hash).filter(Boolean);
    } catch (error) {
      console.log('Impossibile ottenere hash fingerprint per correlazioni:', error);
    }
    
    // Elimina tutti i record dalla tabella enhanced_fingerprints per questi link
    const deleteEnhancedFingerprintsQuery = `
      DELETE FROM enhanced_fingerprints
      WHERE link_id IN (${linkIdPlaceholders})
    `;
    await sql.query(deleteEnhancedFingerprintsQuery, linkIds);
    
    // Elimina correlazioni fingerprint usando gli hash salvati
    if (fingerprintHashes.length > 0) {
      try {
        const hashPlaceholders = fingerprintHashes.map((_, index) => `$${index + 1}`).join(', ');
        const deleteCorrelationsQuery = `
          DELETE FROM fingerprint_correlations
          WHERE fingerprint_hash IN (${hashPlaceholders})
        `;
        await sql.query(deleteCorrelationsQuery, fingerprintHashes);
      } catch (error) {
        // La tabella fingerprint_correlations potrebbe non esistere
        console.log('Tabella fingerprint_correlations non trovata o errore nella pulizia, continuando...', error);
      }
    }
    
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
