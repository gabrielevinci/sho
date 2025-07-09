'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import LinkRow from './LinkRow';
import { LinkFromDB } from './LinkRow';
import BatchOperations from './BatchOperations';
import { Folder } from './FolderSidebar';
import AdvancedFilters, { FilterOptions } from './AdvancedFilters';

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

// Tipi per ordinamento
type SortField = 'created_at' | 'click_count' | 'unique_click_count' | 'title' | 'original_url';
type SortDirection = 'asc' | 'desc';

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
  const [selectionMode, setSelectionMode] = useState(false); // Initially inactive
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
    } catch {
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
      // Gestione filtri data con preset
      if (filters.dateRange && filters.dateRange !== 'custom') {
        const now = new Date();
        let dateFrom: Date | undefined;
        let dateTo: Date | undefined;

        switch (filters.dateRange) {
          case 'today':
            dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            dateTo = now;
            break;
          case 'week':
            dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateTo = now;
            break;
          case 'month':
            dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateTo = now;
            break;
          case 'currentMonth':
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
            dateTo = now;
            break;
          case 'previousMonth':
            dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            dateTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            break;
        }

        if (dateFrom) {
          result = result.filter(link => 
            new Date(link.created_at) >= dateFrom!
          );
        }
        
        if (dateTo) {
          result = result.filter(link => 
            new Date(link.created_at) <= dateTo!
          );
        }
      } else {
        // Gestione filtri data personalizzati
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
      
      // Nuovo filtro click con operatore
      if (filters.clickOperator && filters.clickValue !== undefined) {
        result = result.filter(link => {
          const clickCount = link.click_count;
          const targetValue = filters.clickValue!;
          
          switch (filters.clickOperator) {
            case 'equal':
              return clickCount === targetValue;
            case 'less':
              return clickCount < targetValue;
            case 'greater':
              return clickCount > targetValue;
            case 'lessEqual':
              return clickCount <= targetValue;
            case 'greaterEqual':
              return clickCount >= targetValue;
            default:
              return true;
          }
        });
      } else {
        // Filtri legacy per compatibilità
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
  
  // Funzione per contare i filtri attivi
  const countActiveFilters = (filters: FilterOptions) => {
    let count = 0;
    // Conteggio corretto dei filtri data
    if (filters.dateRange && filters.dateRange !== 'custom') {
      count++; // filtro data con preset
    } else if (filters.dateFrom || filters.dateTo) {
      count++; // filtro data personalizzato
    }
    if (filters.originalDomain && filters.originalDomain.trim()) count++;
    if (filters.shortDomain && filters.shortDomain.trim()) count++;
    
    // Nuovo filtro click con operatore
    if (filters.clickOperator && filters.clickValue !== undefined) {
      count++;
    } else {
      // Filtri legacy per compatibilità
      if (filters.minClicks !== undefined && filters.minClicks > 0) count++;
      if (filters.maxClicks !== undefined && filters.maxClicks >= 0) count++;
    }
    
    return count;
  };

  const activeFiltersCount = countActiveFilters(filters);
  const filteredLinks = getFilteredAndSortedLinks();

  // Reset selezione e filtri quando cambia la cartella
  useEffect(() => {
    setSelectedLinks(new Set());
    setLastSelectedIndex(null);
    setFilters({}); // Reset filters
    setShowFilters(false); // Hide filters panel
    setSelectionMode(false); // Disattiva modalità selezione quando si cambia cartella
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
  const handleLinkSelection = useCallback((linkId: string, event: React.MouseEvent & { isRowClick?: boolean }) => {
    const linkIndex = filteredLinks.findIndex(link => link.id === linkId);
    
    // Se è un dispositivo mobile (rilevato dalla mancanza di hover support) 
    // o se è un click diretto sulla riga, comportati come toggle
    const isMobileDevice = !window.matchMedia('(hover: hover)').matches;
    const isDirectRowClick = (event as React.MouseEvent & { isRowClick?: boolean }).isRowClick;
    
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
    } else if (event.shiftKey && lastSelectedIndex !== null && !isMobileDevice) {
      // Shift+click: selezione intervallo (solo su desktop)
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
      // Su mobile o click diretto sulla riga: comportamento toggle per facilità d'uso
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
      // Click normale sulla riga su desktop: selezione singola (deseleziona gli altri)
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
              
              {/* Pulsante Seleziona */}
              <button
                onClick={() => {
                  if (selectionMode) {
                    // Disattiva modalità selezione e cancella selezioni
                    setSelectionMode(false);
                    handleClearSelection();
                  } else {
                    // Attiva modalità selezione
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
              
              {selectionMode && (
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  <span className="hidden md:inline">
                    Ctrl+A per selezionare tutto • Esc per deselezionare • Ctrl+Click per toggle • Shift+Click per intervallo
                  </span>
                  <span className="md:hidden">
                    Tocca checkbox o riga per toggle selezione • Usa &quot;Seleziona Tutto&quot; per selezionare tutti
                  </span>
                </div>
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
          {/* Nuovo componente AdvancedFilters */}
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
