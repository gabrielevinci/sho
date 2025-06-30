import { sql } from '@vercel/postgres';
import { notFound, redirect } from 'next/navigation';

// Disabilitiamo la regola di ESLint per la riga successiva per risolvere il bug di build.
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

  let link: LinkFromDb | undefined;

  // Il blocco try...catch ora avvolge SOLO l'operazione che può fallire: la query al DB.
  try {
    const result = await sql<LinkFromDb>`
      SELECT original_url FROM links WHERE short_code = ${shortCode}
    `;
    link = result.rows[0];
  } catch (error) {
    // Se c'è un errore nel DB, lo logghiamo e reindirizziamo alla home.
    console.error('Database query failed:', error);
    redirect('/');
  }

  // La logica di business è ora fuori dal catch.
  // Se il link non è stato trovato nel DB, mostriamo la pagina 404.
  if (!link) {
    notFound();
  }

  // Se il link esiste, eseguiamo il redirect.
  // L'eccezione NEXT_REDIRECT verrà lanciata qui e gestita correttamente da Next.js.
  redirect(link.original_url);
}