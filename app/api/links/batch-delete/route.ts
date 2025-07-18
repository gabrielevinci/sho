import { getSession } from '@/app/lib/session';
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const { shortCodes } = await request.json();
    
    if (!shortCodes || !Array.isArray(shortCodes) || shortCodes.length === 0) {
      return NextResponse.json({ error: 'ShortCodes array mancante o vuoto' }, { status: 400 });
    }
    
    // Ottieni gli ID dei link da eliminare
    const linkPlaceholders = shortCodes.map((_, index) => `$${index + 3}`).join(', ');
    const linkIdsQuery = `
      SELECT id, short_code FROM links 
      WHERE short_code IN (${linkPlaceholders}) 
      AND user_id = $1 
      AND workspace_id = $2
    `;
    
    const { rows: linkRows } = await sql.query(linkIdsQuery, [session.userId, session.workspaceId, ...shortCodes]);
    
    if (linkRows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Nessun link trovato' 
      }, { status: 404 });
    }
    
    const linkIds = linkRows.map(row => row.id);
    const foundShortCodes = linkRows.map(row => row.short_code);
    
    // Otteniamo gli hash dei fingerprint per pulire le correlazioni
    let fingerprintHashes = [];
    try {
      const linkIdPlaceholders = linkIds.map((_, index) => `$${index + 1}`).join(', ');
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
    
    // Elimina in transazione per garantire l'atomicità
    await sql.query('BEGIN');
    
    try {
      // 1. Elimina i record correlati dalle tabelle di analytics
      if (linkIds.length > 0) {
        const linkIdPlaceholders = linkIds.map((_, index) => `$${index + 1}`).join(', ');
        
        // Elimina dalla tabella clicks
        await sql.query(`DELETE FROM clicks WHERE link_id IN (${linkIdPlaceholders})`, linkIds);
        
        // Elimina dalla tabella enhanced_fingerprints
        await sql.query(`DELETE FROM enhanced_fingerprints WHERE link_id IN (${linkIdPlaceholders})`, linkIds);
      }
      
      // 2. Elimina le correlazioni dei fingerprint
      if (fingerprintHashes.length > 0) {
        try {
          const hashPlaceholders = fingerprintHashes.map((_, index) => `$${index + 1}`).join(', ');
          await sql.query(`DELETE FROM fingerprint_correlations WHERE fingerprint_hash IN (${hashPlaceholders})`, fingerprintHashes);
        } catch (error) {
          console.log('Tabella fingerprint_correlations non trovata o errore nella pulizia, continuando...', error);
        }
      }
      
      // 3. Elimina i link stessi
      const deleteLinksQuery = `
        DELETE FROM links 
        WHERE short_code IN (${linkPlaceholders}) 
        AND user_id = $1 
        AND workspace_id = $2
      `;
      
      await sql.query(deleteLinksQuery, [session.userId, session.workspaceId, ...shortCodes]);
      
      await sql.query('COMMIT');
      
    } catch (error) {
      await sql.query('ROLLBACK');
      throw error;
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `${foundShortCodes.length} link eliminati con successo` 
    });
    
  } catch (error) {
    console.error('Errore durante l\'eliminazione batch:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
