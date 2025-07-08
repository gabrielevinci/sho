'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, FolderOpenIcon, PlusIcon, PencilIcon, TrashIcon, HomeIcon, DocumentIcon } from '@heroicons/react/24/outline';
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
  
  // Performance optimizations for root-level folder reordering
  const [dragDebounceTimer, setDragDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  
  // Caching for validation results to avoid repeated calculations
  const validationCache = useRef<Map<string, { valid: boolean; error?: string }>>(new Map());
  
  // Clear validation cache when folders change
  useEffect(() => {
    validationCache.current.clear();
  }, [folders]);

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

  // Costruisce l'albero delle cartelle con ottimizzazioni per le performance
  const buildFolderTree = useCallback((folders: Folder[]) => {
    // Sort folders by position first, then by name
    // Optimized sorting for root-level folders
    const sortedFolders = [...folders].sort((a, b) => {
      // Prioritize position for all folders
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      // Use name as secondary sort only when positions are equal
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
    
    // Mostra immediatamente la nuova cartella nell'UI per responsività
    const tempId = `temp-${Date.now()}`;
    const tempFolder: Folder = {
      id: tempId,
      name: newFolderName,
      parent_folder_id: parentFolderId,
      workspace_id: workspaceId,
      user_id: '', // Will be set by backend
      created_at: new Date(),
      updated_at: new Date(),
      position: 999 // Will be corrected by backend
    };
    
    // Aggiorna immediatamente l'UI
    setFolders(prev => [...prev, tempFolder]);
    buildFolderTree([...folders, tempFolder]);
    
    // Reset form
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
        
        // Sostituisci la cartella temporanea con quella reale
        setFolders(prev => prev.map(f => f.id === tempId ? newFolder : f));
        
        // Aggiorna l'albero con i dati reali
        const updatedFolders = folders.filter(f => f.id !== tempId).concat(newFolder);
        buildFolderTree(updatedFolders);
        
        // Aggiorna anche il defaultFolderId se necessario
        if (newFolder.name === 'Tutti i link') {
          setDefaultFolderId(newFolder.id);
        }
        
        onFoldersChange();
      } else {
        // Rimuovi la cartella temporanea in caso di errore
        setFolders(prev => prev.filter(f => f.id !== tempId));
        buildFolderTree(folders);
        
        console.error('Errore durante la creazione della cartella');
        onToast?.('Errore durante la creazione della cartella', 'error');
      }
    } catch (error) {
      // Rimuovi la cartella temporanea in caso di errore
      setFolders(prev => prev.filter(f => f.id !== tempId));
      buildFolderTree(folders);
      
      console.error('Errore durante la creazione della cartella:', error);
      onToast?.('Errore durante la creazione della cartella', 'error');
    }
  };

  // Rinomina una cartella
  const renameFolder = async (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    
    // Aggiorna immediatamente l'UI per responsività
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
        // Ripristina il nome originale in caso di errore
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
      // Ripristina il nome originale in caso di errore
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
    
    // Aggiorna immediatamente l'UI per responsività
    const deletedFolderId = folderToDelete.id;
    const originalFolders = [...folders];
    
    // Rimuovi temporaneamente la cartella dall'UI
    const updatedFolders = folders.filter(folder => folder.id !== deletedFolderId);
    setFolders(updatedFolders);
    buildFolderTree(updatedFolders);
    
    // Chiudi il modal
    setDeleteModalOpen(false);
    setFolderToDelete(null);
    
    // Se la cartella eliminata era selezionata, deseleziona
    if (selectedFolderId === deletedFolderId) {
      onFolderSelect(defaultFolderId);
    }
    
    try {
      const response = await fetch(`/api/folders?folderId=${deletedFolderId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        onFoldersChange();
        onToast?.('Cartella eliminata con successo', 'success');
      } else {
        // Ripristina la cartella in caso di errore
        setFolders(originalFolders);
        buildFolderTree(originalFolders);
        
        console.error('Errore:', data.error);
        onToast?.('Errore durante l\'eliminazione della cartella', 'error');
      }
    } catch (error) {
      // Ripristina la cartella in caso di errore
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

  // Handle folder drag over with improved visual feedback and optimized performance
  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggingFolderId === folderId) return; // No drop on self
    
    // Check if we're dragging a folder
    const folderData = e.dataTransfer.types.includes('application/folder');
    
    if (folderData && draggingFolderId) {
      // Clear any pending debounce timer
      if (dragDebounceTimer) {
        clearTimeout(dragDebounceTimer);
      }
      
      // Set the drop effect for folder reordering
      e.dataTransfer.dropEffect = 'move';
      
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      
      // Enhanced thresholds for better UX
      // Top area: first 25% for "insert before" 
      // Middle area: 25% to 75% for "move into folder" (50% of height - balanced zone)
      // Bottom area: last 25% for "insert after"
      const topThreshold = height * 0.25;
      const bottomThreshold = height * 0.75;
      
      // Determine operation with improved logic
      let targetOperation: 'move' | 'reorder-before' | 'reorder-after';
      if (y < topThreshold) {
        targetOperation = 'reorder-before';
      } else if (y > bottomThreshold) {
        targetOperation = 'reorder-after';
      } else {
        targetOperation = 'move';
      }
      
      // Optimized validation and immediate UI feedback
      const performValidationAndUpdate = () => {
        if (targetOperation === 'move') {
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
        } else {
          const validation = validateFolderOperation(draggingFolderId, folderId, 'reorder');
          if (validation.valid) {
            setFolderInsertPosition({ 
              folderId, 
              position: targetOperation === 'reorder-before' ? 'before' : 'after' 
            });
            setFolderDropTarget(null);
            setInvalidDropTarget(null);
          } else {
            setFolderInsertPosition(null);
            setFolderDropTarget(null);
            setInvalidDropTarget(folderId);
          }
        }
      };
      
      // For root-level folders, apply immediate feedback without debouncing
      const draggingFolder = folders.find(f => f.id === draggingFolderId);
      const targetFolder = folders.find(f => f.id === folderId);
      
      if (draggingFolder?.parent_folder_id === null && targetFolder?.parent_folder_id === null) {
        // Root-level operation - immediate feedback for better performance
        performValidationAndUpdate();
      } else {
        // Non-root operation - light debouncing to prevent flickering
        const timer = setTimeout(performValidationAndUpdate, 50);
        setDragDebounceTimer(timer);
      }
    } else {
      // Regular link drag
      e.dataTransfer.dropEffect = 'move';
      setDragOverFolderId(folderId);
    }
  };

  // Handle folder drag leave with improved boundary detection and debounce cleanup
  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear any pending debounce timer
    if (dragDebounceTimer) {
      clearTimeout(dragDebounceTimer);
      setDragDebounceTimer(null);
    }
    
    // More precise boundary checking to avoid premature clearing
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Add a small buffer to prevent flickering when moving between closely packed elements
    const buffer = 8; // Slightly increased buffer for better UX
    
    if (x < rect.left - buffer || x > rect.right + buffer || 
        y < rect.top - buffer || y > rect.bottom + buffer) {
      // Only clear if we're definitely outside the element
      setDragOverFolderId(null);
      setFolderDropTarget(null);
      setFolderInsertPosition(null);
      setInvalidDropTarget(null);
    }
  };

  // Handle folder drag end with cleanup
  const handleFolderDragEnd = () => {
    // Clear any pending debounce timer
    if (dragDebounceTimer) {
      clearTimeout(dragDebounceTimer);
      setDragDebounceTimer(null);
    }
    
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
    
    // Aggiorna immediatamente l'UI per responsività
    const originalFolders = [...folders];
    const updatedFolders = folders.map(folder => 
      folder.id === sourceFolderId 
        ? { ...folder, parent_folder_id: newParentId }
        : folder
    );
    
    setFolders(updatedFolders);
    buildFolderTree(updatedFolders);
    
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
        onFoldersChange();
        onToast?.('Cartella spostata con successo', 'success');
      } else {
        // Ripristina lo stato originale in caso di errore
        setFolders(originalFolders);
        buildFolderTree(originalFolders);
        
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante lo spostamento');
      }
    } catch (error) {
      // Ripristina lo stato originale in caso di errore
      setFolders(originalFolders);
      buildFolderTree(originalFolders);
      
      console.error('Errore durante lo spostamento:', error);
      onToast?.(`Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`, 'error');
    }
  };

  // Helper function to reorder folder at a specific position with optimized caching
  const reorderFolderAtPosition = async (sourceFolderId: string, targetFolderId: string, position: 'before' | 'after') => {
    // Validate the operation
    const validation = validateFolderOperation(sourceFolderId, targetFolderId, 'reorder');
    if (!validation.valid) {
      onToast?.(validation.error || 'Operazione non valida', 'error');
      return;
    }
    
    // Mark operation as pending to prevent duplicate requests
    if (pendingOperations.has(`${sourceFolderId}-${targetFolderId}-${position}`)) {
      return;
    }
    
    const operationId = `${sourceFolderId}-${targetFolderId}-${position}`;
    setPendingOperations(prev => new Set(prev).add(operationId));
    
    // Per il riordinamento, aggiorna immediatamente l'UI riorganizzando le posizioni
    const originalFolders = [...folders];
    const sourceFolder = folders.find(f => f.id === sourceFolderId);
    const targetFolder = folders.find(f => f.id === targetFolderId);
    
    if (sourceFolder && targetFolder) {
      // For root-level folders, use optimized position calculation
      const isRootLevel = sourceFolder.parent_folder_id === null && targetFolder.parent_folder_id === null;
      
      const updatedFolders = folders.map(folder => {
        if (folder.id === sourceFolderId) {
          // Aggiorna la posizione della cartella sorgente
          const newPosition = isRootLevel 
            ? (position === 'before' ? targetFolder.position - 0.1 : targetFolder.position + 0.1)
            : (position === 'before' ? targetFolder.position - 0.5 : targetFolder.position + 0.5);
          
          return {
            ...folder,
            position: newPosition
          };
        }
        return folder;
      });
      
      // Apply immediate UI update for better perceived performance
      setFolders(updatedFolders);
      buildFolderTree(updatedFolders);
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
        onFoldersChange();
        // For root-level operations, show success immediately
        if (sourceFolder?.parent_folder_id === null && targetFolder?.parent_folder_id === null) {
          onToast?.('Cartelle riordinate', 'success');
        } else {
          onToast?.('Cartella riordinata con successo', 'success');
        }
      } else {
        // Ripristina lo stato originale in caso di errore
        setFolders(originalFolders);
        buildFolderTree(originalFolders);
        
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante il riordinamento');
      }
    } catch (error) {
      // Ripristina lo stato originale in caso di errore
      setFolders(originalFolders);
      buildFolderTree(originalFolders);
      
      console.error('Errore durante il riordinamento:', error);
      onToast?.(`Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`, 'error');
    } finally {
      // Remove operation from pending set
      setPendingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(operationId);
        return newSet;
      });
    }
  };

  // Validation function for drag & drop operations
  const validateFolderOperation = (sourceFolderId: string, targetFolderId: string, operation: 'move' | 'reorder'): { valid: boolean; error?: string } => {
    // Check cache first
    const cacheKey = `${sourceFolderId}-${targetFolderId}-${operation}`;
    if (validationCache.current.has(cacheKey)) {
      return validationCache.current.get(cacheKey)!;
    }
    
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
    
    // Cache the result
    validationCache.current.set(cacheKey, { valid: true });
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
        {/* Yellow line indicator for "insert before" with enhanced styling */}
        {isInsertBefore && (
          <div className="h-1 bg-gradient-to-r from-yellow-400 to-yellow-500 mx-3 mb-1 rounded-full shadow-sm animate-pulse"></div>
        )}
        
        <div 
          className={`group flex items-center py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 transform ${
            isSelected ? 'bg-blue-50 border-l-4 border-blue-500 shadow-sm' : ''
          } ${isDragOver ? 'bg-blue-100 border-2 border-dashed border-blue-400 scale-105' : ''}
          ${isDropTarget ? 'bg-yellow-50 border-2 border-yellow-400 ring-2 ring-yellow-200 scale-105' : ''}
          ${isInvalidTarget ? 'bg-red-50 border-2 border-red-400 ring-2 ring-red-200 shake' : ''}
          ${isDraggingThis ? 'opacity-40 scale-95 transform rotate-1' : 'hover:bg-gray-100 hover:scale-102'}`}
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
                    setParentFolderId(node.id);
                    setIsCreatingFolder(true);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Crea sottocartella"
                >
                  <PlusIcon className="w-4 h-4 text-green-500" />
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
                  <PencilIcon className="w-4 h-4 text-gray-500" />
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
                    <TrashIcon className="w-4 h-4 text-red-500" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Yellow line indicator for "insert after" with enhanced styling */}
        {isInsertAfter && (
          <div className="h-1 bg-gradient-to-r from-yellow-400 to-yellow-500 mx-3 mt-1 rounded-full shadow-sm animate-pulse"></div>
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
  
  // Cleanup effect for timers
  useEffect(() => {
    return () => {
      if (dragDebounceTimer) {
        clearTimeout(dragDebounceTimer);
      }
    };
  }, [dragDebounceTimer]);
  
  // Find default folder (usually "All Links") when folders change
  useEffect(() => {
    if (folders && folders.length > 0) {
      const defaultFolder = folders.find(f => f.parent_folder_id === null);
      if (defaultFolder) {
        setDefaultFolderId(defaultFolder.id);
      }
    }
  }, [folders]);

  // Register the clearSelectionRef function
  useEffect(() => {
    if (onClearSelectionRef && clearSelectionRef.current) {
      onClearSelectionRef(() => clearSelectionRef.current);
    }
  }, [onClearSelectionRef, clearSelectionRef]);

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
        {/* Sezione "Tutti i link" - Stile sidebar invece di cartella */}
        {defaultFolderId && (
          <div className="border-b border-gray-200">
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
              <div className="flex items-center flex-1">
                <div className={`mr-3 transition-colors ${
                  selectedFolderId === defaultFolderId ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  <HomeIcon className="w-5 h-5" />
                </div>
                <span className={`font-medium transition-colors ${
                  selectedFolderId === defaultFolderId ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  Tutti i link
                </span>
              </div>
              <div className={`ml-2 flex items-center ${
                selectedFolderId === defaultFolderId ? 'text-blue-600' : 'text-gray-400'
              }`}>
                <DocumentIcon className="w-4 h-4 mr-1" />
                <span className="text-xs font-medium">Tutti</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Sezione Cartelle */}
        <div className="p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Cartelle</h3>
          </div>
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
