import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { logout } from './actions';
import LinksList, { LinkFromDB } from './links-list';
import WorkspaceSwitcher from './workspace-switcher';
import Link from 'next/link';

type Workspace = {
  id: string;
  name: string;
};

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

// --- MODIFICA QUI ---
// Aggiorniamo la query per recuperare anche click_count.
async function getLinksForWorkspace(userId: string, workspaceId: string): Promise<LinkFromDB[]> {
  try {
    const { rows } = await sql<LinkFromDB>`
      SELECT short_code, original_url, created_at, title, description, click_count
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

  const userWorkspaces = await getWorkspacesForUser(session.userId);

  if (!session.workspaceId && userWorkspaces.length > 0) {
    session.workspaceId = userWorkspaces[0].id;
    await session.save();
  }

  const userLinks = session.workspaceId 
    ? await getLinksForWorkspace(session.userId, session.workspaceId) 
    : [];

  const activeWorkspace = userWorkspaces.find(ws => ws.id === session.workspaceId);
  
  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 py-12">
      <div className="w-full max-w-5xl p-4 md:p-8 space-y-8">
        
        <header className="flex justify-between items-center">
          <WorkspaceSwitcher 
            workspaces={userWorkspaces} 
            activeWorkspace={activeWorkspace}
          />
          <div className="flex items-center space-x-4">
            <Link 
              href="/dashboard/create"
              className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
            >
              Crea Link
            </Link>
            <form action={logout}>
              <button type="submit" className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">
                Logout
              </button>
            </form>
          </div>
        </header>

        <main className="space-y-12">
          {activeWorkspace ? (
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Link in: <span className="text-blue-600">{activeWorkspace.name}</span>
              </h2>
              <LinksList links={userLinks} />
            </div>
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