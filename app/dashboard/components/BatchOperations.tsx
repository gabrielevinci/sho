'use client';

import { useState, useRef, useEffect } from 'react';
import { TrashIcon, ArrowPathIcon, FolderIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Folder } from './FolderSidebar';
import ConfirmationModal from './ConfirmationModal';

interface BatchOperationsProps {
  selectedLinks: string[];
  folders: Folder[];
  onBatchDelete: (linkIds: string[]) => Promise<void>;
  onBatchResetClicks: (linkIds: string[]) => Promise<void>;
  onBatchMoveToFolder: (linkIds: string[], folderId: string | null) => Promise<void>;
  onClearSelection: () => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

export default function BatchOperations({
  selectedLinks,
  folders,
  onBatchDelete,
  onBatchResetClicks,
  onBatchMoveToFolder,
  onClearSelection,
  onToast
}: BatchOperationsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Funzione per creare l'albero delle cartelle con le rientranze
  const buildFlatFolderList = (folders: Folder[]): Array<{folder: Folder, depth: number}> => {
    type FolderWithChildren = Folder & {children: FolderWithChildren[]};
    const folderMap = new Map<string, FolderWithChildren>();
    
    // Crea una mappa delle cartelle con i loro figli
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });
    
    const rootFolders: FolderWithChildren[] = [];
    
    // Costruisce l'albero
    folders.forEach(folder => {
      const folderWithChildren = folderMap.get(folder.id)!;
      
      if (folder.parent_folder_id) {
        const parent = folderMap.get(folder.parent_folder_id);
        if (parent) {
          parent.children.push(folderWithChildren);
        }
      } else {
        rootFolders.push(folderWithChildren);
      }
    });
    
    // Funzione ricorsiva per appiattire l'albero
    const flattenTree = (folder: FolderWithChildren, depth: number = 0): Array<{folder: Folder, depth: number}> => {
      const result = [{ folder: folder as Folder, depth }];
      
      if (folder.children) {
        folder.children.forEach((child: FolderWithChildren) => {
          result.push(...flattenTree(child, depth + 1));
        });
      }
      
      return result;
    };
    
    // Appiattisce l'albero mantenendo l'ordine gerarchico
    const flatList: Array<{folder: Folder, depth: number}> = [];
    rootFolders.forEach(root => {
      flatList.push(...flattenTree(root));
    });
    
    return flatList;
  };

  const flatFolderList = buildFlatFolderList(folders);

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFolderDropdown(false);
      }
    };

    if (showFolderDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFolderDropdown]);

  const handleBatchDelete = async () => {
    setIsDeleting(true);
    try {
      await onBatchDelete(selectedLinks);
      setShowDeleteModal(false);
      onClearSelection();
      onToast?.(`${selectedLinks.length} link eliminati con successo`, 'success');
    } catch (error) {
      console.error('Errore durante l\'eliminazione batch:', error);
      onToast?.('Errore durante l\'eliminazione dei link', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBatchResetClicks = async () => {
    setIsResetting(true);
    try {
      await onBatchResetClicks(selectedLinks);
      setShowResetModal(false);
      onClearSelection();
      onToast?.(`Click azzerati per ${selectedLinks.length} link`, 'success');
    } catch (error) {
      console.error('Errore durante l\'azzeramento batch:', error);
      onToast?.('Errore durante l\'azzeramento dei click', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    setIsMoving(true);
    try {
      await onBatchMoveToFolder(selectedLinks, folderId);
      setShowFolderDropdown(false);
      onClearSelection();
      const folderName = folderId ? folders.find(f => f.id === folderId)?.name : 'Tutti i link';
      onToast?.(`Tutti i link sono stati spostati in "${folderName}"`, 'success');
    } catch (error) {
      console.error('Errore durante lo spostamento batch:', error);
      onToast?.('Errore durante lo spostamento dei link', 'error');
    } finally {
      setIsMoving(false);
    }
  };

  if (selectedLinks.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-blue-900">
            {selectedLinks.length} link selezionati
          </span>
          <button
            onClick={onClearSelection}
            className="text-sm text-blue-700 hover:text-blue-900 underline"
          >
            Deseleziona tutto
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Sposta in cartella */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowFolderDropdown(!showFolderDropdown)}
              disabled={isMoving}
              className="flex items-center space-x-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <FolderIcon className="h-4 w-4" />
              <span>Sposta in</span>
              <ChevronDownIcon className="h-4 w-4" />
            </button>
            
            {showFolderDropdown && (
              <div className="absolute top-full mt-1 right-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="py-1 max-h-64 overflow-y-auto">
                  {flatFolderList.map(({ folder, depth }) => (
                    <button
                      key={folder.id}
                      onClick={() => handleMoveToFolder(folder.id)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      style={{ paddingLeft: `${16 + depth * 20}px` }}
                    >
                      <span>{folder.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Azzera click */}
          <button
            onClick={() => setShowResetModal(true)}
            disabled={isResetting}
            className="flex items-center space-x-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>Azzera click</span>
          </button>
          
          {/* Elimina */}
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={isDeleting}
            className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            <TrashIcon className="h-4 w-4" />
            <span>Elimina</span>
          </button>
        </div>
      </div>
      
      {/* Modals */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleBatchDelete}
        title="Elimina Link Selezionati"
        message={`Sei sicuro di voler eliminare ${selectedLinks.length} link selezionati? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        type="delete"
        isLoading={isDeleting}
      />
      
      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleBatchResetClicks}
        title="Azzera Click"
        message={`Sei sicuro di voler azzerare i click per ${selectedLinks.length} link selezionati? Questa azione non può essere annullata.`}
        confirmText="Azzera"
        type="reset"
        isLoading={isResetting}
      />
    </div>
  );
}
