'use client';

import { useState } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar, Filter, X } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

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

interface WorkspaceAnalyticsFiltersProps {
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

export default function WorkspaceAnalyticsFilters({ 
  currentFilter, 
  dateRange, 
  onFilterChange 
}: WorkspaceAnalyticsFiltersProps) {
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
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-lg border border-slate-200 p-8 mb-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-r from-slate-600 to-slate-800 rounded-xl">
            <Filter className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">Filtri Temporali</h3>
            <p className="text-base text-gray-600 mt-1">Seleziona il periodo da analizzare</p>
          </div>
        </div>
      </div>

      {/* Filtri rapidi */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleFilterClick(option.value)}
            className={`
              relative px-5 py-4 rounded-xl border-2 text-sm font-bold transition-all duration-300 transform hover:scale-105
              ${currentFilter === option.value
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-500 text-white shadow-lg'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:border-gray-300 hover:shadow-md'
              }
              ${option.value === 'custom' && isCustomExpanded
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-500 text-white shadow-lg'
                : ''
              }
            `}
          >
            <div className="text-center">
              <div className="font-bold text-base">{option.label}</div>
              {option.description && (
                <div className={`text-xs mt-1 ${currentFilter === option.value || (option.value === 'custom' && isCustomExpanded) ? 'text-blue-100' : 'text-gray-500'}`}>
                  {option.description}
                </div>
              )}
              {option.value === 'custom' && currentFilter === 'custom' && (
                <div className="text-xs mt-2 font-normal bg-blue-400 rounded px-2 py-1">
                  {formatCustomDateRange()}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Selettore date personalizzato */}
      {isCustomExpanded && (
        <div className="mt-8 p-6 bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-blue-200 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-gray-800 flex items-center">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg mr-3">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              Seleziona Intervallo Personalizzato
            </h4>
            <button
              onClick={handleCustomDateCancel}
              className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-2 hover:bg-red-50 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-base font-bold text-gray-700 mb-3">
                📅 Data Inizio
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
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-base font-bold text-gray-700 mb-3">
                📅 Data Fine
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
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 mt-6">
            <button
              onClick={handleCustomDateCancel}
              className="px-6 py-3 text-base font-bold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
            >
              Annulla
            </button>
            <button
              onClick={handleCustomDateApply}
              disabled={!tempStartDate || !tempEndDate}
              className="px-6 py-3 text-base font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 border-2 border-blue-600 rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 shadow-lg"
            >
              ✅ Applica Filtro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
