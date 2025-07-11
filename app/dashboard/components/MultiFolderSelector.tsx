'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, FolderIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Folder } from './FolderSidebar';
import { useClickOutside } from '../hooks/useClickOutside';

interface MultiFolderSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  linkId: string;
  linkTitle?: string;
  currentFolders: Array<{
    id: string;
    name: string;
    parent_folder_id: string | null;
  }>;
  availableFolders: Folder[];
  onSave: (linkId: string, selectedFolderIds: string[]) => Promise<void>;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

export default function MultiFolderSelector({
  isOpen,
  onClose,
  linkId,
  linkTitle,
  currentFolders,
  availableFolders,
  onSave,
  onToast
}: MultiFolderSelectorProps) {
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Click esterno per chiudere il modal
  const modalRef = useClickOutside<HTMLDivElement>(() => {
    if (!isLoading) {
      onClose();
    }
  }, isOpen);

  // Inizializza le cartelle selezionate quando il modal si apre
  useEffect(() => {
    if (isOpen) {
      setSelectedFolderIds(new Set(currentFolders.map(folder => folder.id)));
      setSearchTerm('');
    }
  }, [isOpen, currentFolders]);

  // Filtra le cartelle disponibili in base al termine di ricerca
  const filteredFolders = availableFolders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    folder.name !== 'Tutti i link' // Escludi la cartella speciale
  );

  // Crea la struttura gerarchica delle cartelle per visualizzazione migliore
  const buildFolderHierarchy = (folders: Folder[]): Array<{folder: Folder, depth: number, hasChildren: boolean}> => {
    // Ordina le cartelle per posizione e nome come nella sidebar
    const sortedFolders = [...folders].sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      return a.name.localeCompare(b.name);
    });

    type FolderWithChildren = Folder & {children: FolderWithChildren[]};
    const folderMap = new Map<string, FolderWithChildren>();
    
    // Crea una mappa delle cartelle con i loro figli
    sortedFolders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });
    
    const rootFolders: FolderWithChildren[] = [];
    
    // Costruisce l'albero
    sortedFolders.forEach(folder => {
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
    
    // Funzione ricorsiva per appiattire l'albero mantenendo la gerarchia
    const flattenTree = (folder: FolderWithChildren, depth: number = 0): Array<{folder: Folder, depth: number, hasChildren: boolean}> => {
      const result = [{ 
        folder: folder as Folder, 
        depth, 
        hasChildren: folder.children.length > 0 
      }];
      
      if (folder.children && folder.children.length > 0) {
        // Ordina anche i figli per posizione
        const sortedChildren = [...folder.children].sort((a, b) => {
          if (a.position !== b.position) {
            return a.position - b.position;
          }
          return a.name.localeCompare(b.name);
        });
        
        sortedChildren.forEach((child: FolderWithChildren) => {
          result.push(...flattenTree(child, depth + 1));
        });
      }
      
      return result;
    };
    
    // Appiattisce l'albero mantenendo l'ordine gerarchico
    const flatList: Array<{folder: Folder, depth: number, hasChildren: boolean}> = [];
    rootFolders.forEach(root => {
      flatList.push(...flattenTree(root));
    });
    
    return flatList;
  };

  const hierarchicalFolders = buildFolderHierarchy(filteredFolders);

  const toggleFolder = (folderId: string) => {
    setSelectedFolderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(linkId, Array.from(selectedFolderIds));
      onToast?.('Cartelle aggiornate con successo', 'success');
      onClose();
    } catch (error) {
      console.error('Errore salvando le associazioni:', error);
      onToast?.('Errore durante l\'aggiornamento delle cartelle', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header migliorato */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              🗂️ Gestisci Cartelle
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {linkTitle ? `Seleziona le cartelle per "${linkTitle}"` : `Seleziona le cartelle per questo link`}
            </p>
            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
              <span>📁 {availableFolders.filter(f => f.name !== 'Tutti i link').length} cartelle disponibili</span>
              <span>•</span>
              <span>✅ {selectedFolderIds.size} selezionate</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca cartelle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <FolderIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {hierarchicalFolders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FolderIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nessuna cartella trovata</p>
                {searchTerm && (
                  <p className="text-sm mt-1">
                    Prova a modificare i termini di ricerca
                  </p>
                )}
              </div>
            ) : (
              hierarchicalFolders.map(({ folder, depth, hasChildren }) => {
                const isSelected = selectedFolderIds.has(folder.id);
                
                return (
                  <div
                    key={folder.id}
                    className={`
                      flex items-center p-3 rounded-lg border cursor-pointer transition-all
                      ${isSelected 
                        ? 'border-blue-300 bg-blue-50 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                    onClick={() => !isLoading && toggleFolder(folder.id)}
                    style={{ marginLeft: `${depth * 20}px` }}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      {/* Indicatore gerarchia */}
                      {depth > 0 && (
                        <div className="flex items-center mr-2">
                          <div className="w-4 h-4 border-l-2 border-b-2 border-gray-300 rounded-bl-lg"></div>
                        </div>
                      )}
                      
                      {/* Checkbox */}
                      <div className={`
                        flex-shrink-0 w-4 h-4 border-2 rounded mr-3 flex items-center justify-center
                        ${isSelected 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                        }
                      `}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      
                      {/* Informazioni cartella */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center">
                          <FolderIcon className={`h-4 w-4 mr-2 flex-shrink-0 ${
                            depth === 0 ? 'text-blue-500' : 'text-gray-500'
                          }`} />
                          <span className="font-medium text-gray-900 truncate">
                            {folder.name}
                          </span>
                          
                          {/* Badge per indicare livello e sottocartelle */}
                          <div className="flex items-center ml-2 space-x-1">
                            {depth > 0 && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-600 rounded-full text-xs">
                                L{depth + 1}
                              </span>
                            )}
                            {hasChildren && (
                              <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs">
                                {/* Calcola il numero di sottocartelle */}
                                {availableFolders.filter(f => f.parent_folder_id === folder.id).length} sub
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Percorso completo per cartelle annidate */}
                        {depth > 0 && (
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            Posizione: {folder.position} • Livello {depth + 1}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Summary migliorata */}
        {selectedFolderIds.size > 0 && (
          <div className="px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-green-700">
                <PlusIcon className="h-4 w-4 mr-2" />
                <span className="font-medium">
                  {selectedFolderIds.size} cartell{selectedFolderIds.size === 1 ? 'a selezionata' : 'e selezionate'}
                </span>
              </div>
              <div className="text-xs text-green-600">
                Il link sarà visibile in tutte le cartelle selezionate
              </div>
            </div>
          </div>
        )}

        {/* Footer migliorato */}
        <div className="flex items-center justify-between space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="text-sm text-gray-600">
            💡 <strong>Suggerimento:</strong> Puoi selezionare più cartelle per organizzare meglio i tuoi link
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </div>
              ) : (
                'Salva Modifiche'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
