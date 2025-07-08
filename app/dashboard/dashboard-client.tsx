'use client';

import { useCallback, useState, useEffect } from 'react';
import FolderSidebar, { Folder } from './components/FolderSidebar';
import FolderizedLinksList from './components/FolderizedLinksList';
import WorkspaceSwitcher from './workspace-switcher';
import { deleteLink } from './analytics/[shortCode]/actions';
import ToastContainer from './components/Toast';
import { useToast } from '../hooks/use-toast';

type Workspace = {
  id: string;
  name: string;
};

type LinkFromDB = {
  id: string;
  short_code: string;
  original_url: string;
  created_at: Date;
  title: string | null;
  description: string | null;
  click_count: number;
  folder_id: string | null;
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
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [defaultFolderId, setDefaultFolderId] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkFromDB[]>(initialLinks);
  const [folders, setFolders] = useState<Folder[]>([]);
  const { toasts, removeToast, success, error: showError } = useToast();
  
  // Sincronizza lo stato dei link quando initialLinks cambia
  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);
  
  // Trova l'ID della cartella "Tutti i link" al caricamento
  const findDefaultFolderId = useCallback(async () => {
    if (!initialActiveWorkspace) return;
    
    try {
      const response = await fetch(`/api/folders?workspaceId=${initialActiveWorkspace.id}`);
      const data = await response.json();
      
      if (data.folders) {
        setFolders(data.folders);
        const defaultFolder = data.folders.find((f: { name: string; id: string }) => f.name === 'Tutti i link');
        if (defaultFolder) {
          setDefaultFolderId(defaultFolder.id);
          // Se non c'è una cartella selezionata, seleziona quella di default
          if (selectedFolderId === null) {
            setSelectedFolderId(defaultFolder.id);
          }
        }
      }
    } catch (error) {
      console.error('Errore durante il caricamento delle cartelle:', error);
    }
  }, [initialActiveWorkspace, selectedFolderId]);

  useEffect(() => {
    findDefaultFolderId();
  }, [findDefaultFolderId]);
  
  const handleUpdateLinks = useCallback(async () => {
    // Ricarica solo i link senza refreshare la pagina
    if (!initialActiveWorkspace) return;
    
    try {
      const response = await fetch(`/api/links?workspaceId=${initialActiveWorkspace.id}`);
      const data = await response.json();
      
      if (data.links) {
        setLinks(data.links);
      }
    } catch (error) {
      console.error('Errore durante il caricamento dei link:', error);
    }
  }, [initialActiveWorkspace]);

  const handleUpdateFolders = useCallback(async () => {
    // Ricarica solo le cartelle senza refreshare la pagina
    if (!initialActiveWorkspace) return;
    
    try {
      const response = await fetch(`/api/folders?workspaceId=${initialActiveWorkspace.id}`);
      const data = await response.json();
      
      if (data.folders) {
        setFolders(data.folders);
      }
    } catch (error) {
      console.error('Errore durante il caricamento delle cartelle:', error);
    }
  }, [initialActiveWorkspace]);

  const handleDeleteLink = useCallback(async (shortCode: string) => {
    try {
      await deleteLink(shortCode);
      // Rimuovi il link dallo stato locale
      setLinks(prev => prev.filter(link => link.short_code !== shortCode));
      success('Link eliminato con successo');
    } catch (error) {
      console.error('Errore durante l\'eliminazione del link:', error);
      showError('Errore durante l\'eliminazione del link');
    }
  }, [success, showError]);

  const handleLinkDrop = useCallback(async (linkId: string, folderId: string | null) => {
    try {
      const response = await fetch('/api/links/move', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkId,
          folderId
        }),
      });

      if (response.ok) {
        // Aggiorna lo stato locale del link
        setLinks(prev => prev.map(link => 
          link.id === linkId ? { ...link, folder_id: folderId } : link
        ));
        success('Link spostato con successo');
      } else {
        console.error('Errore durante lo spostamento del link');
        showError('Errore durante lo spostamento del link');
      }
    } catch (error) {
      console.error('Errore durante lo spostamento del link:', error);
      showError('Errore durante lo spostamento del link');
    }
  }, [success, showError]);

  const handleUpdateLink = useCallback((shortCode: string, updates: Partial<LinkFromDB>) => {
    setLinks(prev => prev.map(link => 
      link.short_code === shortCode ? { ...link, ...updates } : link
    ));
  }, []);

  const handleToast = useCallback((message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      success(message);
    } else {
      showError(message);
    }
  }, [success, showError]);

  return (
    <div className="w-full h-full flex flex-col">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <WorkspaceSwitcher 
          workspaces={initialWorkspaces} 
          activeWorkspace={initialActiveWorkspace}
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {initialActiveWorkspace && (
          <div className="flex w-full h-full">
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
              <FolderSidebar
                workspaceId={initialActiveWorkspace.id}
                selectedFolderId={selectedFolderId}
                onFolderSelect={setSelectedFolderId}
                onFoldersChange={handleUpdateFolders}
                onLinkDrop={handleLinkDrop}
                folders={folders}
              />
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Link in: <span className="text-blue-600">{initialActiveWorkspace.name}</span>
                </h2>
              </div>
              
              <div className="flex-1 overflow-auto p-6">
                <FolderizedLinksList
                  links={links}
                  selectedFolderId={selectedFolderId}
                  defaultFolderId={defaultFolderId}
                  onUpdateLinks={handleUpdateLinks}
                  onDeleteLink={handleDeleteLink}
                  onUpdateLink={handleUpdateLink}
                  onToast={handleToast}
                />
              </div>
            </div>
          </div>
        )}
        
        {!initialActiveWorkspace && (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center bg-white rounded-lg shadow-md p-8">
              <h2 className="text-xl font-semibold text-gray-700">Nessun workspace trovato.</h2>
              <p className="text-gray-500 mt-2">Crea il tuo primo workspace per iniziare a shortare i link.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
