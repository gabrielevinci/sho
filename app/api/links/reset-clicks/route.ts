import { NextRequest } from 'next/server';
import { resetLinkClicks, resetBatchLinkClicks } from '../../../../lib/reset-clicks-shared';
import { getSession } from '../../../lib/session';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId || !session?.isLoggedIn) {
      return Response.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const body = await request.json();
    
    // Reset singolo link
    if (body.shortCode) {
      const result = await resetLinkClicks(
        body.shortCode, 
        session.userId, 
        session.workspaceId
      );
      
      if (result.success) {
        return Response.json({ 
          success: true, 
          message: result.message 
        });
      } else {
        return Response.json({ 
          error: result.error 
        }, { status: 400 });
      }
    }
    
    // Reset batch di link
    if (body.shortCodes && Array.isArray(body.shortCodes)) {
      const result = await resetBatchLinkClicks(
        body.shortCodes, 
        session.userId, 
        session.workspaceId
      );
      
      if (result.success) {
        return Response.json({ 
          success: true, 
          message: result.message 
        });
      } else {
        return Response.json({ 
          error: result.error 
        }, { status: 400 });
      }
    }
    
    return Response.json({ 
      error: 'Parametri mancanti: richiesto shortCode o shortCodes' 
    }, { status: 400 });
    
  } catch (error) {
    console.error('Errore API reset-clicks:', error);
    return Response.json({ 
      error: 'Errore interno del server' 
    }, { status: 500 });
  }
}
