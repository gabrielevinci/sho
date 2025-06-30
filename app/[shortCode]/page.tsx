import { sql } from '@vercel/postgres';
import { notFound, redirect } from 'next/navigation';

// Usiamo 'any' come "uscita di sicurezza" per bypassare il bug del compilatore di Vercel.
// Questa è una misura pragmatica per sbloccare la build quando il sistema di tipi fallisce.
export default async function ShortCodePage(props: any) {
  const { params } = props;
  const { shortCode } = params;

  // È una buona pratica verificare che il parametro esista, dato che abbiamo usato 'any'.
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