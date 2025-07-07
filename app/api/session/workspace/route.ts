import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';

// API endpoint per ottenere la workspace corrente dalla sessione
export async function GET() {
  try {
    // Ottieni la sessione
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    // Restituisci la workspaceId corrente dalla sessione
    return NextResponse.json({
      workspaceId: session.workspaceId || null
    });
  } catch (error) {
    console.error('Errore durante il recupero della workspace di sessione:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// API endpoint per impostare la workspace corrente nella sessione
export async function POST(request: NextRequest) {
  try {
    // Ottieni la sessione
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    // Ottieni i dati dal body
    const body = await request.json();
    const { workspaceId } = body;
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'WorkspaceId mancante' }, { status: 400 });
    }
    
    // Aggiorna la sessione con la nuova workspaceId
    session.workspaceId = workspaceId;
    await session.save();
    
    return NextResponse.json({
      success: true,
      workspaceId: session.workspaceId
    });
  } catch (error) {
    console.error('Errore durante l\'impostazione della workspace di sessione:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
