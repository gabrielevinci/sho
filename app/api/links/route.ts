import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { invalidateLinksCache } from '@/app/lib/cache';

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
    // Usa la stessa logica delle analytics per calcolare i click reali
    const { rows } = await sql`
      SELECT 
        l.id, 
        l.short_code, 
        l.original_url, 
        l.created_at, 
        l.title, 
        l.description, 
        l.folder_id,
        -- Calcola i click reali dalla tabella clicks (stesso calcolo delle analytics)
        COALESCE(COUNT(c.id), 0)::integer as click_count,
        COALESCE(COUNT(DISTINCT c.user_fingerprint), 0)::integer as unique_click_count
      FROM links l
      LEFT JOIN clicks c ON c.link_id = l.id
      WHERE l.user_id = ${session.userId} AND l.workspace_id = ${workspaceId}
      GROUP BY l.id, l.short_code, l.original_url, l.created_at, l.title, l.description, l.folder_id
      ORDER BY l.created_at DESC
    `;
    
    return NextResponse.json({ links: rows });
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
    const { originalUrl, shortCode, workspaceId, title, description } = body;
    
    // Validazione dei dati
    if (!originalUrl || !shortCode || !workspaceId) {
      return NextResponse.json({ 
        error: 'Dati mancanti. Url originale, codice breve e workspace sono obbligatori' 
      }, { status: 400 });
    }
    
    // Verifica che il codice breve non sia già in uso
    const existingLinks = await sql`
      SELECT short_code FROM links WHERE short_code = ${shortCode}
    `;
    
    if (existingLinks.rowCount && existingLinks.rowCount > 0) {
      return NextResponse.json({ error: 'Codice breve già in uso' }, { status: 409 });
    }
    
    // Inserisci il nuovo link
    await sql`
      INSERT INTO links (short_code, original_url, user_id, workspace_id, title, description)
      VALUES (${shortCode}, ${originalUrl}, ${session.userId}, ${workspaceId}, ${title || null}, ${description || null})
    `;
    
    // Invalida la cache dei link
    await invalidateLinksCache();
    
    return NextResponse.json({ 
      success: true,
      link: {
        short_code: shortCode,
        original_url: originalUrl,
        created_at: new Date(),
        title,
        description,
        click_count: 0,
        unique_click_count: 0 // Initialize unique click count
      }
    });
  } catch (error) {
    console.error('Errore durante la creazione del link:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
