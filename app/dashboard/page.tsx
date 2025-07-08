import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { logout, createDefaultFolder } from './actions';
import DashboardClient from './dashboard-client';
import Link from 'next/link';

type Workspace = {
  id: string;
  name: string;
};

export type LinkFromDB = {
  id: string;
  short_code: string;
  original_url: string;
  created_at: Date;
  title: string | null;
  description: string | null;
  click_count: number;
  unique_click_count: number; // Add unique click count field
  folder_id: string | null;
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

async function getLinksForWorkspace(userId: string, workspaceId: string): Promise<LinkFromDB[]> {
  try {
    // Usa la stessa logica delle analytics per calcolare i click reali
    const { rows } = await sql<LinkFromDB>`
      SELECT 
        l.id, 
        l.short_code, 
        l.original_url, 
        l.created_at, 
        l.title, 
        l.description, 
        l.folder_id,
        -- Calcola i click reali dalla tabella clicks (stesso calcolo delle analytics)
        COALESCE(COUNT(c.id), 0)::integer as click_count,
        COALESCE(COUNT(DISTINCT c.user_fingerprint), 0)::integer as unique_click_count
      FROM links l
      LEFT JOIN clicks c ON c.link_id = l.id
      WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId}
      GROUP BY l.id, l.short_code, l.original_url, l.created_at, l.title, l.description, l.folder_id
      ORDER BY l.created_at DESC
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

  // Crea automaticamente la cartella "Tutti i link" se non esiste
  if (session.workspaceId) {
    await createDefaultFolder(session.workspaceId, session.userId);
  }

  const activeWorkspace = userWorkspaces.find(ws => ws.id === session.workspaceId);
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          </div>
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
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <DashboardClient 
          initialWorkspaces={userWorkspaces} 
          initialActiveWorkspace={activeWorkspace}
          initialLinks={userLinks}
        />
      </div>
    </div>
  );
}