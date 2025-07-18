import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { resetBatchLinkClicks } from '@/lib/reset-clicks-shared';

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

    // Usa la logica condivisa per il reset batch
    const result = await resetBatchLinkClicks(shortCodes, session.userId, session.workspaceId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: result.message 
    });
    
  } catch (error) {
    console.error('Errore durante l\'azzeramento batch:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}