'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import FolderSidebar, { Folder } from './components/FolderSidebar';
import FolderizedLinksList from './components/FolderizedLinksList';
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
  unique_click_count: number; // Add unique click count field
  folder_id: string | null; // Manteniamo per compatibilità
  // Nuove proprietà per cartelle multiple
  folders?: Array<{
    id: string;
    name: string;
    parent_folder_id: string | null;
  }>;
};

interface DashboardClientProps {
  initialActiveWorkspace: Workspace | undefined;
  initialLinks: LinkFromDB[];
}

export default function DashboardClient({ 
  initialActiveWorkspace, 
  initialLinks 
}: DashboardClientProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [defaultFolderId, setDefaultFolderId] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkFromDB[]>(initialLinks);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(initialActiveWorkspace?.id || null);
  
  // Stati per la cronologia di navigazione
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [navigationIndex, setNavigationIndex] = useState<number>(-1);
  
  const { toasts, removeToast, success, error: showError } = useToast();
  
  // Sincronizza lo stato dei link quando initialLinks cambia
  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);
  
  // Rileva il cambio di workspace e reimposta la selezione della cartella
  useEffect(() => {
    if (initialActiveWorkspace?.id && initialActiveWorkspace.id !== currentWorkspaceId) {
      setCurrentWorkspaceId(initialActiveWorkspace.id);
      // Reset della selezione della cartella quando cambia workspace
      setSelectedFolderId(null);
      setDefaultFolderId(null);
      setFolders([]);
      // Reset della cronologia di navigazione
      setNavigationHistory([]);
      setNavigationIndex(-1);
    }
  }, [initialActiveWorkspace?.id, currentWorkspaceId]);
  
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
          // Seleziona sempre la cartella "Tutti i link" quando viene trovata
          setSelectedFolderId(defaultFolder.id);
          // Inizializza la cronologia di navigazione
          setNavigationHistory([defaultFolder.id]);
          setNavigationIndex(0);
        }
      }
    } catch (error) {
      console.error('Errore durante il caricamento delle cartelle:', error);
    }
  }, [initialActiveWorkspace]);

  useEffect(() => {
    findDefaultFolderId();
  }, [findDefaultFolderId]);
  
  const handleUpdateLinks = useCallback(async () => {
    // Ricarica solo i link senza refreshare la pagina
    if (!initialActiveWorkspace) return;
    
    try {
      // Usa sempre l'API con supporto per cartelle multiple
      const apiUrl = `/api/links-with-folders?workspaceId=${initialActiveWorkspace.id}`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.links) {
        console.log(`✅ Caricati ${data.links.length} link, aggiornando stato...`);
        
        // Debug: Mostra le prime associazioni per verificare
        if (data.links.length > 0) {
          const sampleLink = data.links[0];
          console.log('� Debug - Primo link:', {
            id: sampleLink.id,
            title: sampleLink.title || sampleLink.original_url,
            folders: sampleLink.folders?.length || 0,
            folderNames: sampleLink.folders?.map((f: { name: string }) => f.name) || []
          });
        }
        
        setLinks(data.links);
        console.log('✅ Stato link aggiornato');
      }
    } catch (error) {
      console.error('❌ Errore durante il caricamento dei link:', error);
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
        
        // Mantieni la selezione corrente se la cartella esiste ancora
        if (selectedFolderId) {
          const selectedFolderExists = data.folders.some((f: Folder) => f.id === selectedFolderId);
          if (!selectedFolderExists) {
            // Se la cartella selezionata non esiste più, seleziona la cartella "Tutti i link"
            const defaultFolder = data.folders.find((f: { name: string; id: string }) => f.name === 'Tutti i link');
            if (defaultFolder) {
              setSelectedFolderId(defaultFolder.id);
              setDefaultFolderId(defaultFolder.id);
            }
          }
        } else {
          // Se non c'è selezione, seleziona la cartella "Tutti i link"
          const defaultFolder = data.folders.find((f: { name: string; id: string }) => f.name === 'Tutti i link');
          if (defaultFolder) {
            setSelectedFolderId(defaultFolder.id);
            setDefaultFolderId(defaultFolder.id);
          }
        }
      }
    } catch (error) {
      console.error('Errore durante il caricamento delle cartelle:', error);
    }
  }, [initialActiveWorkspace, selectedFolderId]);

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

  const handleFolderSelect = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
    
    // Gestione della cronologia di navigazione
    const targetId = folderId || '';
    
    setNavigationHistory(prev => {
      // Rimuovi tutto quello che viene dopo l'indice corrente
      const newHistory = prev.slice(0, navigationIndex + 1);
      // Aggiungi la nuova cartella solo se diversa dall'ultima
      if (newHistory.length === 0 || newHistory[newHistory.length - 1] !== targetId) {
        newHistory.push(targetId);
      }
      return newHistory;
    });
    
    setNavigationIndex(prev => {
      // Se la cronologia è vuota o l'ultima voce è diversa, incrementa l'indice
      if (navigationHistory.length === 0 || 
          navigationIndex < 0 || 
          navigationHistory[navigationIndex] !== targetId) {
        return prev + 1;
      }
      return prev;
    });
  }, [navigationHistory, navigationIndex]);
  
  // Funzione per gestire i cambi di navigazione dai pulsanti
  const handleNavigationChange = useCallback((history: string[], index: number) => {
    setNavigationHistory(history);
    setNavigationIndex(index);
  }, []);

  // Reference to the clear selection function from FolderizedLinksList
  const clearSelectionRef = useRef<(() => void) | null>(null);
  
  const handleClearSelectionRef = useCallback((func: () => void) => {
    clearSelectionRef.current = func;
  }, []);
  
  const handleLinkDrop = useCallback(async (linkId: string, folderId: string | null, clearSelection?: () => void) => {
    try {
      // Usa l'API batch-move anche per un singolo link per uniformare il comportamento
      const response = await fetch('/api/links/batch-move', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkIds: [linkId],
          folderId,
          sourceFolderId: selectedFolderId === 'all' ? null : selectedFolderId // Passa la cartella di origine
        }),
      });

      if (response.ok) {
        // IMPORTANTE: Ricarica tutti i link per avere le associazioni multiple aggiornate
        // Non aggiornare lo stato locale, ma ricarica dal server
        await handleUpdateLinks();
        
        // Deselect links after moving - use the passed callback or the stored function
        const clearFunc = clearSelection || clearSelectionRef.current;
        if (clearFunc) {
          clearFunc();
        }
        
        // Non mostrare toast qui, sarà gestito da FolderSidebar per operazioni batch
        // o da altri componenti per operazioni singole
      } else {
        const errorData = await response.json();
        console.error('❌ Errore API batch-move (drag&drop):', errorData);
        showError('Errore durante lo spostamento del link');
      }
    } catch (error) {
      console.error('❌ Errore durante lo spostamento del link (drag&drop):', error);
      showError('Errore durante lo spostamento del link');
    }
  }, [showError, selectedFolderId, handleUpdateLinks]);

  const handleUpdateLink = useCallback((shortCode: string, updates: Partial<LinkFromDB>) => {
    setLinks(prev => prev.map(link => {
      if (link.short_code === shortCode) {
        // Preserviamo i riferimenti alle cartelle multiple anche quando si aggiorna il link
        // così non perdiamo le associazioni multiple quando si sposta un link
        return { 
          ...link, 
          ...updates,
          // Se si sta impostando un nuovo folder_id ma il link ha già folders, manteniamoli
          folders: updates.folders || link.folders
        };
      }
      return link;
    }));
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

      <div className="flex-1 flex overflow-hidden">
        {initialActiveWorkspace && (
          <div className="flex w-full h-full">
            <div className="w-96 dashboard-sidebar bg-gray-50 border-r border-gray-200 flex flex-col h-full transition-all duration-300">
              <FolderSidebar
                workspaceId={initialActiveWorkspace?.id || ''}
                selectedFolderId={selectedFolderId}
                onFolderSelect={handleFolderSelect}
                onFoldersChange={handleUpdateFolders}
                onLinkDrop={handleLinkDrop}
                onToast={handleToast}
                folders={folders}
                onClearSelectionRef={handleClearSelectionRef} // Pass the clearSelectionRef function
              />
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto p-6">
                <FolderizedLinksList
                  links={links}
                  selectedFolderId={selectedFolderId}
                  defaultFolderId={defaultFolderId}
                  onUpdateLinks={handleUpdateLinks}
                  onDeleteLink={handleDeleteLink}
                  onUpdateLink={handleUpdateLink}
                  onToast={handleToast}
                  folders={folders}
                  onClearSelectionRef={handleClearSelectionRef}
                  onFolderSelect={handleFolderSelect}
                  enableMultipleFolders={true}
                  navigationHistory={navigationHistory}
                  navigationIndex={navigationIndex}
                  onNavigationChange={handleNavigationChange}
                />
              </div>
            </div>
          </div>
        )}
        
        {!initialActiveWorkspace && (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center bg-white rounded-3xl shadow-md p-8">
              <h2 className="text-xl font-semibold text-gray-700">Nessun workspace trovato.</h2>
              <p className="text-gray-500 mt-2">Crea il tuo primo workspace per iniziare a shortare i link.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
