'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import LinkRow from './LinkRow';
import { LinkFromDB } from './LinkRow';
import BatchOperations from './BatchOperations';
import { Folder } from './FolderSidebar';

interface FolderizedLinksListProps {
  links: LinkFromDB[];
  selectedFolderId: string | null;
  defaultFolderId: string | null;
  onUpdateLinks: () => void;
  onDeleteLink: (shortCode: string) => void;
  onUpdateLink?: (shortCode: string, updates: Partial<LinkFromDB>) => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
  folders: Folder[];
  onClearSelectionRef?: (func: () => void) => void; // Add reference to clear selection function
}

// Tipi per filtri e ordinamento
type SortField = 'created_at' | 'click_count' | 'unique_click_count' | 'title' | 'original_url';
type SortDirection = 'asc' | 'desc';
type FilterOptions = {
  dateFrom?: Date;
  dateTo?: Date;
  originalDomain?: string;
  shortDomain?: string;
  minClicks?: number;
  maxClicks?: number;
};

export default function FolderizedLinksList({ 
  links, 
  selectedFolderId, 
  defaultFolderId,
  onDeleteLink,
  onUpdateLink,
  onToast,
  folders,
  onClearSelectionRef
}: FolderizedLinksListProps) {
  const [draggedLink, setDraggedLink] = useState<LinkFromDB | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(true); // Always active
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Stato per ordinamento e filtri
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);

  // Funzioni di utilità per filtri
  const getDomainFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return '';
    }
  };
  
  // Applica filtri e ordinamento
  const getFilteredAndSortedLinks = useCallback(() => {
    // Prima filtra per cartella
    let result = links.filter(link => {
      // Se è selezionata la cartella "Tutti i link", mostra tutti i link
      if (selectedFolderId === defaultFolderId) {
        return true;
      }
      // Altrimenti mostra solo i link della cartella specifica
      return link.folder_id === selectedFolderId;
    });
    
    // Poi applica i filtri aggiuntivi
    if (filters) {
      if (filters.dateFrom) {
        result = result.filter(link => 
          new Date(link.created_at) >= filters.dateFrom!
        );
      }
      
      if (filters.dateTo) {
        result = result.filter(link => 
          new Date(link.created_at) <= filters.dateTo!
        );
      }
      
      if (filters.originalDomain) {
        const domain = filters.originalDomain.toLowerCase();
        result = result.filter(link => 
          getDomainFromUrl(link.original_url).toLowerCase().includes(domain)
        );
      }
      
      if (filters.shortDomain && typeof window !== 'undefined') {
        const domain = filters.shortDomain.toLowerCase();
        const origin = window.location.origin;
        result = result.filter(link => 
          `${origin}/${link.short_code}`.toLowerCase().includes(domain)
        );
      }
      
      if (filters.minClicks !== undefined) {
        result = result.filter(link => 
          link.click_count >= filters.minClicks!
        );
      }
      
      if (filters.maxClicks !== undefined) {
        result = result.filter(link => 
          link.click_count <= filters.maxClicks!
        );
      }
    }
    
    // Infine ordina
    return result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'original_url':
          comparison = a.original_url.localeCompare(b.original_url);
          break;
        case 'click_count':
          comparison = a.click_count - b.click_count;
          break;
        case 'unique_click_count':
          comparison = (a.unique_click_count || 0) - (b.unique_click_count || 0);
          break;
        case 'created_at':
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [links, selectedFolderId, defaultFolderId, filters, sortField, sortDirection]);
  
  const filteredLinks = getFilteredAndSortedLinks();

  // Reset selezione e filtri quando cambia la cartella
  useEffect(() => {
    setSelectedLinks(new Set());
    setLastSelectedIndex(null);
    setFilters({}); // Reset filters
    setShowFilters(false); // Hide filters panel
    // Selection mode is always active, no need to reset it
  }, [selectedFolderId]);

  // Gestione delle scorciatoie da tastiera
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectionMode && filteredLinks.length > 0) {
        if (event.ctrlKey && event.key === 'a') {
          event.preventDefault();
          setSelectedLinks(new Set(filteredLinks.map(link => link.id)));
        } else if (event.key === 'Escape') {
          event.preventDefault();
          handleClearSelection();
        }
      }
    };

    if (selectionMode) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectionMode, filteredLinks]);

  // Gestione della selezione con Ctrl e Shift
  const handleLinkSelection = useCallback((linkId: string, event: React.MouseEvent) => {
    const linkIndex = filteredLinks.findIndex(link => link.id === linkId);
    
    // Handle checkbox click (simulated Ctrl key) or actual Ctrl key
    if (event.ctrlKey || event.metaKey) {
      // Ctrl+click o click su checkbox: toggle selezione singola
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
    } else if (event.shiftKey && lastSelectedIndex !== null) {
      // Shift+click: selezione intervallo
      const start = Math.min(lastSelectedIndex, linkIndex);
      const end = Math.max(lastSelectedIndex, linkIndex);
      const rangeIds = filteredLinks.slice(start, end + 1).map(link => link.id);
      
      setSelectedLinks(prev => {
        const newSet = new Set(prev);
        rangeIds.forEach(id => newSet.add(id));
        return newSet;
      });
      setSelectionMode(true);
    } else {
      // Click normale sulla riga: selezione singola (deseleziona gli altri)
      setSelectedLinks(new Set([linkId]));
      setLastSelectedIndex(linkIndex);
      setSelectionMode(true);
    }
  }, [filteredLinks, lastSelectedIndex]);

  // Gestione del drag and drop
  const handleDragStart = (e: React.DragEvent, link: LinkFromDB) => {
    setDraggedLink(link);
    e.dataTransfer.effectAllowed = 'move';
    
    // Se il link è selezionato, trascina tutti i link selezionati
    if (selectedLinks.has(link.id)) {
      e.dataTransfer.setData('text/plain', JSON.stringify([...selectedLinks]));
    } else {
      e.dataTransfer.setData('text/plain', JSON.stringify([link.id]));
    }
  };

  const handleDragEnd = () => {
    setDraggedLink(null);
  };

  // Operazioni batch
  const handleBatchDelete = useCallback(async (linkIds: string[]) => {
    const linksToDelete = links.filter(link => linkIds.includes(link.id));
    
    // Elimina i link uno per volta
    for (const link of linksToDelete) {
      try {
        await onDeleteLink(link.short_code);
      } catch (error) {
        console.error('Errore durante l\'eliminazione del link:', link.short_code, error);
        throw error; // Rilancia l'errore per gestirlo nel BatchOperations
      }
    }
  }, [links, onDeleteLink]);

  const handleBatchResetClicks = useCallback(async (linkIds: string[]) => {
    const linksToReset = links.filter(link => linkIds.includes(link.id));
    
    for (const link of linksToReset) {
      const response = await fetch(`/api/links/reset-clicks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortCode: link.short_code
        }),
      });

      if (response.ok && onUpdateLink) {
        onUpdateLink(link.short_code, { click_count: 0 });
      }
    }
  }, [links, onUpdateLink]);

  const handleBatchMoveToFolder = useCallback(async (linkIds: string[], folderId: string | null) => {
    for (const linkId of linkIds) {
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
        // Aggiorna lo stato locale
        if (onUpdateLink) {
          const link = links.find(l => l.id === linkId);
          if (link) {
            onUpdateLink(link.short_code, { folder_id: folderId });
          }
        }
      }
    }
  }, [links, onUpdateLink]);

  const handleClearSelection = () => {
    setSelectedLinks(new Set());
    setLastSelectedIndex(null);
    // Selection mode stays active
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

  if (filteredLinks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md h-full flex items-center justify-center">
        <div className="text-center py-12">
          <div className="text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun link trovato</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedFolderId === defaultFolderId 
                ? "Non hai ancora creato nessun link." 
                : "Questa cartella è vuota."
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Operazioni batch */}
      <BatchOperations
        selectedLinks={[...selectedLinks]}
        folders={folders}
        onBatchDelete={handleBatchDelete}
        onBatchResetClicks={handleBatchResetClicks}
        onBatchMoveToFolder={handleBatchMoveToFolder}
        onClearSelection={handleClearSelection}
        onToast={onToast}
      />
      
      <div className="bg-white rounded-lg shadow-md h-full flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedFolderId === defaultFolderId ? 'Tutti i link' : 'Link in cartella'}
              </h3>
              {selectionMode && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Ctrl+A per selezionare tutto • Esc per deselezionare • Ctrl+Click per selezione multipla • Shift+Click per intervallo
                </span>
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
              <div className="flex items-center">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                    showFilters || Object.keys(filters).length > 0 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {Object.keys(filters).length > 0 ? 'Filtri attivi' : 'Filtri'}
                </button>
                
                <select
                  value={`${sortField}-${sortDirection}`}
                  onChange={(e) => {
                    const [field, direction] = e.target.value.split('-');
                    setSortField(field as SortField);
                    setSortDirection(direction as SortDirection);
                  }}
                  className="ml-2 text-xs border border-gray-300 rounded-lg py-1 px-2 bg-white"
                >
                  <option value="created_at-desc">Data (più recenti)</option>
                  <option value="created_at-asc">Data (più vecchi)</option>
                  <option value="click_count-desc">Click (più alto)</option>
                  <option value="click_count-asc">Click (più basso)</option>
                  <option value="title-asc">Titolo (A-Z)</option>
                  <option value="title-desc">Titolo (Z-A)</option>
                  <option value="original_url-asc">URL (A-Z)</option>
                  <option value="original_url-desc">URL (Z-A)</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Pannello filtri */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Data da:</label>
                  <input
                    type="date"
                    value={filters.dateFrom?.toISOString().split('T')[0] || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilters(prev => ({
                        ...prev,
                        dateFrom: value ? new Date(value) : undefined
                      }));
                    }}
                    className="w-full text-sm border border-gray-300 rounded-lg p-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Data a:</label>
                  <input
                    type="date"
                    value={filters.dateTo?.toISOString().split('T')[0] || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilters(prev => ({
                        ...prev,
                        dateTo: value ? new Date(value) : undefined
                      }));
                    }}
                    className="w-full text-sm border border-gray-300 rounded-lg p-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Dominio originale contiene:</label>
                  <input
                    type="text"
                    value={filters.originalDomain || ''}
                    onChange={(e) => {
                      setFilters(prev => ({
                        ...prev,
                        originalDomain: e.target.value || undefined
                      }));
                    }}
                    placeholder="es: google.com"
                    className="w-full text-sm border border-gray-300 rounded-lg p-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min. click:</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.minClicks !== undefined ? filters.minClicks : ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : undefined;
                      setFilters(prev => ({
                        ...prev,
                        minClicks: value
                      }));
                    }}
                    className="w-full text-sm border border-gray-300 rounded-lg p-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max. click:</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.maxClicks !== undefined ? filters.maxClicks : ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : undefined;
                      setFilters(prev => ({
                        ...prev,
                        maxClicks: value
                      }));
                    }}
                    className="w-full text-sm border border-gray-300 rounded-lg p-1"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilters({});
                      setShowFilters(false);
                    }}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-3 rounded-lg"
                  >
                    Reimposta filtri
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
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
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
