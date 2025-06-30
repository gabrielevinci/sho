import { sql } from '@vercel/postgres';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { UAParser } from 'ua-parser-js';

// Definiamo l'interfaccia per le props della pagina in modo esplicito e robusto.
// Questo è il pattern che soddisfa il compilatore di Vercel.
interface ShortCodePageProps {
  params: {
    shortCode: string;
  };
}

// Definiamo il tipo di ritorno per la nostra query al database.
type LinkFromDb = {
  id: number;
  original_url: string;
}

// Funzione helper per registrare il click.
async function recordClick(linkId: number, requestHeaders: Headers) {
  const userAgent = requestHeaders.get('user-agent') || '';
  const referrer = requestHeaders.get('referer') || 'Direct';
  const country = requestHeaders.get('x-vercel-ip-country') || 'Unknown';

  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  const deviceType = result.device.type || 'desktop';

  try {
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO clicks (link_id, country, referrer, browser_name, device_type, os_name)
        VALUES (${linkId}, ${country}, ${referrer}, ${result.browser.name || 'Unknown'}, ${deviceType}, ${result.os.name || 'Unknown'})
      `;
      
      await tx`
        UPDATE links
        SET click_count = click_count + 1
        WHERE id = ${linkId}
      `;
    });
  } catch (error) {
    console.error("Failed to record click, but proceeding with redirect:", error);
  }
}

// Applichiamo l'interfaccia alla firma della funzione.
export default async function ShortCodePage({ params }: ShortCodePageProps) {
  const { shortCode } = params;
  const requestHeaders = headers();
  
  try {
    const result = await sql<LinkFromDb>`
      SELECT id, original_url FROM links WHERE short_code = ${shortCode}
    `;
    const link = result.rows[0];

    if (!link) {
      notFound();
    }

    // Avviamo la registrazione del click in background ("fire-and-forget").
    recordClick(link.id, requestHeaders);

    // Reindirizziamo immediatamente l'utente.
    redirect(link.original_url);

  } catch (error) {
    console.error('Redirect Error:', error);
    redirect('/');
  }
}