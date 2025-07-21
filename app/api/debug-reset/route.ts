/**
 * Test endpoint debug per verificare il reset dei click senza autenticazione
 * SOLO PER DEBUG - da rimuovere in produzione
 */

import { NextRequest } from 'next/server';
import { resetLinkClicks } from '../../../lib/reset-clicks-shared';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shortCode, userId, workspaceId } = body;
    
    if (!shortCode || !userId) {
      return Response.json({ 
        error: 'Parametri mancanti: shortCode e userId richiesti' 
      }, { status: 400 });
    }
    
    console.log(`🧪 DEBUG TEST Reset per link ${shortCode} (User: ${userId})`);
    
    const result = await resetLinkClicks(shortCode, userId, workspaceId);
    
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
    
  } catch (error) {
    console.error('Errore API debug-reset:', error);
    return Response.json({ 
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}
