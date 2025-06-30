import { sql } from '@vercel/postgres';
import { notFound, redirect } from 'next/navigation';

type Link = {
  original_url: string;
}

// Questa pagina non genera HTML, ma esegue solo un'azione server-side.
export default async function ShortCodePage({ params }: { params: { shortCode: string } }) {
  const { shortCode } = params;

  try {
    const result = await sql<Link>`
      SELECT original_url FROM links WHERE short_code = ${shortCode}
    `;

    const link = result.rows[0];

    if (!link) {
      // Se il codice non esiste nel DB, mostra la pagina 404 di Next.js
      notFound();
    }

    // Se il link viene trovato, esegui un redirect permanente (308)
    // all'URL originale.
    redirect(link.original_url);

  } catch (error) {
    console.error('Redirect Error:', error);
    // In caso di errore del DB, reindirizza a una pagina di errore o alla home.
    // Per ora, mandiamo alla home.
    redirect('/');
  }
}