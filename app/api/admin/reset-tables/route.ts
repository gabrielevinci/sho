import { getSession } from '@/app/lib/session';
import { NextResponse } from 'next/server';
import { resetLinksAndClicksTables } from '@/database/migrations/reset-links-clicks-tables';

// API endpoint per resettare le tabelle del database
export async function POST() {
  try {
    // Verifica autenticazione e autorizzazione
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    // Controllo di sicurezza: permetti reset solo in ambiente di sviluppo
    // o per utenti admin specifici (aggiungi qui i tuoi ID utente admin)
    const isDevEnvironment = process.env.NODE_ENV === 'development';
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || [];
    const isAuthorizedUser = adminUserIds.includes(session.userId.toString());
    
    if (!isDevEnvironment && !isAuthorizedUser) {
      console.log(`🚫 Tentativo di reset non autorizzato da utente: ${session.userId}`);
      return NextResponse.json({ 
        error: 'Operazione non autorizzata. Il reset delle tabelle è disponibile solo per gli amministratori.' 
      }, { status: 403 });
    }
    
    console.log('🚀 Avvio reset delle tabelle richiesto da utente:', session.userId);
    
    // Esegui il reset delle tabelle
    const result = await resetLinksAndClicksTables();
    
    if (result.success) {
      console.log('✅ Reset delle tabelle completato con successo');
      return NextResponse.json({ 
        success: true, 
        message: 'Tabelle links e clicks ricreate con successo' 
      });
    } else {
      console.error('❌ Reset delle tabelle fallito');
      return NextResponse.json({ 
        success: false, 
        error: 'Errore durante il reset delle tabelle' 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Errore durante il reset delle tabelle:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Errore interno del server durante il reset' 
    }, { status: 500 });
  }
}

// Metodo GET per verificare lo stato delle tabelle
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      message: 'Endpoint per il reset delle tabelle links e clicks',
      instructions: 'Usa POST per eseguire il reset delle tabelle'
    });
    
  } catch {
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
