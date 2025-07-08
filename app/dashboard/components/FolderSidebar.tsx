'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, FolderOpenIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import DeleteFolderModal from './DeleteFolderModal';

export interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  workspace_id: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

interface FolderSidebarProps {
  workspaceId: string;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onFoldersChange: () => void;
  onLinkDrop: (linkId: string, folderId: string | null) => void;
  folders?: Folder[];
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
  folders: propFolders
}: FolderSidebarProps) {
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

  // Gestione del drag and drop
  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const linkId = e.dataTransfer.getData('text/plain');
    setDragOverFolderId(null);
    
    if (linkId) {
      onLinkDrop(linkId, folderId);
    }
  };

  // Costruisce l'albero delle cartelle
  const buildFolderTree = useCallback((folders: Folder[]) => {
    const folderMap = new Map<string, FolderTreeNode>();
    
    // Crea nodi per tutte le cartelle
    folders.forEach(folder => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        expanded: true
      });
    });
    
    const rootNodes: FolderTreeNode[] = [];
    
    // Costruisce l'albero
    folders.forEach(folder => {
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
      buildFolderTree(propFolders);
      setLoading(false);
    }
  }, [propFolders, buildFolderTree]);

  // Carica le cartelle solo se non sono state passate come prop
  const loadFolders = useCallback(async () => {
    if (propFolders && propFolders.length > 0) return;
    
    try {
      const response = await fetch(`/api/folders?workspaceId=${workspaceId}`);
      const data = await response.json();
      
      if (data.folders) {
        buildFolderTree(data.folders);
      }
    } catch (error) {
      console.error('Errore durante il caricamento delle cartelle:', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, buildFolderTree, propFolders]);

  // Crea una nuova cartella
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName,
          parentFolderId,
          workspaceId
        }),
      });
      
      if (response.ok) {
        const newFolder = await response.json();
        setNewFolderName('');
        setParentFolderId(null);
        setIsCreatingFolder(false);
        
        // Aggiorna lo stato locale se possibile
        if (propFolders) {
          // Aggiorna l'albero delle cartelle localmente
          const updatedFolders = [...propFolders, newFolder.folder];
          buildFolderTree(updatedFolders);
        } else {
          await loadFolders();
        }
        onFoldersChange();
      }
    } catch (error) {
      console.error('Errore durante la creazione della cartella:', error);
    }
  };

  // Rinomina una cartella
  const renameFolder = async (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    
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
        setEditingFolderId(null);
        setEditingName('');
        
        // Aggiorna lo stato locale se possibile
        if (propFolders) {
          const updatedFolders = propFolders.map(folder => 
            folder.id === folderId ? { ...folder, name: newName } : folder
          );
          buildFolderTree(updatedFolders);
        } else {
          await loadFolders();
        }
        onFoldersChange();
      }
    } catch (error) {
      console.error('Errore durante la rinomina della cartella:', error);
    }
  };

  // Elimina una cartella
  const deleteFolder = async (folderId: string, folderName: string) => {
    setFolderToDelete({ id: folderId, name: folderName });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!folderToDelete) return;
    
    try {
      const response = await fetch(`/api/folders?folderId=${folderToDelete.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Aggiorna lo stato locale se possibile
        if (propFolders) {
          const updatedFolders = propFolders.filter(folder => folder.id !== folderToDelete.id);
          buildFolderTree(updatedFolders);
        } else {
          await loadFolders();
        }
        onFoldersChange();
        // Se la cartella eliminata era selezionata, deseleziona
        if (selectedFolderId === folderToDelete.id) {
          onFolderSelect(null);
        }
      } else {
        console.error('Errore:', data.error);
      }
    } catch (error) {
      console.error('Errore durante l\'eliminazione della cartella:', error);
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setFolderToDelete(null);
  };

  // Toggle espansione cartella
  const toggleExpanded = (folderId: string) => {
    setFolderTree(prev => 
      prev.map(node => updateNodeExpansion(node, folderId))
    );
  };

  const updateNodeExpansion = (node: FolderTreeNode, targetId: string): FolderTreeNode => {
    if (node.id === targetId) {
      return { ...node, expanded: !node.expanded };
    }
    
    return {
      ...node,
      children: node.children.map(child => updateNodeExpansion(child, targetId))
    };
  };

  // Renderizza un nodo dell'albero
  const renderFolderNode = (node: FolderTreeNode, level: number = 0) => {
    const isSelected = selectedFolderId === node.id;
    const isEditing = editingFolderId === node.id;
    const canDelete = node.name !== 'Tutti i link';
    const isDragOver = dragOverFolderId === node.id;
    
    return (
      <div key={node.id} className="select-none">
        <div 
          className={`group flex items-center py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
          } ${isDragOver ? 'bg-blue-100 border-2 border-dashed border-blue-400' : ''}`}
          style={{ marginLeft: `${level * 16}px` }}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.id)}
        >
          {node.children.length > 0 && (
            <button
              onClick={() => toggleExpanded(node.id)}
              className="mr-1 p-1 hover:bg-gray-200 rounded"
            >
              {node.expanded ? (
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}
          
          <div className="flex items-center flex-1 min-w-0">
            {node.expanded ? (
              <FolderOpenIcon className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
            ) : (
              <FolderIcon className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
            )}
            
            {isEditing ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    renameFolder(node.id, editingName);
                  } else if (e.key === 'Escape') {
                    setEditingFolderId(null);
                    setEditingName('');
                  }
                }}
                onBlur={() => renameFolder(node.id, editingName)}
                autoFocus
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span 
                className="flex-1 truncate text-sm font-medium text-gray-700"
                onClick={() => onFolderSelect(node.id)}
              >
                {node.name}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
            <button
              onClick={() => {
                setParentFolderId(node.id);
                setIsCreatingFolder(true);
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="Crea sottocartella"
            >
              <PlusIcon className="h-4 w-4 text-gray-500" />
            </button>
            {canDelete && (
              <>
                <button
                  onClick={() => {
                    setEditingFolderId(node.id);
                    setEditingName(node.name);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Rinomina"
                >
                  <PencilIcon className="h-4 w-4 text-gray-500" />
                </button>
                <button
                  onClick={() => deleteFolder(node.id, node.name)}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Elimina"
                >
                  <TrashIcon className="h-4 w-4 text-red-500" />
                </button>
              </>
            )}
          </div>
        </div>
        
        {node.expanded && node.children.map(child => 
          renderFolderNode(child, level + 1)
        )}
      </div>
    );
  };

  useEffect(() => {
    if (workspaceId) {
      loadFolders();
    }
  }, [workspaceId, loadFolders]);

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
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Cartelle</h2>
        <button
          onClick={() => {
            setParentFolderId(null);
            setIsCreatingFolder(true);
          }}
          className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Nuova Cartella
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {/* Mostra solo le cartelle dal database - la cartella "Tutti i link" è gestita dal backend */}
          {folderTree.map(node => renderFolderNode(node))}
        </div>
      </div>
      
      {/* Modal per creare nuova cartella */}
      {isCreatingFolder && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              {parentFolderId ? 'Crea sottocartella' : 'Crea nuova cartella'}
            </h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome cartella"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      )}
      
      {/* Modal per eliminazione cartella */}
      <DeleteFolderModal
        isOpen={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        folderName={folderToDelete?.name || ''}
        isDefault={folderToDelete?.name === 'Tutti i link'}
      />
    </div>
  );
}
