import { NextRequest, NextResponse } from 'next/server';
import { createUnifiedClickAnalyticsView } from '@/database/migrations/create-unified-click-analytics-view';

// Funzione per controllare l'autorizzazione (IMPORTANTE: modificare con la tua logica di autenticazione)
function isAuthorized(req: NextRequest): boolean {
  // Questo è solo un esempio, implementa la tua logica di sicurezza
  const authToken = req.headers.get('authorization')?.split(' ')[1];
  return authToken === process.env.ADMIN_API_KEY; // Definisci questa variabile d'ambiente
}

export async function GET(req: NextRequest) {
  // Verifica l'autorizzazione
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    // Esegui la migrazione
    const result = await createUnifiedClickAnalyticsView();
    
    return NextResponse.json({
      success: true,
      message: 'Vista analytics creata con successo',
      result
    });
  } catch (error) {
    console.error('Errore durante la creazione della vista:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
