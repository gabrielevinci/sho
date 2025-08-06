'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import FolderSidebar, { Folder } from './components/FolderSidebar';
import FolderizedLinksList from './components/FolderizedLinksList';
import { deleteLink } from './actions';
import ToastContainer from './components/Toast';
import { useToast } from '../hooks/use-toast';
import { useDashboardData } from '../hooks/use-dashboard-data';
import { useStatsPreloader } from '../hooks/use-stats-preloader';
import { preloadDashboardData, invalidateCacheOnReload } from '../lib/data-preloader';
import { logger, UI_CONFIG } from '../lib/dashboard-config';

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
  userId: string; // Aggiungiamo l'userId
}

export default function DashboardClient({ 
  initialActiveWorkspace, 
  initialLinks,
  userId 
}: DashboardClientProps) {
  // Stati principali
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [defaultFolderId, setDefaultFolderId] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkFromDB[]>(initialLinks);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(initialActiveWorkspace?.id || null);
  const [isMovingLinks, setIsMovingLinks] = useState(false);
  
  // Stati per il loading
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFoldersLoading, setIsFoldersLoading] = useState(false);
  const [isLinksLoading, setIsLinksLoading] = useState(false);
  
  // Stati per la cronologia di navigazione
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [navigationIndex, setNavigationIndex] = useState<number>(-1);
  
  const { toasts, removeToast, success, error: showError } = useToast();
  
  // Hook per la gestione dei dati della dashboard
  const { isLoading: isDataLoading, refreshData } = useDashboardData({
    workspaceId: initialActiveWorkspace?.id || '',
    onError: showError
  });
  
  // Hook per il precaricamento delle statistiche
  const { preloadStatsForVisibleLinks } = useStatsPreloader();
  
  // Ref per evitare race conditions
  const initializationDoneRef = useRef(false);
  
  // Salva i dati di sessione iniziali per le statistiche
  // Effetto per invalidare la cache se la pagina è stata ricaricata
  useEffect(() => {
    invalidateCacheOnReload();
  }, []);

  useEffect(() => {
    if (initialActiveWorkspace?.id && userId) {
      localStorage.setItem('currentWorkspaceId', initialActiveWorkspace.id);
      localStorage.setItem('currentUserId', userId);
      
      // Rileva se la pagina è stata ricaricata
      const isReload = performance.getEntriesByType('navigation').length > 0 
        ? (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).type === 'reload'
        : performance.navigation?.type === performance.navigation?.TYPE_RELOAD;
      
      // Avvia il precaricamento lato client in background
      // Forza il refresh se la pagina è stata ricaricata
      preloadDashboardData(initialActiveWorkspace.id, userId, isReload).catch(error => {
        console.warn('⚠️ Precaricamento fallito (non critico):', error);
      });
    }
  }, [initialActiveWorkspace?.id, userId]);
  
  // Sincronizza lo stato dei link quando initialLinks cambia
  useEffect(() => {
    if (JSON.stringify(links) !== JSON.stringify(initialLinks)) {
      setLinks(initialLinks);
      
      // Precarica statistiche per i link visibili
      if (initialActiveWorkspace?.id && userId && initialLinks.length > 0) {
        preloadStatsForVisibleLinks(initialLinks, initialActiveWorkspace.id, userId);
      }
    }
  }, [initialLinks, initialActiveWorkspace?.id, userId, preloadStatsForVisibleLinks]);
  
  // Gestisce il cambio di workspace
  useEffect(() => {
    if (initialActiveWorkspace?.id && initialActiveWorkspace.id !== currentWorkspaceId) {
      console.log('🔄 Cambio workspace rilevato:', initialActiveWorkspace.id);
      setCurrentWorkspaceId(initialActiveWorkspace.id);
      
      // Salva workspaceId e userId nel localStorage per le statistiche
      localStorage.setItem('currentWorkspaceId', initialActiveWorkspace.id);
      localStorage.setItem('currentUserId', userId);
      
      // Reset completo dello stato
      setSelectedFolderId(null);
      setDefaultFolderId(null);
      setFolders([]);
      setNavigationHistory([]);
      setNavigationIndex(-1);
      initializationDoneRef.current = false;
      setIsInitialLoading(true);
    }
  }, [initialActiveWorkspace?.id, currentWorkspaceId, userId]);
  
  // Inizializzazione delle cartelle - eseguito solo una volta per workspace
  useEffect(() => {
    if (!initialActiveWorkspace?.id || initializationDoneRef.current) {
      return;
    }
    
    const initializeFolders = async () => {
      logger.debug('Inizializzazione cartelle per workspace:', initialActiveWorkspace.id);
      setIsFoldersLoading(true);
      
      // Aggiungi un delay per evitare il flash
      await new Promise(resolve => setTimeout(resolve, UI_CONFIG.INITIAL_LOAD_DELAY));
      
      try {
        const data = await refreshData('folders');
        
        if (data?.folders) {
          setFolders(data.folders);
          const defaultFolder = data.folders.find((f: { name: string; id: string }) => f.name === 'Tutti i link');
          
          if (defaultFolder) {
            setDefaultFolderId(defaultFolder.id);
            setSelectedFolderId(defaultFolder.id);
            setNavigationHistory([defaultFolder.id]);
            setNavigationIndex(0);
            logger.info('Cartella predefinita selezionata:', defaultFolder.name);
          }
        }
      } catch (error) {
        logger.error('Errore durante l\'inizializzazione delle cartelle:', error);
      } finally {
        setIsFoldersLoading(false);
        setIsInitialLoading(false);
        initializationDoneRef.current = true;
      }
    };
    
    initializeFolders();
  }, [initialActiveWorkspace?.id, refreshData]);
  
  const handleUpdateLinks = useCallback(async () => {
    if (!initialActiveWorkspace?.id || isLinksLoading || isDataLoading) return;
    
    logger.debug('Aggiornamento link richiesto');
    setIsLinksLoading(true);
    
    try {
      const data = await refreshData('links');
      if (data?.links) {
        logger.info(`Caricati ${data.links.length} link aggiornati`);
        setLinks(data.links);
        
        // Precarica statistiche per i nuovi link
        if (userId) {
          preloadStatsForVisibleLinks(data.links, initialActiveWorkspace.id, userId);
        }
      }
    } catch (error) {
      logger.error('Errore durante l\'aggiornamento dei link:', error);
    } finally {
      setIsLinksLoading(false);
    }
  }, [initialActiveWorkspace?.id, isLinksLoading, isDataLoading, refreshData, userId, preloadStatsForVisibleLinks]);

  const handleUpdateFolders = useCallback(async () => {
    if (!initialActiveWorkspace?.id || isFoldersLoading || isDataLoading) return;
    
    logger.debug('Aggiornamento cartelle richiesto');
    setIsFoldersLoading(true);
    
    try {
      const data = await refreshData('folders');
      if (data?.folders) {
        logger.info(`Caricate ${data.folders.length} cartelle aggiornate`);
        setFolders(data.folders);
        
        // Mantieni la selezione corrente se la cartella esiste ancora
        if (selectedFolderId) {
          const selectedFolderExists = data.folders.some((f: Folder) => f.id === selectedFolderId);
          if (!selectedFolderExists) {
            const defaultFolder = data.folders.find((f: { name: string; id: string }) => f.name === 'Tutti i link');
            if (defaultFolder) {
              setSelectedFolderId(defaultFolder.id);
              setDefaultFolderId(defaultFolder.id);
            }
          }
        } else {
          const defaultFolder = data.folders.find((f: { name: string; id: string }) => f.name === 'Tutti i link');
          if (defaultFolder) {
            setSelectedFolderId(defaultFolder.id);
            setDefaultFolderId(defaultFolder.id);
          }
        }
      }
    } catch (error) {
      logger.error('Errore durante l\'aggiornamento delle cartelle:', error);
    } finally {
      setIsFoldersLoading(false);
    }
  }, [initialActiveWorkspace?.id, selectedFolderId, isFoldersLoading, isDataLoading, refreshData]);

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
    setIsMovingLinks(true); // Inizia il loading
    try {
      // Aggiornamento ottimistico: aggiorna subito l'interfaccia
      setLinks(prev => prev.map(link => {
        if (link.id === linkId) {
          return {
            ...link,
            folder_id: folderId,
            // Se si sposta in una cartella specifica, aggiorna anche le cartelle multiple
            folders: folderId ? [{
              id: folderId,
              name: folders.find(f => f.id === folderId)?.name || 'Cartella',
              parent_folder_id: folders.find(f => f.id === folderId)?.parent_folder_id || null
            }] : []
          };
        }
        return link;
      }));
      
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
        // IMPORTANTE: Ricarica tutti i link per avere le associazioni multiple aggiornate dal server
        // Questo assicura che i dati siano sincronizzati con il database
        await handleUpdateLinks();
        
        // Deselect links after moving - use the passed callback or the stored function
        const clearFunc = clearSelection || clearSelectionRef.current;
        if (clearFunc) {
          clearFunc();
        }
        
        // Non mostrare toast qui, sarà gestito da FolderSidebar per operazioni batch
        // o da altri componenti per operazioni singole
      } else {
        // Se c'è stato un errore, ripristina lo stato precedente
        await handleUpdateLinks();
        const errorData = await response.json();
        console.error('❌ Errore API batch-move (drag&drop):', errorData);
        showError('Errore durante lo spostamento del link');
      }
    } catch (error) {
      // Se c'è stato un errore, ripristina lo stato precedente
      await handleUpdateLinks();
      console.error('❌ Errore durante lo spostamento del link (drag&drop):', error);
      showError('Errore durante lo spostamento del link');
    } finally {
      setIsMovingLinks(false); // Fine loading
    }
  }, [showError, selectedFolderId, handleUpdateLinks, folders]);

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
        {isInitialLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Caricamento dashboard...</p>
            </div>
          </div>
        )}
        
        {!isInitialLoading && initialActiveWorkspace && (
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
                onClearSelectionRef={handleClearSelectionRef}
              />
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto p-6 relative">
                {(isLinksLoading || isFoldersLoading) && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-white rounded-lg shadow-lg p-2 flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-gray-600">
                        {isLinksLoading ? 'Caricamento link...' : 'Caricamento cartelle...'}
                      </span>
                    </div>
                  </div>
                )}
                
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
                  isMovingLinks={isMovingLinks}
                />
              </div>
            </div>
          </div>
        )}
        
        {!isInitialLoading && !initialActiveWorkspace && (
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
