import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { headers } from 'next/headers';
import { UAParser } from 'ua-parser-js';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';

// Tipo per il ritorno dal DB
type LinkFromDb = {
  id: number;
  original_url: string;
}

// Funzione helper per registrare il click
async function recordClick(linkId: number, requestHeaders: Headers) {
  const userAgent = requestHeaders.get('user-agent') || '';
  const referrer = requestHeaders.get('referer') || 'Direct';
  const country = requestHeaders.get('x-vercel-ip-country') || 'Unknown';

  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  const deviceType = result.device.type || 'desktop';

  try {
    // Usiamo `Promise.all` per avviare entrambe le query in parallelo dentro la transazione
    await sql.begin(async (tx) => {
      await Promise.all([
        tx`
          INSERT INTO clicks (link_id, country, referrer, browser_name, device_type, os_name)
          VALUES (${linkId}, ${country}, ${referrer}, ${result.browser.name || 'Unknown'}, ${deviceType}, ${result.os.name || 'Unknown'})
        `,
        tx`
          UPDATE links
          SET click_count = click_count + 1
          WHERE id = ${linkId}
        `
      ]);
    });
  } catch (error) {
    console.error("Failed to record click, but proceeding with redirect:", error);
  }
}

// Handler per le richieste GET, con la firma corretta
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
      // In un Route Handler, notFound() deve essere chiamato per terminare
      return notFound();
    }

    // Avviamo la registrazione del click in background.
    // Usiamo `request.headers` che è l'oggetto corretto qui.
    recordClick(link.id, request.headers);

    // Reindirizziamo usando la funzione di next/navigation
    redirect(link.original_url);

  } catch (error) {
    console.error('Redirect Error:', error);
    // In caso di errore, reindirizziamo alla pagina principale
    redirect('/');
  }
}