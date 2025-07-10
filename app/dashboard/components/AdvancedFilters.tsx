'use client';

import { useState, useEffect, useMemo } from 'react';
import { CalendarIcon, FunnelIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export interface FilterOptions {
  dateRange?: 'today' | 'week' | 'month' | 'currentMonth' | 'previousMonth' | 'custom';
  dateFrom?: Date;
  dateTo?: Date;
  originalDomain?: string;
  shortDomain?: string;
  minClicks?: number;
  maxClicks?: number;
  clickOperator?: 'equal' | 'less' | 'greater' | 'lessEqual' | 'greaterEqual';
  clickValue?: number;
  title?: string;
  url?: string;
  clicksMin?: number;
  clicksMax?: number;
}

export interface LinkFromDB {
  id: string;
  short_code: string;
  original_url: string;
  created_at: Date;
  title: string | null;
  description: string | null;
  folder_id: string | null;
  click_count: number;
  unique_click_count: number;
}

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  onReset: () => void;
  initialFilters: FilterOptions;
  links: LinkFromDB[];
}

const dateRangeOptions = [
  { value: 'today', label: 'Creati oggi' },
  { value: 'week', label: 'Creati negli ultimi 7 giorni' },
  { value: 'month', label: 'Creati negli ultimi 30 giorni' },
  { value: 'currentMonth', label: 'Creati nel mese attuale' },
  { value: 'previousMonth', label: 'Creati nel mese precedente' },
  { value: 'custom', label: 'Date personalizzate' },
] as const;

