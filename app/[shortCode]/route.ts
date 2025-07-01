import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { UAParser } from 'ua-parser-js';

// Tipo per il risultato della query al DB
type LinkFromDb = {
  id: number;
  original_url: string;
}

// Funzione helper per registrare il click, invariata
async function recordClick(linkId: number, request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const referrer = request.headers.get('referer') || 'Direct';
  // 'x-vercel-ip-country' per la geolocalizzazione
  const country = request.headers.get('x-vercel-ip-country') || 'Unknown';

  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  const browserName = result.browser.name || 'Unknown';
  const osName = result.os.name || 'Unknown';
  const deviceType = result.device.type || 'desktop';

  try {
    // Usiamo due chiamate separate per semplicità e robustezza
    await sql`
      INSERT INTO clicks (link_id, country, referrer, browser_name, device_type, os_name)
      VALUES (${linkId}, ${country}, ${referrer}, ${browserName}, ${deviceType}, ${osName})
    `;
    await sql`
      UPDATE links SET click_count = click_count + 1 WHERE id = ${linkId}
    `;
  } catch (error) {
    console.error("Failed to record click, but proceeding with redirect:", error);
  }
}

// --- QUESTA È LA FUNZIONE CORRETTA PER UN ROUTE HANDLER ---
// Gestisce specificamente le richieste GET a questa rotta.
export async function GET(
  request: NextRequest, 
  { params }: { params: { shortCode: string } }
) {
  const { shortCode } = params;
  
  try {
    const result = await sql<LinkFromDb>`
      SELECT id, original_url FROM links WHERE short_code = ${shortCode}
    `;
    const link = result.rows[0];

    if (!link) {
      // Se il link non è trovato, reindirizziamo alla home con un 404 implicito.
      // O per essere più espliciti, si potrebbe reindirizzare a una pagina 404 custom.
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Avviamo la registrazione del click in background (fire-and-forget)
    recordClick(link.id, request);

    // Eseguiamo un reindirizzamento permanente (308) all'URL originale.
    return NextResponse.redirect(new URL(link.original_url));

  } catch (error) {
    console.error('Redirect Error:', error);
    // In caso di errore grave, reindirizza alla home.
    return NextResponse.redirect(new URL('/', request.url));
  }
}