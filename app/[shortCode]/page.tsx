import { sql } from '@vercel/postgres';
import { notFound, redirect } from 'next/navigation';

// Non definiamo più l'intera `props` della pagina.
// Tipizziamo solo il pezzo che destrutturiamo, che è `params`.
// Questo è un approccio più robusto e meno fragile.
export default async function ShortCodePage({
  params,
}: {
  params: { shortCode: string };
}) {
  const { shortCode } = params;

  // Definiamo il tipo per il risultato del database localmente.
  type LinkFromDb = {
    original_url: string;
  }

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
    redirect('/');
  }
}