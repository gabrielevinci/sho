import { getSession } from '@/app/lib/session';
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const { shortCodes } = await request.json();
    
    if (!shortCodes || !Array.isArray(shortCodes) || shortCodes.length === 0) {
      return NextResponse.json({ error: 'ShortCodes array mancante o vuoto' }, { status: 400 });
    }
    
    // Prima ottieni gli ID dei link per eliminare i record clicks
    const linkPlaceholders = shortCodes.map((_, index) => `$${index + 2}`).join(', ');
    const linkQuery = `
      SELECT id FROM links 
      WHERE short_code IN (${linkPlaceholders}) 
      AND user_id = $1
    `;
    
    const { rows: linkRows } = await sql.query(linkQuery, [session.userId, ...shortCodes]);
    const linkIds = linkRows.map(row => row.id);
    
    if (linkIds.length > 0) {
      // Elimina tutti i record dalla tabella enhanced_fingerprints per questi link
      const enhancedFingerprintPlaceholders = linkIds.map((_, index) => `$${index + 1}`).join(', ');
      const deleteEnhancedFingerprintsQuery = `
        DELETE FROM enhanced_fingerprints
        WHERE link_id IN (${enhancedFingerprintPlaceholders})
      `;
      
      await sql.query(deleteEnhancedFingerprintsQuery, linkIds);
      
      // Elimina tutti i record dalla tabella advanced_fingerprints per questi link (se esiste)
      try {
        const deleteAdvancedFingerprintsQuery = `
          DELETE FROM advanced_fingerprints
          WHERE link_id IN (${enhancedFingerprintPlaceholders})
        `;
        
        await sql.query(deleteAdvancedFingerprintsQuery, linkIds);
      } catch (error) {
        // La tabella advanced_fingerprints potrebbe non esistere, ignora l'errore
        console.log('Tabella advanced_fingerprints non trovata o vuota, continuando...');
      }
      
      // Elimina tutti i record dalla tabella clicks per questi link
      const clickPlaceholders = linkIds.map((_, index) => `$${index + 1}`).join(', ');
      const deleteClicksQuery = `
        DELETE FROM clicks
        WHERE link_id IN (${clickPlaceholders})
      `;
      
      await sql.query(deleteClicksQuery, linkIds);
    }
    
    // Azzera i contatori dei link nella tabella links
    const updateQuery = `
      UPDATE links 
      SET click_count = 0, unique_click_count = 0 
      WHERE short_code IN (${linkPlaceholders}) 
      AND user_id = $1
    `;
    
    await sql.query(updateQuery, [session.userId, ...shortCodes]);
    
    return NextResponse.json({ 
      success: true, 
      message: `Click azzerati per ${shortCodes.length} link` 
    });
    
  } catch (error) {
    console.error('Errore durante l\'azzeramento batch:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
