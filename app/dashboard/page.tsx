import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { logout } from './actions';
import CreateLinkForm from './create-link-form';
import LinksList, { LinkFromDB } from './links-list'; // Importiamo il componente e il tipo
import { sql } from '@vercel/postgres';

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

// Funzione per recuperare i link dal database
async function getLinksForUser(userId: string, workspaceId: string): Promise<LinkFromDB[]> {
  try {
    const { rows } = await sql<LinkFromDB>`
      SELECT short_code, original_url, created_at
      FROM links
      WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
      ORDER BY created_at DESC
    `;
    return rows;
  } catch (error) {
    console.error("Failed to fetch links:", error);
    return []; // Restituisce un array vuoto in caso di errore
  }
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
    // Se manca anche il workspace, non possiamo mostrare i link
    redirect('/login');
  }

  // Recuperiamo i link per l'utente e il workspace attivi
  const userLinks = await getLinksForUser(session.userId, session.workspaceId);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 py-12">
      <div className="w-full max-w-4xl p-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <LogoutButton />
        </div>

        <CreateLinkForm />

        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">I tuoi link</h2>
          {/* Passiamo i link recuperati al componente di visualizzazione */}
          <LinksList links={userLinks} />
        </div>
      </div>
    </div>
  );
}