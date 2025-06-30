import { type NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';
import { UAParser } from 'ua-parser-js';
import { redirect, notFound } from 'next/navigation';

// Tipo per il ritorno dal DB
type LinkFromDb = {
  id: number;
  original_url: string;
}

// Funzione helper per registrare il click
async function recordClick(linkId: number, request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const referrer = request.headers.get('referer') || 'Direct';
  const country = request.headers.get('x-vercel-ip-country') || 'Unknown';

  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  const deviceType = result.device.type || 'desktop';

  try {
    // Avviamo la transazione
    await sql.begin(async (tx) => {
      // Usiamo la sintassi corretta tx.query() con segnaposto $1, $2...
      const insertClickQuery = tx.query(
        `INSERT INTO clicks (link_id, country, referrer, browser_name, device_type, os_name)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [linkId, country, referrer, result.browser.name || 'Unknown', deviceType, result.os.name || 'Unknown']
      );

      const updateLinkQuery = tx.query(
        `UPDATE links SET click_count = click_count + 1 WHERE id = $1`,
        [linkId]
      );
      
      // Eseguiamo entrambe le query in parallelo per la massima efficienza
      await Promise.all([insertClickQuery, updateLinkQuery]);
    });
  } catch (error) {
    console.error("Failed to record click, but proceeding with redirect:", error);
  }
}

// Handler per le richieste GET
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
      notFound();
    }

    recordClick(link.id, request);

    redirect(link.original_url);

  } catch (error) {
    console.error('Redirect Error:', error);
    redirect('/');
  }
}