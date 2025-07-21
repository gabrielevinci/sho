import { NextRequest } from 'next/server';
import { syncClickCounters, resetZeroCounters } from '../../../../lib/sync-click-counters';
import { getSession } from '../../../lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId || !session?.isLoggedIn) {
      return Response.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const body = await request.json();
    const { action, linkId } = body;
    
    let result;
    
    if (action === 'sync') {
      result = await syncClickCounters(linkId);
    } else if (action === 'reset-zero') {
      result = await resetZeroCounters();
    } else {
      return Response.json({ 
        error: 'Azione non valida. Usare "sync" o "reset-zero"' 
      }, { status: 400 });
    }
    
    if (result.success) {
      return Response.json({ 
        success: true, 
        message: `Operazione completata. ${result.count} link processati.`
      });
    } else {
      return Response.json({ 
        error: result.error 
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Errore API sync-counters:', error);
    return Response.json({ 
      error: 'Errore interno del server' 
    }, { status: 500 });
  }
}