export default function AdvancedFilters({
  isOpen,
  onClose,
  onApply,
  onReset,
  initialFilters,
  links
}: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [domainSearch, setDomainSearch] = useState('');
  const [showDomainDropdown, setShowDomainDropdown] = useState(false);

  // Estrai tutti i domini unici dai link
  const availableDomains = useMemo(() => {
    const domains = new Set<string>();
    links.forEach(link => {
      try {
        const url = new URL(link.original_url);
        domains.add(url.hostname);
      } catch {
        // Ignora URL malformati
      }
    });
    return Array.from(domains).sort();
  }, [links]);

  // Filtra i domini in base alla ricerca
  const filteredDomains = useMemo(() => {
    if (!domainSearch) return availableDomains.slice(0, 10); // Mostra i primi 10 domini se non c'è ricerca
    return availableDomains.filter(domain => 
      domain.toLowerCase().includes(domainSearch.toLowerCase())
    );
  }, [availableDomains, domainSearch]);

  // Reset filtri quando si chiude il modal
  useEffect(() => {
    if (isOpen) {
      setFilters(initialFilters);
      setDomainSearch(initialFilters.originalDomain || '');
    }
  }, [isOpen, initialFilters]);

  // Calcola le date per i preset
  const getDateRange = (range: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (range) {
      case 'today':
        return { from: today, to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { from: weekAgo, to: now };
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { from: monthAgo, to: now };
      case 'currentMonth':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: startOfMonth, to: now };
      case 'previousMonth':
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return { from: startOfPrevMonth, to: endOfPrevMonth };
      default:
        return null;
    }
  };

  const handleDateRangeChange = (range: string) => {
    const newFilters = { ...filters, dateRange: range as FilterOptions['dateRange'] };
    
    if (range !== 'custom') {
      const dateRange = getDateRange(range);
      if (dateRange) {
        newFilters.dateFrom = dateRange.from;
        newFilters.dateTo = dateRange.to;
      }
    }
    
    setFilters(newFilters);
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({});
    setDomainSearch('');
    onReset();
    onClose();
  };

  const formatDate = (date: Date) => {
    return date.toISOString().slice(0, 16);
  };

  const parseDate = (dateString: string) => {
    return new Date(dateString);
  };

  // Funzione per contare i filtri attivi in modo accurato
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

  if (!isOpen) return null;

  const hasActiveFilters = countActiveFilters(filters) > 0;
  const activeFiltersCount = countActiveFilters(filters);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <FunnelIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Filtri avanzati
                </h3>
                <p className="text-blue-100 text-sm">
                  Personalizza la visualizzazione dei tuoi link
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 text-blue-100 hover:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Contenuto */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Colonna sinistra */}
            <div className="space-y-6">
              {/* Filtro data */}
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <div className="flex items-center mb-4">
                  <CalendarIcon className="w-5 h-5 text-gray-600 mr-2" />
                  <h4 className="text-lg font-medium text-gray-900">Filtro per data</h4>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Periodo di creazione
                    </label>
                    <select
                      value={filters.dateRange || ''}
                      onChange={(e) => handleDateRangeChange(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">Seleziona periodo...</option>
                      {dateRangeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {filters.dateRange === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Data inizio
                        </label>
                        <input
                          type="datetime-local"
                          value={filters.dateFrom ? formatDate(filters.dateFrom) : ''}
                          onChange={(e) => setFilters({
                            ...filters,
                            dateFrom: e.target.value ? parseDate(e.target.value) : undefined
                          })}
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Data fine
                        </label>
                        <input
                          type="datetime-local"
                          value={filters.dateTo ? formatDate(filters.dateTo) : ''}
                          onChange={(e) => setFilters({
                            ...filters,
                            dateTo: e.target.value ? parseDate(e.target.value) : undefined
                          })}
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Filtro click */}
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Filtro per click</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Numero di click
                      </label>
                      <select
                        value={filters.clickOperator || ''}
                        onChange={(e) => setFilters({
                          ...filters,
                          clickOperator: e.target.value as FilterOptions['clickOperator']
                        })}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      >
                        <option value="">Seleziona operatore...</option>
                        <option value="equal">Uguale a</option>
                        <option value="less">Minore di</option>
                        <option value="greater">Maggiore di</option>
                        <option value="lessEqual">Minore o uguale a</option>
                        <option value="greaterEqual">Maggiore o uguale a</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Valore
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={filters.clickValue || ''}
                        onChange={(e) => setFilters({
                          ...filters,
                          clickValue: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Inserisci numero..."
                      />
                    </div>
                  </div>
                  
                  {/* Sezione legacy per compatibilità - nascosta se si usa il nuovo filtro */}
                  {!filters.clickOperator && (
                    <div>
                      <div className="text-xs text-gray-500 mb-2">Oppure usa il filtro per intervallo:</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Click minimi
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={filters.minClicks || ''}
                            onChange={(e) => setFilters({
                              ...filters,
                              minClicks: e.target.value ? parseInt(e.target.value) : undefined
                            })}
                            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Click massimi
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={filters.maxClicks || ''}
                            onChange={(e) => setFilters({
                              ...filters,
                              maxClicks: e.target.value ? parseInt(e.target.value) : undefined
                            })}
                            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Illimitato"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Colonna destra */}
            <div className="space-y-6">
              {/* Filtro dominio originale */}
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Dominio originale contiene:</h4>
                
                <div className="space-y-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={domainSearch}
                      onChange={(e) => {
                        setDomainSearch(e.target.value);
                        setFilters({
                          ...filters,
                          originalDomain: e.target.value || undefined
                        });
                        setShowDomainDropdown(true);
                      }}
                      onFocus={() => setShowDomainDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDomainDropdown(false), 150)}
                      className="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Cerca o digita un dominio..."
                    />
                  </div>

                  {showDomainDropdown && filteredDomains.length > 0 && (
                    <div className="max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                      {filteredDomains.map(domain => (
                        <button
                          key={domain}
                          onMouseDown={(e) => e.preventDefault()} // Previene il blur
                          onClick={() => {
                            setDomainSearch(domain);
                            setFilters({ ...filters, originalDomain: domain });
                            setShowDomainDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          {domain}
                        </button>
                      ))}
                    </div>
                  )}

                  {availableDomains.length > 0 && (
                    <div className="text-xs text-gray-500">
                      {filteredDomains.length} di {availableDomains.length} domini disponibili
                    </div>
                  )}
                </div>
              </div>

              {/* Filtro dominio breve */}
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Link breve contiene:</h4>
                <input
                  type="text"
                  value={filters.shortDomain || ''}
                  onChange={(e) => setFilters({
                    ...filters,
                    shortDomain: e.target.value || undefined
                  })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Inserisci testo da cercare nel link breve..."
                />
              </div>

              {/* Anteprima filtri */}
              {hasActiveFilters && (
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                  <h4 className="text-lg font-medium text-blue-900 mb-3">Filtri attivi</h4>
                  <div className="space-y-2 text-sm text-blue-800">
                    {filters.dateRange && (
                      <div>📅 Data: {dateRangeOptions.find(opt => opt.value === filters.dateRange)?.label}</div>
                    )}
                    {filters.originalDomain && (
                      <div>🌐 Dominio: contiene &quot;{filters.originalDomain}&quot;</div>
                    )}
                    {filters.shortDomain && (
                      <div>🔗 Link breve: contiene &quot;{filters.shortDomain}&quot;</div>
                    )}
                    {filters.clickOperator && filters.clickValue !== undefined && (
                      <div>👆 Click: {
                        filters.clickOperator === 'equal' ? 'uguale a' :
                        filters.clickOperator === 'less' ? 'minore di' :
                        filters.clickOperator === 'greater' ? 'maggiore di' :
                        filters.clickOperator === 'lessEqual' ? 'minore o uguale a' :
                        filters.clickOperator === 'greaterEqual' ? 'maggiore o uguale a' : ''
                      } {filters.clickValue}</div>
                    )}
                    {!filters.clickOperator && (filters.minClicks !== undefined || filters.maxClicks !== undefined) && (
                      <div>👆 Click: {filters.minClicks || 0} - {filters.maxClicks || '∞'}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Azioni */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <XMarkIcon className="h-5 w-5 mr-2" />
              Azzera filtri
            </button>
            
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Annulla
            </button>
            
            <button
              onClick={handleApply}
              className="flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg"
            >
              <FunnelIcon className="h-5 w-5 mr-2" />
              Applica filtri {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
