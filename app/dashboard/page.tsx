import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';

import { logout } from './actions';
import CreateLinkForm from './create-link-form';
import LinkList from './link-list';
import WorkspaceSwitcher from './workspace-switcher';

// Definiamo i tipi per i dati che recuperiamo
type Link = {
  id: number;
  short_code: string;
  original_url: string;
  created_at: Date;
};

type Workspace = {
  id: string;
  name: string;
};

function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="text-sm text-gray-600 hover:text-gray-900">
        Logout
      </button>
    </form>
  );
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
    redirect('/login');
  }

  // --- Data Fetching "Workspace-Aware" ---

  const { rows: workspaces } = await sql<Workspace>`
    SELECT id, name 
    FROM workspaces 
    WHERE user_id = ${session.userId} 
    ORDER BY name ASC;
  `;

  const { rows: links } = await sql<Link>`
    SELECT id, short_code, original_url, created_at 
    FROM links 
    WHERE user_id = ${session.userId} AND workspace_id = ${session.workspaceId}
    ORDER BY created_at DESC;
  `;
  
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';

  const activeWorkspace = workspaces.find(ws => ws.id === session.workspaceId);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 py-8">
      <div className="w-full max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
        
        <header className="flex justify-between items-center">
          <WorkspaceSwitcher 
            workspaces={workspaces} 
            activeWorkspace={activeWorkspace} 
          />
          <LogoutButton />
        </header>

        <main>
          <CreateLinkForm />
          <div className="mt-12">
            {/* --- CORREZIONE APPLICATA QUI --- */}
            {/* Abbiamo rimosso gli apici e usato una sintassi JSX pulita. */}
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Link in: <span className="font-bold">{activeWorkspace?.name}</span>
            </h2>
            <LinkList links={links} baseUrl={baseUrl} />
          </div>
        </main>

      </div>
    </div>
  );
}