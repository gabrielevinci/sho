import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { invalidateWorkspacesCache } from '@/app/lib/cache';

// API endpoint per ottenere tutte le workspace dell'utente
export async function GET() {
  try {
    // Verifica autenticazione
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    // Ottieni le workspace dell'utente
    const { rows } = await sql`
      SELECT id, name FROM workspaces
      WHERE user_id = ${session.userId}
      ORDER BY name ASC
    `;
    
    return NextResponse.json({ workspaces: rows });
  } catch (error) {
    console.error('Errore durante il recupero delle workspace:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// API endpoint per creare una nuova workspace
export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    // Ottieni i dati dal body
    const body = await request.json();
    const { name } = body;
    
    // Validazione dei dati
    if (!name) {
      return NextResponse.json({ error: 'Nome workspace mancante' }, { status: 400 });
    }
    
    // Verifica che l'utente non abbia già una workspace con lo stesso nome
    const existingWorkspace = await sql`
      SELECT id FROM workspaces
      WHERE user_id = ${session.userId} AND name = ${name}
    `;
    
    if (existingWorkspace.rowCount && existingWorkspace.rowCount > 0) {
      return NextResponse.json({ error: 'Hai già una workspace con questo nome' }, { status: 409 });
    }
    
    // Crea la nuova workspace
    const { rows } = await sql`
      INSERT INTO workspaces (name, user_id)
      VALUES (${name}, ${session.userId})
      RETURNING id, name
    `;
    
    // Invalida la cache delle workspace
    await invalidateWorkspacesCache();
    
    return NextResponse.json({ 
      success: true,
      workspace: rows[0]
    });
  } catch (error) {
    console.error('Errore durante la creazione della workspace:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
