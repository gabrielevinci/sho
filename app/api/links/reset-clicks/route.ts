import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { resetLinkClicks } from '@/lib/reset-clicks-shared';

export async function PUT(request: NextRequest) {
  try {
    // Verifica autenticazione
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Ottieni i dati dal body
    const body = await request.json();
    const { shortCode } = body;

    if (!shortCode) {
      return NextResponse.json({ error: 'Short code mancante' }, { status: 400 });
    }

    // Usa la logica condivisa per il reset
    const result = await resetLinkClicks(shortCode, session.userId, session.workspaceId);

    if (!result.success) {
      const status = result.error === 'Link non trovato' ? 404 : 
                    result.error === 'Non autorizzato' ? 403 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ 
      success: true, 
      message: result.message 
    });

  } catch (error) {
    console.error('Errore durante il reset:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
