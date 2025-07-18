'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import LinkRow from './LinkRow';
import { LinkFromDB } from './LinkRow';
import { Folder } from './FolderSidebar';
import AdvancedFilters, { FilterOptions } from './AdvancedFilters';
import { FolderIcon, ChevronDownIcon, TrashIcon, ArrowPathIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import MultiFolderSelector from './MultiFolderSelector';

interface FolderCardProps {
  folder: Folder;
  onFolderSelect: (folderId: string) => void;
  linkCount: number;
  subfolderCount: number;
}

function FolderCard({ folder, onFolderSelect, linkCount, subfolderCount }: FolderCardProps) {
  const handleClick = () => {
    onFolderSelect(folder.id);
  };

  return (
    <div 
      className="bg-white border border-gray-200 rounded-2xl p-4 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
      onClick={handleClick}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <FolderIcon className="h-8 w-8 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{folder.name}</div>
          <div className="text-xs text-gray-500 mt-1">
            {linkCount > 0 && (
              <span>{linkCount} link{linkCount !== 1 ? 's' : ''}</span>
            )}
            {linkCount > 0 && subfolderCount > 0 && <span> • </span>}
            {subfolderCount > 0 && (
              <span>{subfolderCount} cartel{subfolderCount !== 1 ? 'le' : 'la'}</span>
            )}
            {linkCount === 0 && subfolderCount === 0 && (
              <span>Vuota</span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

interface FolderizedLinksListProps {
  links: LinkFromDB[];
  selectedFolderId: string | null;
  defaultFolderId: string | null;
  onUpdateLinks: () => void;
  onDeleteLink: (shortCode: string) => void;
  onUpdateLink?: (shortCode: string, updates: Partial<LinkFromDB>) => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
  folders: Folder[];
  onClearSelectionRef?: (func: () => void) => void;
  onFolderSelect?: (folderId: string) => void;
  enableMultipleFolders?: boolean;
  showMultipleFoldersColumn?: boolean;
  navigationHistory?: string[];
  navigationIndex?: number;
  onNavigationChange?: (history: string[], index: number) => void;
}

// Tipi per ordinamento
type SortField = 'created_at' | 'click_count' | 'unique_click_count' | 'title' | 'original_url';
type SortDirection = 'asc' | 'desc';

export default function FolderizedLinksList({ 
  links, 
  selectedFolderId, 
  defaultFolderId,
  onUpdateLinks,
  onDeleteLink,
  onUpdateLink,
  onToast,
  folders,
  onClearSelectionRef,
  onFolderSelect,
  enableMultipleFolders = true,
  showMultipleFoldersColumn = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  navigationHistory,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  navigationIndex,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onNavigationChange
}: FolderizedLinksListProps) {
  const [draggedLink, setDraggedLink] = useState<LinkFromDB | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Stato per ordinamento e filtri
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Stati per cartelle multiple
  const [showMultiFolderModal, setShowMultiFolderModal] = useState(false);
  const [selectedLinkForFolders, setSelectedLinkForFolders] = useState<LinkFromDB | null>(null);
  
  // Stati per batch operations integrate
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);

  // Stato per la visibilità delle sottocartelle
  const [showSubfolders, setShowSubfolders] = useState(true);

  // Funzioni di utilità per filtraggio e ordinamento
  const applyFilters = useCallback((links: LinkFromDB[], filters: FilterOptions): LinkFromDB[] => {
    return links.filter(link => {
      // Filtro per titolo
      if (filters.title && !(link.title?.toLowerCase() || '').includes(filters.title.toLowerCase())) {
        return false;
      }
      
      // Filtro per URL
      if (filters.url && !link.original_url.toLowerCase().includes(filters.url.toLowerCase())) {
        return false;
      }
      
      // Filtro per range di click
      if (filters.clicksMin !== undefined && link.click_count < filters.clicksMin) {
        return false;
      }
      if (filters.clicksMax !== undefined && link.click_count > filters.clicksMax) {
        return false;
      }
      
      // Filtro per data
      if (filters.dateFrom) {
        const linkDate = new Date(link.created_at);
        const filterDate = new Date(filters.dateFrom);
        if (linkDate < filterDate) return false;
      }
      if (filters.dateTo) {
        const linkDate = new Date(link.created_at);
        const filterDate = new Date(filters.dateTo);
        if (linkDate > filterDate) return false;
      }
      
      return true;
    });
  }, []);

  const applySorting = useCallback((links: LinkFromDB[], field: SortField, direction: SortDirection): LinkFromDB[] => {
    return [...links].sort((a, b) => {
      let valueA: string | number;
      let valueB: string | number;
      
      switch (field) {
        case 'created_at':
          valueA = new Date(a.created_at).getTime();
          valueB = new Date(b.created_at).getTime();
          break;
        case 'click_count':
          valueA = a.click_count;
          valueB = b.click_count;
          break;
        case 'unique_click_count':
          valueA = a.unique_click_count;
          valueB = b.unique_click_count;
          break;
        case 'title':
          valueA = (a.title || '').toLowerCase();
          valueB = (b.title || '').toLowerCase();
          break;
        case 'original_url':
          valueA = a.original_url.toLowerCase();
          valueB = b.original_url.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (direction === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });
  }, []);

  const countActiveFilters = useCallback((filters: FilterOptions): number => {
    let count = 0;
    if (filters.title) count++;
    if (filters.url) count++;
    if (filters.clicksMin !== undefined) count++;
    if (filters.clicksMax !== undefined) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    return count;
  }, []);

  // Filtra i link per la cartella selezionata
  const getFilteredLinksForFolder = useCallback((): LinkFromDB[] => {
    if (selectedFolderId === defaultFolderId || selectedFolderId === null) {
      return links;
    }
    
    const filtered = links.filter(link => 
      link.folders && link.folders.some(folder => folder.id === selectedFolderId)
    );
    
    return filtered;
  }, [links, selectedFolderId, defaultFolderId]);

  const getFilteredAndSortedLinks = useCallback((): LinkFromDB[] => {
    const folderFilteredLinks = getFilteredLinksForFolder();
    const filteredLinks = applyFilters(folderFilteredLinks, filters);
    return applySorting(filteredLinks, sortField, sortDirection);
  }, [getFilteredLinksForFolder, applyFilters, filters, applySorting, sortField, sortDirection]);

  const activeFiltersCount = countActiveFilters(filters);
  const filteredLinks = getFilteredAndSortedLinks();

  // Reset selezione e filtri quando cambia la cartella
  useEffect(() => {
    setSelectedLinks(new Set());
    setLastSelectedIndex(null);
    setFilters({});
    setShowFilters(false);
    setSelectionMode(false);
  }, [selectedFolderId]);

  // Gestione della selezione con Ctrl e Shift
  const handleLinkSelection = useCallback((linkId: string, event: React.MouseEvent & { isRowClick?: boolean }) => {
    const linkIndex = filteredLinks.findIndex(link => link.id === linkId);
    
    const isMobileDevice = !window.matchMedia('(hover: hover)').matches;
    const isDirectRowClick = (event as React.MouseEvent & { isRowClick?: boolean }).isRowClick;
    
    if (event.ctrlKey || event.metaKey) {
      setSelectedLinks(prev => {
        const newSet = new Set(prev);
        if (newSet.has(linkId)) {
          newSet.delete(linkId);
        } else {
          newSet.add(linkId);
        }
        return newSet;
      });
      setLastSelectedIndex(linkIndex);
      setSelectionMode(true);
    } else if (event.shiftKey && lastSelectedIndex !== null && !isMobileDevice) {
      const start = Math.min(lastSelectedIndex, linkIndex);
      const end = Math.max(lastSelectedIndex, linkIndex);
      const rangeIds = filteredLinks.slice(start, end + 1).map(link => link.id);
      
      setSelectedLinks(prev => {
        const newSet = new Set(prev);
        rangeIds.forEach(id => newSet.add(id));
        return newSet;
      });
      setSelectionMode(true);
    } else if (isMobileDevice || isDirectRowClick) {
      setSelectedLinks(prev => {
        const newSet = new Set(prev);
        if (newSet.has(linkId)) {
          newSet.delete(linkId);
        } else {
          newSet.add(linkId);
        }
        return newSet;
      });
      setLastSelectedIndex(linkIndex);
      setSelectionMode(true);
    } else {
      setSelectedLinks(new Set([linkId]));
      setLastSelectedIndex(linkIndex);
      setSelectionMode(true);
    }
  }, [filteredLinks, lastSelectedIndex]);

  // Gestione del drag and drop
  const handleDragStart = (e: React.DragEvent, link: LinkFromDB) => {
    setDraggedLink(link);
    e.dataTransfer.effectAllowed = 'move';
    
    if (selectedLinks.has(link.id)) {
      e.dataTransfer.setData('text/plain', JSON.stringify([...selectedLinks]));
    } else {
      e.dataTransfer.setData('text/plain', JSON.stringify([link.id]));
    }
  };

  const handleDragEnd = () => {
    setDraggedLink(null);
  };

  // Funzione per batch move
  const handleBatchMoveToFolder = useCallback(async (linkIds: string[], folderId: string | null) => {
    const response = await fetch('/api/links/batch-move', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        linkIds,
        folderId,
        sourceFolderId: selectedFolderId === defaultFolderId ? null : selectedFolderId
      }),
    });

    if (response.ok) {
      onUpdateLinks();
    } else {
      const errorData = await response.json();
      console.error('❌ Errore API batch-move:', errorData);
      throw new Error(errorData.error || 'Errore durante lo spostamento');
    }
  }, [selectedFolderId, defaultFolderId, onUpdateLinks]);

  // Crea la lista piatta delle cartelle per il dropdown
  const buildFlatFolderList = (folders: Folder[]): Array<{folder: Folder, depth: number}> => {
    type FolderWithChildren = Folder & {children: FolderWithChildren[]};
    const folderMap = new Map<string, FolderWithChildren>();
    
    folders.forEach(folder => {
      if (folder.name !== 'Tutti i link') {
        folderMap.set(folder.id, { ...folder, children: [] });
      }
    });
    
    const rootFolders: FolderWithChildren[] = [];
    
    folders.forEach(folder => {
      if (folder.name !== 'Tutti i link') {
        const folderWithChildren = folderMap.get(folder.id)!;
        
        if (folder.parent_folder_id) {
          const parent = folderMap.get(folder.parent_folder_id);
          if (parent) {
            parent.children.push(folderWithChildren);
          }
        } else {
          rootFolders.push(folderWithChildren);
        }
      }
    });
    
    const flattenTree = (folder: FolderWithChildren, depth: number = 0): Array<{folder: Folder, depth: number}> => {
      const result = [{ folder: folder as Folder, depth }];
      
      if (folder.children) {
        folder.children.forEach((child: FolderWithChildren) => {
          result.push(...flattenTree(child, depth + 1));
        });
      }
      
      return result;
    };
    
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

  // Event listener per il tasto ESC per annullare la modalità selezione
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectionMode) {
        setSelectionMode(false);
        handleClearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectionMode]);

  const handleClearSelection = () => {
    setSelectedLinks(new Set());
    setLastSelectedIndex(null);
  };
  
  // Expose clear selection function via ref
  useEffect(() => {
    if (onClearSelectionRef) {
      onClearSelectionRef(handleClearSelection);
    }
  }, [onClearSelectionRef]);

  const toggleSelectAll = () => {
    if (selectedLinks.size === filteredLinks.length) {
      setSelectedLinks(new Set());
    } else {
      setSelectedLinks(new Set(filteredLinks.map(link => link.id)));
    }
  };

  // Ottiene le sottocartelle della cartella corrente
  const getSubfolders = useCallback(() => {
    if (!selectedFolderId || selectedFolderId === defaultFolderId) {
      return [];
    }
    
    return folders.filter(folder => folder.parent_folder_id === selectedFolderId);
  }, [folders, selectedFolderId, defaultFolderId]);

  // Calcola il numero di link e sottocartelle per ogni cartella (inclusi tutti i livelli nidificati)
  const getFolderStats = useCallback((folderId: string) => {
    // Funzione ricorsiva per ottenere tutte le cartelle figlie a qualsiasi livello
    const getAllDescendantFolders = (parentFolderId: string): string[] => {
      const directChildren = folders
        .filter(folder => folder.parent_folder_id === parentFolderId)
        .map(folder => folder.id);
      
      const allDescendants = [...directChildren];
      
      // Per ogni figlio diretto, ottieni ricorsivamente tutti i suoi discendenti
      directChildren.forEach(childId => {
        allDescendants.push(...getAllDescendantFolders(childId));
      });
      
      return allDescendants;
    };

    // Ottieni tutte le cartelle figlie (inclusa quella corrente)
    const allFolderIds = [folderId, ...getAllDescendantFolders(folderId)];
    
    // Conta tutti i link associati a qualsiasi cartella nella gerarchia
    const linkCount = links.filter(link => 
      link.folders && link.folders.some(folder => allFolderIds.includes(folder.id))
    ).length;
    
    // Conta tutte le sottocartelle (esclusa quella corrente)
    const subfolderCount = allFolderIds.length - 1;
    
    return { linkCount, subfolderCount };
  }, [links, folders]);

  // Funzioni per gestione cartelle multiple
  const handleManageFolders = useCallback((link: LinkFromDB) => {
    setSelectedLinkForFolders(link);
    setShowMultiFolderModal(true);
  }, []);

  const handleSaveFolderAssociations = useCallback(async (linkId: string, selectedFolderIds: string[]) => {
    try {
      const response = await fetch(`/api/link-folder-associations?linkId=${linkId}`);
      const data = await response.json();
      const currentFolderIds = data.associations?.map((assoc: { folder_id: string }) => assoc.folder_id) || [];

      const foldersToAdd = selectedFolderIds.filter(id => !currentFolderIds.includes(id));
      const foldersToRemove = currentFolderIds.filter((id: string) => !selectedFolderIds.includes(id));

      if (foldersToAdd.length > 0) {
        await fetch('/api/link-folder-associations/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            linkIds: [linkId],
            folderIds: foldersToAdd
          })
        });
      }

      if (foldersToRemove.length > 0) {
        await fetch('/api/link-folder-associations/batch', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            linkIds: [linkId],
            folderIds: foldersToRemove
          })
        });
      }

      if (onUpdateLink && selectedLinkForFolders) {
        const updatedFolders = folders.filter(folder => selectedFolderIds.includes(folder.id))
          .map(folder => ({
            id: folder.id,
            name: folder.name,
            parent_folder_id: folder.parent_folder_id
          }));
        
        onUpdateLink(selectedLinkForFolders.short_code, { folders: updatedFolders });
      }

      setShowMultiFolderModal(false);
      setSelectedLinkForFolders(null);
    } catch (error) {
      console.error('Errore durante l\'aggiornamento delle associazioni:', error);
      throw error;
    }
  }, [folders, onUpdateLink, selectedLinkForFolders]);

  const subfolders = getSubfolders();
  const selectedFolder = folders.find(f => f.id === selectedFolderId);
  const currentFolderName = selectedFolderId === defaultFolderId ? 'Tutti i link' : selectedFolder?.name || 'Cartella sconosciuta';

  if (filteredLinks.length === 0 && subfolders.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-white rounded-3xl shadow-md h-full flex flex-col overflow-hidden">
          {/* Header con informazioni della cartella */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {currentFolderName}
                </h3>
                
                {/* Pulsante Seleziona (disabilitato quando vuoto) */}
                <button
                  disabled
                  className="px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed"
                >
                  Seleziona
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  0 links
                </span>
                
                {/* Filtri e ordinamento */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowFilters(true)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors font-medium ${
                      activeFiltersCount > 0 
                        ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    {activeFiltersCount > 0 ? `Filtri (${activeFiltersCount})` : 'Filtri avanzati'}
                  </button>
                  
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={() => {
                        setFilters({});
                      }}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 border border-red-300 transition-colors"
                      title="Azzera tutti i filtri"
                    >
                      Azzera
                    </button>
                  )}
                  
                  <select
                    value={`${sortField}-${sortDirection}`}
                    onChange={(e) => {
                      const [field, direction] = e.target.value.split('-');
                      setSortField(field as SortField);
                      setSortDirection(direction as SortDirection);
                    }}
                    className="text-xs border border-gray-300 rounded-lg py-1 px-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="created_at-desc">Più recenti</option>
                    <option value="created_at-asc">Più vecchi</option>
                    <option value="click_count-desc">Più cliccati</option>
                    <option value="click_count-asc">Meno cliccati</option>
                    <option value="unique_click_count-desc">Più click unici</option>
                    <option value="unique_click_count-asc">Meno click unici</option>
                    <option value="title-asc">Titolo A-Z</option>
                    <option value="title-desc">Titolo Z-A</option>
                    <option value="original_url-asc">URL A-Z</option>
                    <option value="original_url-desc">URL Z-A</option>
                  </select>
                </div>
              </div>
            </div>
            {/* Componente AdvancedFilters */}
            <AdvancedFilters
              isOpen={showFilters}
              onClose={() => setShowFilters(false)}
              onApply={setFilters}
              onReset={() => setFilters({})}
              initialFilters={filters}
              links={links}
            />
          </div>
          
          {/* Area vuota con messaggio */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun link trovato</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {activeFiltersCount > 0 
                    ? "I filtri applicati non hanno prodotto risultati." 
                    : selectedFolderId === defaultFolderId 
                    ? "Non hai ancora creato nessun link." 
                    : "Questa cartella è vuota."
                  }
                </p>
                {activeFiltersCount > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => setFilters({})}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Azzera filtri
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white rounded-3xl shadow-md h-full flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedFolderId === defaultFolderId ? 'Tutti i link' : 'Link in cartella'}
              </h3>
              
              {/* Pulsante Seleziona */}
              <button
                onClick={() => {
                  if (selectionMode) {
                    setSelectionMode(false);
                    handleClearSelection();
                  } else {
                    setSelectionMode(true);
                  }
                }}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectionMode 
                    ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                {selectionMode ? 'Annulla Selezione' : 'Seleziona'}
              </button>
              
              {/* Pulsante Seleziona Tutto - visibile solo in modalità selezione */}
              {selectionMode && (
                <button
                  onClick={toggleSelectAll}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedLinks.size === filteredLinks.length
                      ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                  }`}
                >
                  {selectedLinks.size === filteredLinks.length ? 'Deseleziona Tutto' : 'Seleziona Tutto'}
                </button>
              )}

              {/* Pulsanti batch operations integrate */}
              {selectionMode && selectedLinks.size > 0 && (
                <>
                  {/* Sposta in cartella */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                      className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-2xl text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <FolderIcon className="h-4 w-4" />
                      <span>Sposta in</span>
                      <div className="flex items-center space-x-1 ml-2">
                        <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          {selectedLinks.size}
                        </span>
                        <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${showFolderDropdown ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    
                    {showFolderDropdown && (
                      <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl z-20 backdrop-blur-sm overflow-hidden">
                        {/* Header del dropdown */}
                        <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                              <FolderIcon className="w-4 h-4 mr-2 text-gray-500" />
                              Sposta {selectedLinks.size} link
                            </h4>
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                              {flatFolderList.length + 1} destinazioni
                            </span>
                          </div>
                        </div>
                        
                        <div className="py-2 max-h-80 overflow-y-auto">
                          {/* Opzione "Tutti i link" */}
                          <button
                            onClick={async () => {
                              await handleBatchMoveToFolder(Array.from(selectedLinks), null);
                              setShowFolderDropdown(false);
                              handleClearSelection();
                              onToast?.(`Tutti i link sono stati spostati in "Tutti i link"`, 'success');
                            }}
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center transition-all duration-200 border-l-4 border-transparent hover:border-blue-500"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 bg-gray-100 text-gray-600">
                              <FolderIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <span className="font-medium">Tutti i link</span>
                              <div className="text-xs text-gray-500 mt-0.5">Cartella principale</div>
                            </div>
                          </button>
                          
                          {flatFolderList.map(({ folder, depth }) => {
                            const hasChildren = flatFolderList.some(f => f.folder.parent_folder_id === folder.id);
                            
                            return (
                              <button
                                key={folder.id}
                                onClick={async () => {
                                  await handleBatchMoveToFolder(Array.from(selectedLinks), folder.id);
                                  setShowFolderDropdown(false);
                                  handleClearSelection();
                                  onToast?.(`Tutti i link sono stati spostati in "${folder.name}"`, 'success');
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center transition-all duration-200 border-l-4 border-transparent hover:border-blue-500"
                                style={{ paddingLeft: `${16 + depth * 24}px` }}
                              >
                                {/* Indicatori gerarchia visivi */}
                                <div className="flex items-center mr-3 flex-shrink-0">
                                  {depth > 0 && (
                                    <div className="flex items-center">
                                      {/* Linee di connessione gerarchia */}
                                      {Array.from({ length: depth }, (_, i) => (
                                        <div
                                          key={i}
                                          className={`w-6 h-full flex items-center justify-center ${
                                            i === depth - 1 ? 'text-gray-400' : 'text-gray-300'
                                          }`}
                                        >
                                          {i === depth - 1 ? (
                                            <div className="w-4 h-4 border-l-2 border-b-2 border-gray-300 rounded-bl-lg"></div>
                                          ) : (
                                            <div className="w-px h-8 bg-gray-200"></div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Icona cartella con stile professionale */}
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                    depth === 0 
                                      ? 'bg-blue-100 text-blue-600' 
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    <FolderIcon className="w-4 h-4" />
                                  </div>
                                </div>
                                
                                {/* Contenuto cartella */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center min-w-0">
                                      <span className="font-medium truncate text-gray-900">
                                        {folder.name}
                                      </span>
                                      
                                      {/* Badge livello per cartelle annidate */}
                                      {depth > 0 && (
                                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full flex-shrink-0 bg-gray-200 text-gray-600">
                                          L{depth + 1}
                                        </span>
                                      )}
                                      
                                      {/* Indicatore sottocartelle */}
                                      {hasChildren && (
                                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full flex-shrink-0 bg-orange-100 text-orange-600">
                                          Ha sottocartelle
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Percorso gerarchia per cartelle annidate */}
                                  {depth > 0 && (
                                    <div className="mt-1 text-xs text-gray-500 truncate">
                                      Sottocartella di livello {depth + 1}
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        
                        {/* Footer informativo */}
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center space-x-4">
                              <span className="flex items-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                                Root
                              </span>
                              <span className="flex items-center">
                                <div className="w-2 h-2 bg-orange-400 rounded-full mr-1"></div>
                                Con sottocartelle
                              </span>
                            </div>
                            <span>
                              {flatFolderList.length + 1} destinazioni disponibili
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Azzera click */}
                  <button
                    onClick={async () => {
                      try {
                        const selectedLinkArray = Array.from(selectedLinks);
                        
                        // Converti gli ID in short_code
                        const shortCodes = selectedLinkArray
                          .map(linkId => {
                            const link = links.find(l => l.id === linkId);
                            return link?.short_code;
                          })
                          .filter(Boolean); // Rimuove eventuali undefined
                        
                        if (shortCodes.length === 0) {
                          onToast?.('Nessun link valido selezionato', 'error');
                          return;
                        }
                        
                        // Chiamata API batch per reset click
                        const response = await fetch('/api/links/batch-reset-clicks', {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ shortCodes }),
                        });
                        
                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.error || 'Errore durante l\'azzeramento');
                        }
                        
                        const result = await response.json();
                        
                        handleClearSelection();
                        onToast?.(result.message || `Click azzerati per ${shortCodes.length} link`, 'success');
                        onUpdateLinks(); // Aggiorna la lista per riflettere le modifiche
                        
                      } catch (error) {
                        console.error('Errore durante l\'azzeramento batch:', error);
                        onToast?.('Errore durante l\'azzeramento dei click', 'error');
                      }
                    }}
                    className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-2xl text-sm font-medium text-red-600 hover:bg-red-50 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    <span>Azzera click</span>
                    <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      {selectedLinks.size}
                    </span>
                  </button>
                  
                  {/* Elimina */}
                  <button
                    onClick={async () => {
                      try {
                        const selectedLinkArray = Array.from(selectedLinks);
                        const linksToDelete = links.filter(l => selectedLinks.has(l.id))
                          .map(l => l.short_code);
                        
                        if (linksToDelete.length === 0) {
                          onToast?.('Nessun link selezionato da eliminare', 'error');
                          return;
                        }
                        
                        // Chiamata API batch per eliminazione
                        const response = await fetch('/api/links/batch-delete', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ shortCodes: linksToDelete })
                        });
                        
                        if (!response.ok) {
                          throw new Error(`Errore API: ${response.status}`);
                        }
                        
                        handleClearSelection();
                        onToast?.(`${linksToDelete.length} link eliminati`, 'success');
                        
                        // Rimuovi i link eliminati dalla lista locale
                        onUpdateLinks();
                      } catch (error) {
                        console.error('Errore durante l\'eliminazione batch:', error);
                        onToast?.('Errore durante l\'eliminazione dei link', 'error');
                      }
                    }}
                    className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span>Elimina</span>
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {filteredLinks.length} link{filteredLinks.length !== 1 ? 's' : ''}
              </span>
              {selectionMode && (
                <span className="text-sm text-blue-600">
                  ({selectedLinks.size} selezionati)
                </span>
              )}
              
              {/* Filtri e ordinamento */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFilters(true)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors font-medium ${
                    activeFiltersCount > 0 
                      ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  {activeFiltersCount > 0 ? `Filtri (${activeFiltersCount})` : 'Filtri avanzati'}
                </button>
                
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => {
                      setFilters({});
                    }}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 border border-red-300 transition-colors"
                    title="Azzera tutti i filtri"
                  >
                    Azzera
                  </button>
                )}
                
                <select
                  value={`${sortField}-${sortDirection}`}
                  onChange={(e) => {
                    const [field, direction] = e.target.value.split('-');
                    setSortField(field as SortField);
                    setSortDirection(direction as SortDirection);
                  }}
                  className="text-xs border border-gray-300 rounded-lg py-1 px-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="created_at-desc">Più recenti</option>
                  <option value="created_at-asc">Più vecchi</option>
                  <option value="click_count-desc">Più cliccati</option>
                  <option value="click_count-asc">Meno cliccati</option>
                  <option value="unique_click_count-desc">Più click unici</option>
                  <option value="unique_click_count-asc">Meno click unici</option>
                  <option value="title-asc">Titolo A-Z</option>
                  <option value="title-desc">Titolo Z-A</option>
                  <option value="original_url-asc">URL A-Z</option>
                  <option value="original_url-desc">URL Z-A</option>
                </select>
              </div>
            </div>
          </div>
          {/* Componente AdvancedFilters */}
          <AdvancedFilters
            isOpen={showFilters}
            onClose={() => setShowFilters(false)}
            onApply={(newFilters) => {
              setFilters(newFilters);
              setShowFilters(false);
            }}
            onReset={() => {
              setFilters({});
              setShowFilters(false);
            }}
            initialFilters={filters}
            links={links}
          />
        </div>
        
        {/* Sezione Cartelle - mostrata sopra la tabella dei link */}
        {subfolders.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-50 relative">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700 flex items-center">
                <span className="bg-blue-100 p-1 rounded-md text-blue-700 mr-2">
                  <FolderIcon className="h-4 w-4 inline-block" />
                </span>
                <span>Cartelle interne ({subfolders.length})</span>
              </h4>
              
              {/* Toggle per nascondere/mostrare le sottocartelle */}
              <button
                onClick={() => setShowSubfolders(!showSubfolders)}
                className="absolute -top-3 right-6 bg-white rounded-full p-2 shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
                title={showSubfolders ? "Nascondi cartelle" : "Mostra cartelle"}
              >
                {showSubfolders ? (
                  <EyeSlashIcon className="h-4 w-4 text-gray-600" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-gray-600" />
                )}
              </button>
            </div>
            
            {/* Griglia delle cartelle con transizione */}
            <div className={`transition-all duration-300 overflow-hidden ${showSubfolders ? 'opacity-100 max-h-none' : 'opacity-0 max-h-0'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {subfolders.map((folder) => {
                  const stats = getFolderStats(folder.id);
                  return (
                    <FolderCard
                      key={`folder-${folder.id}`}
                      folder={folder}
                      onFolderSelect={onFolderSelect || (() => {})}
                      linkCount={stats.linkCount}
                      subfolderCount={stats.subfolderCount}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-auto" ref={tableRef}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {selectionMode && (
                  <th className="px-6 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={selectedLinks.size === filteredLinks.length && filteredLinks.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </th>
                )}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64 cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'title') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('title');
                      setSortDirection('asc');
                    }
                  }}
                >
                  <div className="flex items-center">
                    Titolo
                    {sortField === 'title' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                {showMultipleFoldersColumn && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56">
                    Cartelle
                  </th>
                )}
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'click_count') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('click_count');
                      setSortDirection('desc');
                    }
                  }}
                >
                  <div className="flex items-center justify-center">
                    Click Totali
                    {sortField === 'click_count' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'unique_click_count') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('unique_click_count');
                      setSortDirection('desc');
                    }
                  }}
                >
                  <div className="flex items-center justify-center">
                    Click Unici
                    {sortField === 'unique_click_count' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44 cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'created_at') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('created_at');
                      setSortDirection('desc');
                    }
                  }}
                >
                  <div className="flex items-center">
                    Data
                    {sortField === 'created_at' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Link Breve
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'original_url') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('original_url');
                      setSortDirection('asc');
                    }
                  }}
                >
                  <div className="flex items-center">
                    URL Originale
                    {sortField === 'original_url' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-80">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLinks.map((link) => (
                <LinkRow
                  key={link.id}
                  link={link}
                  onDelete={onDeleteLink}
                  onUpdateLink={onUpdateLink}
                  isDragging={draggedLink?.id === link.id}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onToast={onToast}
                  isSelected={selectedLinks.has(link.id)}
                  onSelect={handleLinkSelection}
                  selectionMode={selectionMode}
                  onManageFolders={enableMultipleFolders ? handleManageFolders : undefined}
                  showMultipleFolders={showMultipleFoldersColumn}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal per gestione cartelle multiple */}
      {enableMultipleFolders && (
        <MultiFolderSelector
          isOpen={showMultiFolderModal}
          onClose={() => {
            setShowMultiFolderModal(false);
            setSelectedLinkForFolders(null);
          }}
          linkId={selectedLinkForFolders?.id || ''}
          linkTitle={selectedLinkForFolders?.title || selectedLinkForFolders?.short_code}
          currentFolders={selectedLinkForFolders?.folders || []}
          availableFolders={folders}
          onSave={handleSaveFolderAssociations}
          onToast={onToast}
        />
      )}
    </div>
  );
}
