import { sql } from '@vercel/postgres';
import { notFound, redirect } from 'next/navigation';

// La regola di ESLint viene disabilitata per la riga successiva.
// Questa è la soluzione chirurgica per bypassare sia il bug del compilatore
// che la regola del linter, senza disabilitarla per l'intero progetto.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function ShortCodePage(props: any) {
  const { params } = props;
  const { shortCode } = params;

  if (!shortCode || typeof shortCode !== 'string') {
    notFound();
  }

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