import { sql } from '@vercel/postgres';
import { notFound, redirect } from 'next/navigation';

// Definiamo un'interfaccia esplicita per le props della pagina.
// Questa è la best practice per tipizzare le props in Next.js.
interface ShortCodePageProps {
  params: {
    shortCode: string;
  };
}

type LinkFromDb = {
  original_url: string;
}

// Usiamo l'interfaccia nella firma della funzione.
export default async function ShortCodePage({ params }: ShortCodePageProps) {
  const { shortCode } = params;

  try {
    const result = await sql<LinkFromDb>`
      SELECT original_url FROM links WHERE short_code = ${shortCode}
    `;

    const link = result.rows[0];

    if (!link) {
      notFound();
    }

    redirect(link.original_url);

  } catch (error) {
    console.error('Redirect Error:', error);
    // In caso di errore, reindirizziamo alla pagina principale.
    redirect('/');
  }
}