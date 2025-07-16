import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { logout, createDefaultFolder } from './actions';
import DashboardClient from './dashboard-client';
import WorkspaceSwitcher from './workspace-switcher';
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
  // Nuove proprietà per cartelle multiple
  folders?: Array<{
    id: string;
    name: string;
    parent_folder_id: string | null;
  }>;
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
    // Query base per ottenere i link con conteggi dei click usando il nuovo sistema enhanced fingerprinting
    const { rows: links } = await sql`
      SELECT 
        l.id,
        l.short_code,
        l.original_url,
        l.title,
        l.description,
        l.created_at,
        l.folder_id,
        -- Usa i click totali dalla tabella links (più affidabile)
        l.click_count::integer as click_count,
        -- Calcola unique visitors basandosi sui device_fingerprint unici (sistema migliorato)
        COALESCE(
          (SELECT COUNT(DISTINCT ef.device_fingerprint) 
           FROM enhanced_fingerprints ef 
           WHERE ef.link_id = l.id), 
          l.unique_click_count
        )::integer as unique_click_count
      FROM links l
      WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId}
      ORDER BY l.created_at DESC
    `;

    // Se non ci sono link, restituisci array vuoto
    if (links.length === 0) {
      return [];
    }

    // Ottieni tutte le associazioni cartelle per questi link
    const linkIds = links.map(link => link.id);
    const linkPlaceholders = linkIds.map((_, index) => `$${index + 1}`).join(', ');
    
    const associationsQuery = `
      SELECT 
        lfa.link_id,
        f.id as folder_id,
        f.name as folder_name,
        f.parent_folder_id
      FROM link_folder_associations lfa
      JOIN folders f ON lfa.folder_id = f.id
      WHERE lfa.link_id IN (${linkPlaceholders})
        AND lfa.user_id = $${linkIds.length + 1}
        AND lfa.workspace_id = $${linkIds.length + 2}
      ORDER BY f.name ASC
    `;

    const { rows: associations } = await sql.query(associationsQuery, [
      ...linkIds,
      userId,
      workspaceId
    ]);

    // Raggruppa le associazioni per link
    const foldersByLink = new Map<string, Array<{
      id: string;
      name: string;
      parent_folder_id: string | null;
    }>>();

    associations.forEach(assoc => {
      const linkIdString = String(assoc.link_id);
      if (!foldersByLink.has(linkIdString)) {
        foldersByLink.set(linkIdString, []);
      }
      foldersByLink.get(linkIdString)!.push({
        id: assoc.folder_id,
        name: assoc.folder_name,
        parent_folder_id: assoc.parent_folder_id
      });
    });

    // Combina i dati
    const linksWithFolders = (links as LinkFromDB[]).map((link) => ({
      ...link,
      folders: foldersByLink.get(String(link.id)) || []
    })) as LinkFromDB[];

    return linksWithFolders;
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
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link 
              href="/dashboard/create"
              className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
            >
              Crea Link
            </Link>
            <Link 
              href="/dashboard/analytics"
              className="px-5 py-2.5 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
            >
              Statistiche
            </Link>
            {process.env.NODE_ENV === 'development' && (
              <Link 
                href="/dashboard/test-qr-detection"
                className="px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75"
              >
                Test QR
              </Link>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <WorkspaceSwitcher 
              workspaces={userWorkspaces} 
              activeWorkspace={activeWorkspace}
            />
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
          initialActiveWorkspace={activeWorkspace}
          initialLinks={userLinks}
        />
      </div>
    </div>
  );
}