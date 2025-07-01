import { sql } from '@vercel/postgres';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import UAParser from 'ua-parser-js';

interface ShortCodePageProps {
  params: {
    shortCode: string;
  };
}

type LinkFromDb = {
  id: number;
  original_url: string;
}

async function recordClick(linkId: number, requestHeaders: Headers) {
  const userAgent = requestHeaders.get('user-agent') || '';
  const referrer = requestHeaders.get('referer') || 'Direct';
  const country = requestHeaders.get('x-vercel-ip-country') || 'Unknown';

  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  const browserName = result.browser.name || 'Unknown';
  const osName = result.os.name || 'Unknown';
  const deviceType = result.device.type || 'desktop';

  try {
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO clicks (link_id, country, referrer, browser_name, device_type, os_name)
        VALUES (${linkId}, ${country}, ${referrer}, ${browserName}, ${deviceType}, ${osName})
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

    recordClick(link.id, requestHeaders);

    redirect(link.original_url);

  } catch (error) {
    console.error('Redirect Error:', error);
    redirect('/');
  }
}