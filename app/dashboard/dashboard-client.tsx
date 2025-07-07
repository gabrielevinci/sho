'use client';

import { useCallback } from 'react';
import LinksList from './links-list';
import WorkspaceSwitcher from './workspace-switcher';

type Workspace = {
  id: string;
  name: string;
};

type LinkFromDB = {
  short_code: string;
  original_url: string;
  created_at: Date;
  title: string | null;
  description: string | null;
  click_count: number;
};

interface DashboardClientProps {
  initialWorkspaces: Workspace[];
  initialActiveWorkspace: Workspace | undefined;
  initialLinks: LinkFromDB[];
}

export default function DashboardClient({ 
  initialWorkspaces, 
  initialActiveWorkspace, 
  initialLinks 
}: DashboardClientProps) {
  const handleUpdateLinks = useCallback(() => {
    // Ricarica la pagina per aggiornare i dati
    window.location.reload();
  }, []);

  return (
    <div className="w-full space-y-8 dashboard-container">
      <div className="flex justify-between items-center">
        <WorkspaceSwitcher 
          workspaces={initialWorkspaces} 
          activeWorkspace={initialActiveWorkspace}
        />
      </div>

      <main className="space-y-8">
        {initialActiveWorkspace ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-800">
                Link in: <span className="text-blue-600">{initialActiveWorkspace.name}</span>
              </h2>
              <div className="text-sm text-gray-500">
                {initialLinks.length} link{initialLinks.length !== 1 ? 's' : ''}
              </div>
            </div>
            <LinksList links={initialLinks} onUpdateLinks={handleUpdateLinks} />
          </div>
        ) : (
          <div className="text-center p-12 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700">Nessun workspace trovato.</h2>
            <p className="text-gray-500 mt-2">Crea il tuo primo workspace per iniziare a shortare i link.</p>
          </div>
        )}
      </main>
    </div>
  );
}
