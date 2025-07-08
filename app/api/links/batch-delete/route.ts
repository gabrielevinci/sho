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
    
    // Elimina tutti i link specificati
    const placeholders = shortCodes.map((_, index) => `$${index + 3}`).join(', ');
    const query = `
      DELETE FROM links 
      WHERE short_code IN (${placeholders}) 
      AND user_id = $1 
      AND workspace_id = $2
    `;
    
    await sql.query(query, [session.userId, session.workspaceId, ...shortCodes]);
    
    return NextResponse.json({ 
      success: true, 
      message: `${shortCodes.length} link eliminati con successo` 
    });
    
  } catch (error) {
    console.error('Errore durante l\'eliminazione batch:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
