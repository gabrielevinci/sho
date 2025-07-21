import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { invalidateLinksCache } from '@/app/lib/cache';
import { 
  getUserLinks, 
  createLink, 
  isShortCodeTaken 
} from '@/lib/database-helpers';
import { CreateLinkData } from '@/lib/types';

// API endpoint per ottenere tutti i link dell'utente in un workspace
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    // Ottieni il workspaceId dalla query string
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'WorkspaceId mancante' }, { status: 400 });
    }
    
    // Esegui query per ottenere i link dell'utente nel workspace specificato
    const links = await getUserLinks(parseInt(session.userId), parseInt(workspaceId));
    
    return NextResponse.json({ links });
  } catch (error) {
    console.error('Errore durante il recupero dei link:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// API endpoint per creare un nuovo link
export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    // Ottieni i dati del body
    const body = await request.json();
    const { 
      originalUrl, 
      shortCode, 
      workspaceId, 
      title, 
      description, 
      folderId,
      utm_campaign,
      utm_source,
      utm_content,
      utm_medium,
      utm_term
    } = body;
    
    // Validazione dei dati
    if (!originalUrl || !shortCode || !workspaceId) {
      return NextResponse.json({ 
        error: 'Dati mancanti. Url originale, codice breve e workspace sono obbligatori' 
      }, { status: 400 });
    }
    
    // Verifica che il codice breve non sia già in uso
    const isCodeTaken = await isShortCodeTaken(shortCode);
    if (isCodeTaken) {
      return NextResponse.json({ error: 'Codice breve già in uso' }, { status: 409 });
    }
    
    // Crea i dati del link
    const linkData: CreateLinkData = {
      short_code: shortCode,
      original_url: originalUrl,
      title,
      description,
      user_id: parseInt(session.userId),
      workspace_id: parseInt(workspaceId),
      folder_id: folderId ? parseInt(folderId) : undefined,
      utm_campaign,
      utm_source,
      utm_content,
      utm_medium,
      utm_term
    };
    
    // Crea il nuovo link
    const newLink = await createLink(linkData);
    
    // Invalida la cache dei link
    await invalidateLinksCache();
    
    return NextResponse.json({ 
      success: true,
      link: {
        ...newLink,
        click_count: 0,
        unique_click_count: 0
      }
    });
  } catch (error) {
    console.error('Errore durante la creazione del link:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
