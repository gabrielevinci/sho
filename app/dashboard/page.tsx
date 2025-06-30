import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { logout } from './actions';
import CreateLinkForm from './create-link-form';
import LinksList, { LinkFromDB } from './links-list';
import WorkspaceSwitcher from './workspace-switcher'; // Il tuo componente avanzato

// Definiamo il tipo per un Workspace
type Workspace = {
  id: string;
  name: string;
};

// Funzione per recuperare i workspace dell'utente
async function getWorkspacesForUser(userId: string): Promise<Workspace[]> {
  try {
    const { rows } = await sql<Workspace>`
      SELECT id, name FROM workspaces WHERE user_id = ${userId} ORDER BY name ASC
    `;
    return rows;
  } catch (error) {
    console.error("Failed to fetch workspaces:", error);
    return [];
  }
}

// Funzione per recuperare i link per un dato workspace
async function getLinksForWorkspace(userId: string, workspaceId: string): Promise<LinkFromDB[]> {
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
    return [];
  }
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    redirect('/login');
  }

  // Recuperiamo tutti i dati necessari in parallelo
  const userWorkspaces = await getWorkspacesForUser(session.userId);

  // Se l'utente ha dei workspace ma non ne ha uno attivo nella sessione,
  // impostiamo il primo della lista come attivo e salviamo la sessione.
  // Questo migliora l'esperienza del primo accesso o di sessioni "orfane".
  if (!session.workspaceId && userWorkspaces.length > 0) {
    session.workspaceId = userWorkspaces[0].id;
    await session.save();
  }

  // Ora che siamo sicuri che workspaceId (se disponibile) è nella sessione,
  // recuperiamo i link corrispondenti.
  const userLinks = session.workspaceId 
    ? await getLinksForWorkspace(session.userId, session.workspaceId) 
    : [];

  // Determiniamo il workspace attivo per passarlo ai componenti
  const activeWorkspace = userWorkspaces.find(ws => ws.id === session.workspaceId);
  
  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 py-12">
      <div className="w-full max-w-5xl p-4 md:p-8 space-y-8">
        
        <header className="flex justify-between items-center">
          {/* Usiamo il TUO componente WorkspaceSwitcher, passandogli le props corrette */}
          <WorkspaceSwitcher 
            workspaces={userWorkspaces} 
            activeWorkspace={activeWorkspace}
          />
          <form action={logout}>
            <button type="submit" className="ml-4 px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">
              Logout
            </button>
          </form>
        </header>

        <main className="space-y-12">
          {/* Mostriamo il form di creazione solo se c'è un workspace attivo */}
          {activeWorkspace ? (
            <>
              <CreateLinkForm />
              
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  Link in: <span className="text-blue-600">{activeWorkspace.name}</span>
                </h2>
                <LinksList links={userLinks} />
              </div>
            </>
          ) : (
            <div className="text-center p-12 bg-white rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700">Nessun workspace trovato.</h2>
              <p className="text-gray-500 mt-2">Crea il tuo primo workspace per iniziare a shortare i link.</p>
            </div>
          )}
        </main>
        
      </div>
    </div>
  );
}