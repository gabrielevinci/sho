'use client';

import { useState } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar, Filter, X } from 'lucide-react';

export type DateFilter = 
  | 'all'
  | 'today' 
  | 'week' 
  | 'month' 
  | '3months' 
  | 'year' 
  | 'custom';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface AnalyticsFiltersProps {
  currentFilter: DateFilter;
  dateRange: DateRange;
  onFilterChange: (filter: DateFilter, dateRange?: DateRange) => void;
}

const filterOptions = [
  { value: 'all' as DateFilter, label: 'Sempre', description: 'Tutti i dati disponibili' },
  { value: 'today' as DateFilter, label: '24 ore', description: '' },
  { value: 'week' as DateFilter, label: 'Ultimi 7 giorni', description: '' },
  { value: 'month' as DateFilter, label: 'Ultimi 30 giorni', description: '' },
  { value: '3months' as DateFilter, label: 'Ultimi 90 giorni', description: '' },
  { value: 'year' as DateFilter, label: 'Ultimi 365 giorni', description: '' },
  { value: 'custom' as DateFilter, label: 'Personalizzato', description: 'Seleziona intervallo' },
];

export default function AnalyticsFilters({ 
  currentFilter, 
  dateRange, 
  onFilterChange 
}: AnalyticsFiltersProps) {
  const [isCustomExpanded, setIsCustomExpanded] = useState(currentFilter === 'custom');
  const [tempStartDate, setTempStartDate] = useState<Date | null>(dateRange.startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(dateRange.endDate);

  const handleFilterClick = (filter: DateFilter) => {
    if (filter === 'custom') {
      setIsCustomExpanded(true);
      onFilterChange(filter);
    } else {
      setIsCustomExpanded(false);
      onFilterChange(filter);
    }
  };

  const handleCustomDateApply = () => {
    if (tempStartDate && tempEndDate) {
      onFilterChange('custom', { 
        startDate: tempStartDate, 
        endDate: tempEndDate 
      });
      setIsCustomExpanded(false);
    }
  };

  const handleCustomDateCancel = () => {
    setTempStartDate(dateRange.startDate);
    setTempEndDate(dateRange.endDate);
    setIsCustomExpanded(false);
    if (currentFilter === 'custom' && (!dateRange.startDate || !dateRange.endDate)) {
      onFilterChange('all');
    }
  };

  const formatCustomDateRange = () => {
    if (dateRange.startDate && dateRange.endDate) {
      const start = dateRange.startDate.toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: 'short' 
      });
      const end = dateRange.endDate.toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: 'short',
        year: 'numeric'
      });
      return `${start} - ${end}`;
    }
    return 'Seleziona date';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filtri Temporali</h3>
        </div>
        <div className="text-sm text-gray-500">
          Seleziona il periodo da analizzare
        </div>
      </div>

      {/* Filtri rapidi */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
        {filterOptions.map((option) => {
          const isActive = currentFilter === option.value;
          const isCustomActive = option.value === 'custom' && currentFilter === 'custom';
          
          return (
            <button
              key={option.value}
              onClick={() => handleFilterClick(option.value)}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                isActive
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
              title={option.description}
            >
              <div className="font-semibold text-sm">
                {option.value === 'custom' && isCustomActive
                  ? formatCustomDateRange()
                  : option.label
                }
              </div>
              {option.description && (
                <div className="text-xs text-gray-500 mt-1">
                  {option.value === 'custom' && isCustomActive && dateRange.startDate && dateRange.endDate
                    ? 'Intervallo selezionato'
                    : option.description
                  }
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selettore date personalizzato */}
      {isCustomExpanded && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-900">Intervallo Personalizzato</span>
            </div>
            <button
              onClick={handleCustomDateCancel}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full"
              title="Chiudi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Inizio
              </label>
              <DatePicker
                selected={tempStartDate}
                onChange={(date) => setTempStartDate(date)}
                selectsStart
                startDate={tempStartDate}
                endDate={tempEndDate}
                maxDate={new Date()}
                dateFormat="dd/MM/yyyy"
                placeholderText="Seleziona data inizio"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Fine
              </label>
              <DatePicker
                selected={tempEndDate}
                onChange={(date) => setTempEndDate(date)}
                selectsEnd
                startDate={tempStartDate}
                endDate={tempEndDate}
                minDate={tempStartDate || undefined}
                maxDate={new Date()}
                dateFormat="dd/MM/yyyy"
                placeholderText="Seleziona data fine"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCustomDateCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Annulla
            </button>
            <button
              onClick={handleCustomDateApply}
              disabled={!tempStartDate || !tempEndDate}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Applica Filtro
            </button>
          </div>
        </div>
      )}
      
      {/* Indicatore filtro attivo */}
      {currentFilter !== 'all' && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-800">
                Filtro attivo: {filterOptions.find(f => f.value === currentFilter)?.label}
                {currentFilter === 'custom' && dateRange.startDate && dateRange.endDate && 
                  ` (${formatCustomDateRange()})`
                }
              </span>
            </div>
            <button
              onClick={() => onFilterChange('all')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Rimuovi filtro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
