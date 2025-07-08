'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  position: number; // Added position field for ordering
}

interface FolderSidebarProps {
  workspaceId: string;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onFoldersChange: () => void;
  onLinkDrop: (linkId: string, folderId: string | null, clearSelection?: () => void) => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
  folders?: Folder[];
  onClearSelectionRef?: (func: () => void) => void; // Add the clear selection function reference
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
  // Get reference to the clearSelectionFunction to call after drag & drop
  const clearSelectionRef = useRef<(() => void) | null>(null);

  // For folder reordering
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  
  // New states for improved folder drag & drop UX
  const [folderDropTarget, setFolderDropTarget] = useState<string | null>(null); // For yellow border (move into folder)
  const [folderInsertPosition, setFolderInsertPosition] = useState<{
    folderId: string;
    position: 'before' | 'after';
  } | null>(null); // For yellow line (reorder between folders)
  const [invalidDropTarget, setInvalidDropTarget] = useState<string | null>(null); // For red border (invalid operation)

  // Gestione del drag and drop
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
                // Un solo link
                onToast?.(`Link spostato in "${folderName}"`, 'success');
              } else {
                // Più link - mostra toast batch specifico
                onToast?.(`Tutti i link sono stati spostati in "${folderName}"`, 'success');
              }
            } else {
              // Alcuni link hanno avuto errori
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
    // Sort folders by position first, then by name
    const sortedFolders = [...folders].sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      return a.name.localeCompare(b.name);
    });
    
    const folderMap = new Map<string, FolderTreeNode>();
    
    // Crea nodi per tutte le cartelle
    sortedFolders.forEach(folder => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        expanded: true
      });
    });
    
    const rootNodes: FolderTreeNode[] = [];
    
    // Costruisce l'albero
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
        
        // Trova e imposta la cartella "Tutti i link" come default
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

  // Handle folder drag start
  const handleFolderDragStart = (e: React.DragEvent, folderId: string) => {
    e.stopPropagation();
    setDraggingFolderId(folderId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/folder', folderId);
  };

  // Handle folder drag over with improved visual feedback and debouncing
  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggingFolderId === folderId) return; // No drop on self
    
    // Check if we're dragging a folder
    const folderData = e.dataTransfer.types.includes('application/folder');
    
    if (folderData && draggingFolderId) {
      // Set the drop effect for folder reordering
      e.dataTransfer.dropEffect = 'move';
      
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      
      // Optimized margins for even better drag experience
      // Top area: first 20% for "insert before" 
      // Middle area: 20% to 80% for "move into folder" (60% of height - large zone)
      // Bottom area: last 20% for "insert after"
      const topThreshold = height * 0.20;
      const bottomThreshold = height * 0.80;
      
      // Immediate feedback without debounce to avoid flickering
      if (y < topThreshold) {
        // Top area - insert before this folder
        const validation = validateFolderOperation(draggingFolderId, folderId, 'reorder');
        if (validation.valid) {
          setFolderInsertPosition({ folderId, position: 'before' });
          setFolderDropTarget(null);
          setInvalidDropTarget(null);
        } else {
          setFolderInsertPosition(null);
          setFolderDropTarget(null);
          setInvalidDropTarget(folderId);
        }
      } else if (y > bottomThreshold) {
        // Bottom area - insert after this folder
        const validation = validateFolderOperation(draggingFolderId, folderId, 'reorder');
        if (validation.valid) {
          setFolderInsertPosition({ folderId, position: 'after' });
          setFolderDropTarget(null);
          setInvalidDropTarget(null);
        } else {
          setFolderInsertPosition(null);
          setFolderDropTarget(null);
          setInvalidDropTarget(folderId);
        }
      } else {
        // Middle area - move into this folder (change parent)
        const validation = validateFolderOperation(draggingFolderId, folderId, 'move');
        if (validation.valid) {
          setFolderDropTarget(folderId);
          setFolderInsertPosition(null);
          setInvalidDropTarget(null);
        } else {
          setFolderDropTarget(null);
          setFolderInsertPosition(null);
          setInvalidDropTarget(folderId);
        }
      }
    } else {
      // Regular link drag
      e.dataTransfer.dropEffect = 'move';
      setDragOverFolderId(folderId);
    }
  };

  // Handle folder drag leave with improved boundary detection
  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // More precise boundary checking to avoid premature clearing
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Add a small buffer to prevent flickering when moving between closely packed elements
    const buffer = 5;
    
    if (x < rect.left - buffer || x > rect.right + buffer || 
        y < rect.top - buffer || y > rect.bottom + buffer) {
      // Only clear if we're definitely outside the element
      setDragOverFolderId(null);
      setFolderDropTarget(null);
      setFolderInsertPosition(null);
      setInvalidDropTarget(null);
    }
  };

  // Handle folder drag end
  const handleFolderDragEnd = () => {
    setDraggingFolderId(null);
    setFolderDropTarget(null);
    setFolderInsertPosition(null);
    setInvalidDropTarget(null);
  };

  // Handle folder drop - for reordering with improved algorithm
  const handleFolderDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're dropping a folder (reordering)
    const folderData = e.dataTransfer.getData('application/folder');
    
    if (folderData && draggingFolderId) {
      const sourceFolderId = folderData;
      if (sourceFolderId === targetFolderId) {
        // Clear visual indicators
        setFolderDropTarget(null);
        setFolderInsertPosition(null);
        setInvalidDropTarget(null);
        setDraggingFolderId(null);
        return; // No drop on self
      }
      
      try {
        // Find the source and target folders
        const sourceFolder = folders.find(f => f.id === sourceFolderId);
        const targetFolder = folders.find(f => f.id === targetFolderId);
        
        if (!sourceFolder || !targetFolder) {
          // Clear visual indicators
          setFolderDropTarget(null);
          setFolderInsertPosition(null);
          setInvalidDropTarget(null);
          setDraggingFolderId(null);
          return;
        }
        
        // Capture the current visual state before clearing it
        const currentDropTarget = folderDropTarget;
        const currentInsertPosition = folderInsertPosition;
        
        // Clear visual indicators immediately to prevent flickering
        setFolderDropTarget(null);
        setFolderInsertPosition(null);
        setInvalidDropTarget(null);
        
        // Determine operation type based on captured state
        let operationType: 'move' | 'reorder' = 'reorder';
        let insertPosition: 'before' | 'after' = 'before';
        
        if (currentDropTarget === targetFolderId) {
          // Move folder inside target folder (change parent)
          operationType = 'move';
        } else if (currentInsertPosition?.folderId === targetFolderId) {
          // Reorder folder at specific position
          operationType = 'reorder';
          insertPosition = currentInsertPosition.position;
        } else {
          // Fallback: determine operation based on mouse position
          const rect = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - rect.top;
          const height = rect.height;
          const topThreshold = height * 0.20;
          const bottomThreshold = height * 0.80;
          
          if (y >= topThreshold && y <= bottomThreshold) {
            operationType = 'move';
          } else {
            operationType = 'reorder';
            insertPosition = y < topThreshold ? 'before' : 'after';
          }
        }
        
        // Execute the operation
        if (operationType === 'move') {
          const validation = validateFolderOperation(sourceFolderId, targetFolderId, 'move');
          if (validation.valid) {
            await movefolderToParent(sourceFolderId, targetFolderId);
          } else {
            onToast?.(validation.error || 'Operazione non valida', 'error');
          }
        } else {
          const validation = validateFolderOperation(sourceFolderId, targetFolderId, 'reorder');
          if (validation.valid) {
            await reorderFolderAtPosition(sourceFolderId, targetFolderId, insertPosition);
          } else {
            onToast?.(validation.error || 'Operazione non valida', 'error');
          }
        }
        
      } catch (error) {
        console.error('Errore durante lo riordinamento delle cartelle:', error);
        onToast?.('Errore durante lo riordinamento delle cartelle', 'error');
      }
    }
    
    // Always clear drag state at the end
    setDraggingFolderId(null);
  };

  // Helper function to move a folder to a new parent
  const movefolderToParent = async (sourceFolderId: string, newParentId: string) => {
    // Validate the operation
    const validation = validateFolderOperation(sourceFolderId, newParentId, 'move');
    if (!validation.valid) {
      onToast?.(validation.error || 'Operazione non valida', 'error');
      return;
    }
    
    try {
      const response = await fetch('/api/folders/move', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderId: sourceFolderId,
          newParentId: newParentId
        }),
      });
      
      if (response.ok) {
        // Immediately update local state for responsiveness
        await handleUpdateFolders();
        onToast?.('Cartella spostata con successo', 'success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante lo spostamento');
      }
    } catch (error) {
      console.error('Errore durante lo spostamento:', error);
      onToast?.(`Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`, 'error');
      // Refresh folders to ensure consistency after error
      await handleUpdateFolders();
    }
  };

  // Helper function to reorder folder at a specific position
  const reorderFolderAtPosition = async (sourceFolderId: string, targetFolderId: string, position: 'before' | 'after') => {
    // Validate the operation
    const validation = validateFolderOperation(sourceFolderId, targetFolderId, 'reorder');
    if (!validation.valid) {
      onToast?.(validation.error || 'Operazione non valida', 'error');
      return;
    }
    
    try {
      const response = await fetch('/api/folders/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderId: sourceFolderId,
          targetFolderId: targetFolderId,
          insertPosition: position
        }),
      });
      
      if (response.ok) {
        // Immediately update local state for responsiveness
        await handleUpdateFolders();
        onToast?.('Cartella riordinata con successo', 'success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante il riordinamento');
      }
    } catch (error) {
      console.error('Errore durante il riordinamento:', error);
      onToast?.(`Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`, 'error');
      // Refresh folders to ensure consistency after error
      await handleUpdateFolders();
    }
  };

  // Debounced update function to avoid too many refresh operations
  const [updateTimeout, setUpdateTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
    };
  }, [updateTimeout]);

  // Helper function to update folders from parent with improved debouncing
  const handleUpdateFolders = async () => {
    try {
      // Cancel any pending update
      if (updateTimeout) {
        clearTimeout(updateTimeout);
        setUpdateTimeout(null);
      }
      
      // Update immediately for better responsiveness
      onFoldersChange();
    } catch (error) {
      console.error('Errore durante l\'aggiornamento delle cartelle:', error);
    }
  };

  // Validation function for drag & drop operations
  const validateFolderOperation = (sourceFolderId: string, targetFolderId: string, operation: 'move' | 'reorder'): { valid: boolean; error?: string } => {
    const sourceFolder = folders.find(f => f.id === sourceFolderId);
    const targetFolder = folders.find(f => f.id === targetFolderId);
    
    if (!sourceFolder || !targetFolder) {
      return { valid: false, error: 'Cartelle non trovate' };
    }
    
    // Check if trying to move folder to itself
    if (sourceFolderId === targetFolderId) {
      return { valid: false, error: 'Non puoi spostare una cartella su se stessa' };
    }
    
    // Check if folders are in the same workspace
    if (sourceFolder.workspace_id !== targetFolder.workspace_id) {
      return { valid: false, error: 'Non puoi spostare cartelle tra workspace diversi' };
    }
    
    if (operation === 'move') {
      // Check if target folder is a descendant of source folder (would create loop)
      if (isDescendantOf(targetFolderId, sourceFolderId)) {
        return { valid: false, error: 'Non puoi spostare una cartella dentro una sua sottocartella' };
      }
    }
    // Removed the restriction for reordering folders at different levels
    // Now folders can be reordered regardless of their parent level
    // This allows for maximum flexibility in folder organization
    
    return { valid: true };
  };
  
  // Helper function to check if a folder is a descendant of another
  const isDescendantOf = (folderId: string, ancestorId: string): boolean => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder || !folder.parent_folder_id) return false;
    
    if (folder.parent_folder_id === ancestorId) return true;
    
    return isDescendantOf(folder.parent_folder_id, ancestorId);
  };

  // Renderizza un nodo dell'albero
  const renderFolderNode = (node: FolderTreeNode, level: number = 0) => {
    const isSelected = selectedFolderId === node.id;
    const isEditing = editingFolderId === node.id;
    const canDelete = node.id !== defaultFolderId;
    const isDragOver = dragOverFolderId === node.id;
    const isDraggingThis = draggingFolderId === node.id;
    const isDefaultFolder = node.id === defaultFolderId;
    
    // New visual feedback states
    const isDropTarget = folderDropTarget === node.id; // Yellow border for "move into folder"
    const isInsertBefore = folderInsertPosition?.folderId === node.id && folderInsertPosition?.position === 'before';
    const isInsertAfter = folderInsertPosition?.folderId === node.id && folderInsertPosition?.position === 'after';
    const isInvalidTarget = invalidDropTarget === node.id; // Red border for invalid operations
    
    return (
      <div key={node.id} className="select-none">
        {/* Yellow line indicator for "insert before" */}
        {isInsertBefore && (
          <div className="h-0.5 bg-yellow-400 mx-3 mb-1 rounded-full"></div>
        )}
        
        <div 
          className={`group flex items-center py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
          } ${isDragOver ? 'bg-blue-100 border-2 border-dashed border-blue-400' : ''}
          ${isDropTarget ? 'bg-yellow-50 border-2 border-yellow-400 ring-2 ring-yellow-200' : ''}
          ${isInvalidTarget ? 'bg-red-50 border-2 border-red-400 ring-2 ring-red-200' : ''}
          ${isDraggingThis ? 'opacity-30 scale-95 transform' : ''}`}
          style={{ marginLeft: `${level * 16}px` }}
          onDragOver={(e) => {
            handleDragOver(e, node.id);
            if (!isDefaultFolder) handleFolderDragOver(e, node.id);
          }}
          onDragLeave={(e) => {
            handleDragLeave();
            handleFolderDragLeave(e);
          }}
          onDrop={(e) => {
            handleDrop(e, node.id);
            if (!isDefaultFolder) handleFolderDrop(e, node.id);
          }}
          onClick={() => {
            if (!isEditing) {
              onFolderSelect(node.id);
            }
          }}
          draggable={!isDefaultFolder}
          onDragStart={(e) => {
            if (!isDefaultFolder) {
              handleFolderDragStart(e, node.id);
            }
          }}
          onDragEnd={handleFolderDragEnd}
        >
          {/* Folder content */}
          <div className="flex items-center flex-1">
            {/* Expand/Collapse icon */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(node.id);
              }}
              className="mr-1 p-1 hover:bg-gray-200 rounded"
            >
              {node.expanded ? (
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {/* Folder icon */}
            <div className="mr-2">
              {node.expanded ? (
                <FolderOpenIcon className="w-5 h-5 text-blue-500" />
              ) : (
                <FolderIcon className="w-5 h-5 text-blue-500" />
              )}
            </div>

            {/* Folder name */}
            {isEditing ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => {
                  if (editingName.trim() && editingName !== node.name) {
                    renameFolder(node.id, editingName.trim());
                  } else {
                    setEditingFolderId(null);
                    setEditingName('');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    setEditingFolderId(null);
                    setEditingName('');
                  }
                }}
                className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <span className="flex-1 text-sm font-medium text-gray-700 truncate">
                {node.name}
              </span>
            )}

            {/* Actions */}
            {!isEditing && !isDefaultFolder && (
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingFolderId(node.id);
                    setEditingName(node.name);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <PencilIcon className="w-4 h-4 text-gray-500" />
                </button>
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFolder(node.id, node.name);
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <TrashIcon className="w-4 h-4 text-red-500" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Yellow line indicator for "insert after" */}
        {isInsertAfter && (
          <div className="h-0.5 bg-yellow-400 mx-3 mt-1 rounded-full"></div>
        )}

        {/* Render children */}
        {node.expanded && node.children.map(child => renderFolderNode(child, level + 1))}
      </div>
    );
  };

  useEffect(() => {
    if (workspaceId) {
      loadFolders();
    }
  }, [workspaceId, loadFolders]);

  // Get default folder ID (usually "All Links")
  const [defaultFolderId, setDefaultFolderId] = useState<string | null>(null);
  
  // Register the clearSelectionRef function
  useEffect(() => {
    if (onClearSelectionRef && clearSelectionRef.current) {
      onClearSelectionRef(() => clearSelectionRef.current);
    }
  }, [onClearSelectionRef, clearSelectionRef]);
  
  // Find default folder (usually "All Links") when folders change
  useEffect(() => {
    if (folders && folders.length > 0) {
      const defaultFolder = folders.find(f => f.parent_folder_id === null);
      if (defaultFolder) {
        setDefaultFolderId(defaultFolder.id);
      }
    }
  }, [folders]);

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
      
      <div className="flex-1 overflow-y-auto">
        {/* Sezione fissa "Tutti i link" in alto */}
        {defaultFolderId && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div 
              className={`flex items-center py-3 px-4 rounded-lg cursor-pointer transition-colors ${
                selectedFolderId === defaultFolderId ? 'bg-blue-100 border-l-4 border-blue-500 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
              } ${dragOverFolderId === defaultFolderId ? 'bg-blue-100 border-2 border-dashed border-blue-400' : ''}`}
              onDragOver={(e) => handleDragOver(e, defaultFolderId)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, defaultFolderId)}
              onClick={() => onFolderSelect(defaultFolderId)}
            >
              <div className="flex items-center flex-1">
                <FolderIcon className="w-5 h-5 mr-3" />
                <span className="font-medium">Tutti i link</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Cartelle normali */}
        <div className="p-4">
          <div className="space-y-1">
            {/* Mostra solo le cartelle normali (esclude "Tutti i link") */}
            {folderTree.filter(node => !defaultFolderId || node.id !== defaultFolderId).map(node => renderFolderNode(node))}
          </div>
        </div>
      </div>
      
      {/* Modal per creare nuova cartella */}
      {isCreatingFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
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
