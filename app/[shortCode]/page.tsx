import { sql } from '@vercel/postgres';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import UAParser from 'ua-parser-js';

interface ShortCodePageProps {
  params: {
    shortCode: string;
  };
}

// Tipo di ritorno dalla query iniziale, che ora include l'ID del link
type LinkFromDb = {
  id: number;
  original_url: string;
}

// Funzione per registrare l'evento del click
async function recordClick(linkId: number, requestHeaders: Headers) {
  // Estrazione delle informazioni dagli header della richiesta
  const userAgent = requestHeaders.get('user-agent') || '';
  const referrer = requestHeaders.get('referer') || 'Direct';
  // Vercel fornisce l'header 'x-vercel-ip-country' per la geolocalizzazione
  const country = requestHeaders.get('x-vercel-ip-country') || 'Unknown';

  // Parsing dello User-Agent
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  const browserName = result.browser.name || 'Unknown';
  const osName = result.os.name || 'Unknown';
  const deviceType = result.device.type || 'desktop'; // Default a 'desktop' se non identificato

  try {
    // Eseguiamo due operazioni in una transazione per garantire la consistenza
    await sql.begin(async (tx) => {
      // 1. Inserisci il record dettagliato del click
      await tx`
        INSERT INTO clicks (link_id, country, referrer, browser_name, device_type, os_name)
        VALUES (${linkId}, ${country}, ${referrer}, ${browserName}, ${deviceType}, ${osName})
      `;
      
      // 2. Incrementa il contatore atomico nella tabella dei link
      await tx`
        UPDATE links
        SET click_count = click_count + 1
        WHERE id = ${linkId}
      `;
    });
  } catch (error) {
    // Se la registrazione del click fallisce, non blocchiamo il reindirizzamento.
    // L'esperienza utente (il redirect) è più importante della statistica.
    console.error("Failed to record click, but proceeding with redirect:", error);
  }
}

export default async function ShortCodePage({ params }: ShortCodePageProps) {
  const { shortCode } = params;

  // Recuperiamo tutti gli header della richiesta
  const requestHeaders = headers();
  
  try {
    // Cerchiamo il link nel database
    const result = await sql<LinkFromDb>`
      SELECT id, original_url FROM links WHERE short_code = ${shortCode}
    `;
    const link = result.rows[0];

    if (!link) {
      notFound();
    }

    // Avviamo la registrazione del click ma NON la attendiamo (fire-and-forget).
    // Questo permette di reindirizzare l'utente immediatamente, senza ritardi.
    recordClick(link.id, requestHeaders);

    // Reindirizziamo all'URL originale
    redirect(link.original_url);

  } catch (error) {
    console.error('Redirect Error:', error);
    redirect('/');
  }
}