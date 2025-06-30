import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { logout } from './actions';
import CreateLinkForm from './create-link-form';
import LinkList from './link-list'; // <-- 1. Importiamo il nuovo componente
import { sql } from '@vercel/postgres';

// Definiamo un tipo per i nostri link, per avere type safety.
type Link = {
  id: number;
  short_code: string;
  original_url: string;
  created_at: Date;
};

function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
      >
        Logout
      </button>
    </form>
  );
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    redirect('/login');
  }

  // --- 2. Data Fetching ---
  // Interroghiamo il database per ottenere i link dell'utente.
  // Ordiniamo per data di creazione decrescente per mostrare i più recenti in cima.
  const { rows: links } = await sql<Link>`
    SELECT id, short_code, original_url, created_at 
    FROM links 
    WHERE user_id = ${session.userId} 
    ORDER BY created_at DESC;
  `;
  
  // --- 3. Costruzione del Base URL ---
  // Necessario per costruire gli URL completi da mostrare e copiare.
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 py-12">
      <div className="w-full max-w-4xl p-4 sm:p-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <LogoutButton />
        </div>

        <CreateLinkForm />

        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">I tuoi link</h2>
          {/* --- 4. Integrazione del Componente --- */}
          {/* Passiamo la lista di link e il base URL al componente che li renderizzerà. */}
          <LinkList links={links} baseUrl={baseUrl} />
        </div>
      </div>
    </div>
  );
}