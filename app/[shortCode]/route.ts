import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { UAParser } from 'ua-parser-js';

// Tipo per il risultato della query al DB
type LinkFromDb = {
  id: number;
  original_url: string;
}

// Funzione helper per registrare il click, corretta
async function recordClick(linkId: number, request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const referrer = request.headers.get('referer') || 'Direct';
  const country = request.headers.get('x-vercel-ip-country') || 'Unknown';

  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  const browserName = result.browser.name || 'Unknown';
  const osName = result.os.name || 'Unknown';
  const deviceType = result.device.type || 'desktop';

  try {
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

// --- QUESTA È LA FUNZIONE GET CON LA FIRMA DEFINITIVA E CORRETTA ---
export async function GET(
  request: NextRequest,
  // La sintassi richiesta è una destrutturazione con un tipo esplicito inline.
  { params }: { params: { shortCode: string } }
) {
  const { shortCode } = params;
  
  try {
    const result = await sql<LinkFromDb>`
      SELECT id, original_url FROM links WHERE short_code = ${shortCode}
    `;
    const link = result.rows[0];

    if (!link) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    recordClick(link.id, request);

    return NextResponse.redirect(new URL(link.original_url));

  } catch (error) {
    console.error('Redirect Error:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}