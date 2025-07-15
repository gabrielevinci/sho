'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, FolderOpenIcon, PlusIcon, PencilIcon, TrashIcon, HomeIcon, DocumentIcon, Bars3Icon, ChevronUpIcon } from '@heroicons/react/24/outline';
import DeleteFolderModal from './DeleteFolderModal';
import FolderReorderModal from './FolderReorderModal';
import Portal from './Portal';
import { useClickOutside } from '../hooks/useClickOutside';

export interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  workspace_id: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  position: number;
}

interface FolderSidebarProps {
  workspaceId: string;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onFoldersChange: () => void;
  onLinkDrop: (linkId: string, folderId: string | null, clearSelection?: () => void) => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
  folders?: Folder[];
  onClearSelectionRef?: (func: () => void) => void;
}

interface FolderTreeNode extends Folder {
  children: FolderTreeNode[];
  expanded: boolean;
}

export default function FolderSidebar({ 
  workspaceId, 
  selectedFolderId, 
  onFolderSelect, 
  onFoldersChange,
  onLinkDrop,
  onToast,
  folders: propFolders,
  onClearSelectionRef
}: FolderSidebarProps) {
  const [folders, setFolders] = useState<Folder[]>(propFolders || []);
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<{id: string, name: string} | null>(null);
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [defaultFolderId, setDefaultFolderId] = useState<string | null>(null);
  
  // Get reference to the clearSelectionFunction to call after drag & drop
  const clearSelectionRef = useRef<(() => void) | null>(null);

  // Click esterno per chiudere il modal "Nuova Cartella"
  const newFolderModalRef = useClickOutside<HTMLDivElement>(() => {
    setIsCreatingFolder(false);
    setNewFolderName('');
    setParentFolderId(null);
  }, isCreatingFolder);

  // Set up the clear selection reference
  useEffect(() => {
    if (onClearSelectionRef && clearSelectionRef.current) {
      onClearSelectionRef(clearSelectionRef.current);
    }
  }, [onClearSelectionRef]);

  // Gestione del drag and drop (solo per i link)
  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    setDragOverFolderId(null);
    
    if (data) {
      try {
        // Prova a parsare come array di ID (per drag multipli)
        const linkIds = JSON.parse(data);
        if (Array.isArray(linkIds)) {
          // Gestione di link multipli
          let successCount = 0;
          let errorCount = 0;
          
          for (const linkId of linkIds) {
            try {
              await onLinkDrop(linkId, folderId, clearSelectionRef.current || undefined);
              successCount++;
            } catch (error) {
              errorCount++;
              console.error('Errore durante lo spostamento del link:', error);
            }
          }
          
          // Mostra un solo toast per l'operazione batch
          if (successCount > 0) {
            const folderName = folderId ? 
              (propFolders?.find((f: Folder) => f.id === folderId)?.name || 'Cartella selezionata') : 
              'Tutti i link';
            
            if (successCount === linkIds.length) {
              // Tutti i link sono stati spostati con successo
              if (successCount === 1) {
                onToast?.(`Link spostato in "${folderName}"`, 'success');
              } else {
                onToast?.(`Tutti i link sono stati spostati in "${folderName}"`, 'success');
              }
            } else {
              onToast?.(`${successCount} link su ${linkIds.length} spostati in "${folderName}"`, 'success');
            }
            
            // Deselect all links after dropping
            if (clearSelectionRef.current) {
              clearSelectionRef.current();
            }
          }
          
          if (errorCount > 0) {
            onToast?.(`Si sono verificati errori durante lo spostamento di ${errorCount} link`, 'error');
          }
        } else {
          // Fallback per singolo link
          await onLinkDrop(data, folderId, clearSelectionRef.current || undefined);
          const folderName = folderId ? 
            (propFolders?.find((f: Folder) => f.id === folderId)?.name || 'Cartella selezionata') : 
            'Tutti i link';
          onToast?.(`Link spostato in "${folderName}"`, 'success');
        }
      } catch {
        // Se non è JSON, trattalo come singolo ID
        await onLinkDrop(data, folderId, clearSelectionRef.current || undefined);
        const folderName = folderId ? 
          (propFolders?.find((f: Folder) => f.id === folderId)?.name || 'Cartella selezionata') : 
          'Tutti i link';
        onToast?.(`Link spostato in "${folderName}"`, 'success');
        
        // Deselect the link after dropping
        if (clearSelectionRef.current) {
          clearSelectionRef.current();
        }
      }
    }
  };

  // Costruisce l'albero delle cartelle
  const buildFolderTree = useCallback((folders: Folder[]) => {
    const sortedFolders = [...folders].sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      return a.name.localeCompare(b.name);
    });
    
    const folderMap = new Map<string, FolderTreeNode>();
    
    sortedFolders.forEach(folder => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        expanded: true
      });
    });
    
    const rootNodes: FolderTreeNode[] = [];
    
    sortedFolders.forEach(folder => {
      const node = folderMap.get(folder.id)!;
      
      if (folder.parent_folder_id) {
        const parent = folderMap.get(folder.parent_folder_id);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });
    
    setFolderTree(rootNodes);
  }, []);

  // Usa le cartelle passate come prop se disponibili
  useEffect(() => {
    if (propFolders && propFolders.length > 0) {
      setFolders(propFolders);
      buildFolderTree(propFolders);
      setLoading(false);
      
      // Trova e imposta la cartella "Tutti i link" come default
      const defaultFolder = propFolders.find((f: Folder) => f.name === 'Tutti i link');
      if (defaultFolder) {
        setDefaultFolderId(defaultFolder.id);
      }
    }
  }, [propFolders, buildFolderTree]);

  // Carica le cartelle solo se non sono state passate come prop
  const loadFolders = useCallback(async () => {
    if (propFolders && propFolders.length > 0) return;
    
    try {
      const response = await fetch(`/api/folders?workspaceId=${workspaceId}`);
      const data = await response.json();
      
      if (data.folders) {
        setFolders(data.folders);
        buildFolderTree(data.folders);
        
        const defaultFolder = data.folders.find((f: Folder) => f.name === 'Tutti i link');
        if (defaultFolder) {
          setDefaultFolderId(defaultFolder.id);
        }
      }
    } catch (error) {
      console.error('Errore durante il caricamento delle cartelle:', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, buildFolderTree, propFolders]);

  useEffect(() => {
    if (workspaceId) {
      loadFolders();
    }
  }, [workspaceId, loadFolders]);

  // Crea una nuova cartella
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    const tempId = `temp-${Date.now()}`;
    const tempFolder: Folder = {
      id: tempId,
      name: newFolderName,
      parent_folder_id: parentFolderId,
      workspace_id: workspaceId,
      user_id: '',
      created_at: new Date(),
      updated_at: new Date(),
      position: 999
    };
    
    setFolders(prev => [...prev, tempFolder]);
    buildFolderTree([...folders, tempFolder]);
    
    const folderName = newFolderName;
    const parentId = parentFolderId;
    setNewFolderName('');
    setParentFolderId(null);
    setIsCreatingFolder(false);
    
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          parentFolderId: parentId,
          workspaceId
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        const newFolder = result.folder;
        
        setFolders(prev => prev.map(f => f.id === tempId ? newFolder : f));
        
        const updatedFolders = folders.filter(f => f.id !== tempId).concat(newFolder);
        buildFolderTree(updatedFolders);
        
        if (newFolder.name === 'Tutti i link') {
          setDefaultFolderId(newFolder.id);
        }
        
        onFoldersChange();
      } else {
        setFolders(prev => prev.filter(f => f.id !== tempId));
        buildFolderTree(folders);
        onToast?.('Errore durante la creazione della cartella', 'error');
      }
    } catch (error) {
      setFolders(prev => prev.filter(f => f.id !== tempId));
      buildFolderTree(folders);
      console.error('Errore durante la creazione della cartella:', error);
      onToast?.('Errore durante la creazione della cartella', 'error');
    }
  };

  // Rinomina una cartella
  const renameFolder = async (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    
    const oldName = folders.find(f => f.id === folderId)?.name;
    setFolders(prev => prev.map(folder => 
      folder.id === folderId ? { ...folder, name: newName } : folder
    ));
    buildFolderTree(folders.map(folder => 
      folder.id === folderId ? { ...folder, name: newName } : folder
    ));
    
    setEditingFolderId(null);
    setEditingName('');
    
    try {
      const response = await fetch('/api/folders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderId,
          name: newName
        }),
      });
      
      if (response.ok) {
        onFoldersChange();
        onToast?.('Cartella rinominata con successo', 'success');
      } else {
        if (oldName) {
          setFolders(prev => prev.map(folder => 
            folder.id === folderId ? { ...folder, name: oldName } : folder
          ));
          buildFolderTree(folders.map(folder => 
            folder.id === folderId ? { ...folder, name: oldName } : folder
          ));
        }
        onToast?.('Errore durante la rinomina della cartella', 'error');
      }
    } catch (error) {
      if (oldName) {
        setFolders(prev => prev.map(folder => 
          folder.id === folderId ? { ...folder, name: oldName } : folder
        ));
        buildFolderTree(folders.map(folder => 
          folder.id === folderId ? { ...folder, name: oldName } : folder
        ));
      }
      console.error('Errore durante la rinomina della cartella:', error);
      onToast?.('Errore durante la rinomina della cartella', 'error');
    }
  };

  // Elimina una cartella
  const deleteFolder = async (folderId: string, folderName: string) => {
    setFolderToDelete({ id: folderId, name: folderName });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!folderToDelete) return;
    
    const deletedFolderId = folderToDelete.id;
    const originalFolders = [...folders];
    
    const updatedFolders = folders.filter(folder => folder.id !== deletedFolderId);
    setFolders(updatedFolders);
    buildFolderTree(updatedFolders);
    
    if (selectedFolderId === deletedFolderId) {
      const defaultFolder = folders.find(f => f.name === 'Tutti i link');
      if (defaultFolder) {
        onFolderSelect(defaultFolder.id);
      }
    }
    
    setDeleteModalOpen(false);
    setFolderToDelete(null);
    
    try {
      const response = await fetch(`/api/folders?folderId=${deletedFolderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        onFoldersChange();
        onToast?.('Cartella eliminata con successo', 'success');
      } else {
        const errorData = await response.json();
        setFolders(originalFolders);
        buildFolderTree(originalFolders);
        onToast?.(`Errore: ${errorData.error || 'Errore durante l\'eliminazione'}`, 'error');
      }
    } catch (error) {
      setFolders(originalFolders);
      buildFolderTree(originalFolders);
      console.error('Errore durante l\'eliminazione della cartella:', error);
      onToast?.('Errore durante l\'eliminazione della cartella', 'error');
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setFolderToDelete(null);
  };

  // Toggle folder expansion
  const toggleFolderExpansion = (folderId: string) => {
    const updateNodeExpansion = (node: FolderTreeNode, targetId: string): FolderTreeNode => {
      if (node.id === targetId) {
        return { ...node, expanded: !node.expanded };
      }
      return {
        ...node,
        children: node.children.map(child => updateNodeExpansion(child, targetId))
      };
    };
    
    setFolderTree(prev => prev.map(node => updateNodeExpansion(node, folderId)));
  };

  // Expand all folders
  const expandAllFolders = () => {
    const updateAllNodesExpansion = (node: FolderTreeNode, expanded: boolean): FolderTreeNode => {
      return {
        ...node,
        expanded: expanded,
        children: node.children.map(child => updateAllNodesExpansion(child, expanded))
      };
    };
    
    setFolderTree(prev => prev.map(node => updateAllNodesExpansion(node, true)));
  };

  // Collapse all folders
  const collapseAllFolders = () => {
    const updateAllNodesExpansion = (node: FolderTreeNode, expanded: boolean): FolderTreeNode => {
      return {
        ...node,
        expanded: expanded,
        children: node.children.map(child => updateAllNodesExpansion(child, expanded))
      };
    };
    
    setFolderTree(prev => prev.map(node => updateAllNodesExpansion(node, false)));
  };

  // Check if all folders are expanded or collapsed
  const areAllFoldersExpanded = () => {
    const checkAllExpanded = (node: FolderTreeNode): boolean => {
      if (!node.expanded && node.children.length > 0) return false;
      return node.children.every(child => checkAllExpanded(child));
    };
    
    return folderTree.every(node => checkAllExpanded(node));
  };

  // Render folder node
  const renderFolderNode = (node: FolderTreeNode, depth: number = 0) => {
    const isSelected = selectedFolderId === node.id;
    const canDelete = node.id !== defaultFolderId;
    const isEditing = editingFolderId === node.id;
    const isDefaultFolder = node.id === defaultFolderId;
    
    // Calcola l'indentazione precisa basata sul livello - aumentata per sidebar più ampia
    const indentationLevel = depth * 28; // Aumentato da 24px a 28px per maggiore chiarezza
    const hasChildren = node.children.length > 0;
    
    // Aumenta la profondità massima dato lo spazio aggiuntivo
    const maxDepth = 7; // Aumentato da 5 a 7
    const isDeepNested = depth >= maxDepth;
    
    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 ${
            isSelected 
              ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' 
              : 'text-gray-700 hover:bg-gray-50'
          } ${dragOverFolderId === node.id ? 'bg-blue-100 ring-2 ring-blue-300 ring-inset' : ''} ${
            isDeepNested ? 'opacity-80' : ''
          }`}
          style={{ 
            marginLeft: isDeepNested ? `${maxDepth * 28}px` : `${indentationLevel}px`,
            position: 'relative'
          }}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.id)}
          onClick={() => !isEditing && onFolderSelect(node.id)}
          title={isDeepNested ? `Cartella annidata (livello ${depth + 1})` : undefined}
        >
          {/* Linea verticale per indicare la gerarchia */}
          {depth > 0 && !isDeepNested && (
            <div 
              className="absolute border-l-2 border-gray-200"
              style={{
                left: `${indentationLevel - 14}px`, // Aggiustato per la nuova indentazione
                top: '0',
                bottom: '0',
                width: '2px'
              }}
            />
          )}
          
          {/* Indicatore per cartelle molto annidate */}
          {isDeepNested && (
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-gray-400 rounded-full" 
                 title={`Livello ${depth + 1}`} />
          )}
          
          <div className="flex items-center flex-1 min-w-0">
            {/* Freccia per espandere/collassare (sempre nella stessa posizione) */}
            <div className="w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolderExpansion(node.id);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  {node.expanded ? (
                    <ChevronDownIcon className="w-4 h-4" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
            
            {/* Icona cartella (sempre nella stessa posizione) */}
            <div className={`w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0 ${
              isSelected ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {node.expanded && hasChildren ? (
                <FolderOpenIcon className="w-5 h-5" />
              ) : (
                <FolderIcon className="w-5 h-5" />
              )}
            </div>
            
            {isEditing ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => {
                  if (editingName.trim() && editingName !== node.name) {
                    renameFolder(node.id, editingName);
                  } else {
                    setEditingFolderId(null);
                    setEditingName('');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editingName.trim() && editingName !== node.name) {
                      renameFolder(node.id, editingName);
                    } else {
                      setEditingFolderId(null);
                      setEditingName('');
                    }
                  } else if (e.key === 'Escape') {
                    setEditingFolderId(null);
                    setEditingName('');
                  }
                }}
                className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <span className={`font-medium truncate ${isSelected ? 'text-blue-700' : 'text-gray-700'} ${
                isDeepNested ? 'text-sm' : ''
              }`} title={node.name}>
                {isDeepNested && '⋯ '}{node.name}
              </span>
            )}
            
            {/* Indicatore del livello per cartelle molto annidate */}
            {isDeepNested && (
              <span className="text-xs text-gray-400 ml-2 flex-shrink-0 bg-gray-100 px-1.5 py-0.5 rounded-full">L{depth + 1}</span>
            )}
          </div>
          
          {!isEditing && !isDefaultFolder && (
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setParentFolderId(node.id);
                  setIsCreatingFolder(true);
                }}
                className="p-1 hover:bg-gray-200 rounded"
                title="Crea sottocartella"
              >
                <PlusIcon className="w-4 h-4 text-gray-600" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingFolderId(node.id);
                  setEditingName(node.name);
                }}
                className="p-1 hover:bg-gray-200 rounded"
                title="Rinomina cartella"
              >
                <PencilIcon className="w-4 h-4 text-gray-600" />
              </button>
              
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFolder(node.id, node.name);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Elimina cartella"
                >
                  <TrashIcon className="w-4 h-4 text-red-600" />
                </button>
              )}
            </div>
          )}
        </div>
        
        {node.expanded && node.children.length > 0 && (
          <div className="mt-1 relative">
            {node.children.map(child => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 min-h-0">
      <div className="p-5 border-b border-gray-200 flex-shrink-0 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Cartelle</h2>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => {
              setParentFolderId(null);
              setIsCreatingFolder(true);
            }}
            className="w-full flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2 text-gray-600" />
            Nuova Cartella
          </button>
          
          {folders.filter(f => f.name !== 'Tutti i link').length > 0 && (
            <button
              onClick={() => setReorderModalOpen(true)}
              className="w-full flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Bars3Icon className="h-4 w-4 mr-2 text-gray-600" />
              Riordina Cartelle
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {/* Sezione "Tutti i link" */}
        {defaultFolderId && (
          <div className="border-b border-gray-200 flex-shrink-0">
            <div 
              className={`flex items-center py-4 px-6 cursor-pointer transition-all duration-200 border-l-4 ${
                selectedFolderId === defaultFolderId 
                  ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                  : 'border-transparent text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              } ${dragOverFolderId === defaultFolderId ? 'bg-blue-100 ring-2 ring-blue-300 ring-inset' : ''}`}
              onDragOver={(e) => handleDragOver(e, defaultFolderId)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, defaultFolderId)}
              onClick={() => onFolderSelect(defaultFolderId)}
            >
              <div className="flex items-center flex-1 min-w-0">
                <div className={`mr-4 flex-shrink-0 transition-colors ${
                  selectedFolderId === defaultFolderId ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  <HomeIcon className="w-6 h-6" />
                </div>
                <span className={`font-semibold truncate transition-colors ${
                  selectedFolderId === defaultFolderId ? 'text-blue-700' : 'text-gray-700'
                }`} title="Tutti i link">
                  Tutti i link
                </span>
              </div>
              <div className={`ml-3 flex items-center flex-shrink-0 ${
                selectedFolderId === defaultFolderId ? 'text-blue-600' : 'text-gray-400'
              }`}>
                <DocumentIcon className="w-5 h-5 mr-1" />
                <span className="text-sm font-medium">Tutti</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Sezione Cartelle */}
        <div className="flex-1 flex flex-col min-h-0 p-5">
          <div className="mb-4 flex items-center justify-between flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Cartelle Organizzate</h3>
            {folderTree.some(node => node.children.length > 0 || folderTree.length > 1) && (
              <button
                onClick={areAllFoldersExpanded() ? collapseAllFolders : expandAllFolders}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                title={areAllFoldersExpanded() ? "Comprimi tutte le cartelle" : "Espandi tutte le cartelle"}
              >
                {areAllFoldersExpanded() ? (
                  <ChevronUpIcon className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                )}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 group scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {folderTree.filter(node => !defaultFolderId || node.id !== defaultFolderId).map(node => renderFolderNode(node))}
          </div>
        </div>
      </div>
      
      {/* Modal per creare nuova cartella */}
      {isCreatingFolder && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[9999]">
            <div ref={newFolderModalRef} className="bg-white rounded-lg p-6 w-96 shadow-xl relative">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                {parentFolderId ? 'Crea sottocartella' : 'Crea nuova cartella'}
              </h3>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    createFolder();
                  } else if (e.key === 'Escape') {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                    setParentFolderId(null);
                  }
                }}
                placeholder="Nome cartella"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                autoFocus
              />
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                    setParentFolderId(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Annulla
                </button>
                <button
                  onClick={createFolder}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Crea
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
      
      {/* Modal per eliminazione cartella */}
      <DeleteFolderModal
        isOpen={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        folderName={folderToDelete?.name || ''}
        isDefault={folderToDelete?.name === 'Tutti i link'}
      />
      
      {/* Modal per riordino cartelle */}
      <FolderReorderModal
        isOpen={reorderModalOpen}
        onClose={() => setReorderModalOpen(false)}
        folders={folders}
        workspaceId={workspaceId}
        onReorder={onFoldersChange}
        onToast={onToast}
      />
    </div>
  );
}
