'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';

interface EnhancedDatePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onApply: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const DAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

// Utility functions for better date handling
const createSafeDate = (year: number, month: number, day: number): Date => {
  const date = new Date(year, month, day);
  // Normalizza l'ora per evitare problemi di timezone
  date.setHours(12, 0, 0, 0);
  return date;
};

const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateString = (dateString: string): Date | null => {
  if (!dateString) return null;
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    return createSafeDate(year, month - 1, day);
  } catch {
    return null;
  }
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

const isDateBetween = (date: Date, start: Date, end: Date): boolean => {
  const dateTime = date.getTime();
  const startTime = start.getTime();
  const endTime = end.getTime();
  return dateTime >= Math.min(startTime, endTime) && 
         dateTime <= Math.max(startTime, endTime);
};

export default function EnhancedDatePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
  disabled = false,
  loading = false
}: EnhancedDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectingStart, setSelectingStart] = useState(true);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const modalRef = useClickOutside<HTMLDivElement>(() => {
    setIsOpen(false);
  }, isOpen);

  const today = useMemo(() => {
    const now = new Date();
    return createSafeDate(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const startDateObj = useMemo(() => parseDateString(startDate), [startDate]);
  const endDateObj = useMemo(() => parseDateString(endDate), [endDate]);

  // Reset the selection state when dates are cleared externally
  useEffect(() => {
    if (!startDate && !endDate) {
      setSelectingStart(true);
    }
  }, [startDate, endDate]);

  // Navigate to the month containing the selected start date when opening
  useEffect(() => {
    if (isOpen && startDateObj) {
      setCurrentMonth(startDateObj.getMonth());
      setCurrentYear(startDateObj.getFullYear());
    }
  }, [isOpen, startDateObj]);

  // Ottieni i giorni del mese con migliore gestione dei bordi
  const getDaysInMonth = useCallback((month: number, year: number) => {
    const firstDay = createSafeDate(year, month, 1);
    const lastDay = createSafeDate(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days = [];

    // Giorni del mese precedente per riempire la prima settimana
    for (let i = startDayOfWeek; i > 0; i--) {
      const prevDate = createSafeDate(year, month, 1 - i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }

    // Giorni del mese corrente
    for (let i = 1; i <= daysInMonth; i++) {
      const date = createSafeDate(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }

    // Giorni del mese successivo per riempire l'ultima settimana
    const totalCells = Math.ceil(days.length / 7) * 7;
    let nextDay = 1;
    for (let i = days.length; i < totalCells; i++) {
      const nextDate = createSafeDate(year, month + 1, nextDay);
      days.push({ date: nextDate, isCurrentMonth: false });
      nextDay++;
    }

    return days;
  }, []);

  const isDateInRange = useCallback((date: Date) => {
    if (!startDateObj || !endDateObj) return false;
    return isDateBetween(date, startDateObj, endDateObj);
  }, [startDateObj, endDateObj]);

  const isDateStart = useCallback((date: Date) => {
    if (!startDateObj) return false;
    return isSameDay(date, startDateObj);
  }, [startDateObj]);

  const isDateEnd = useCallback((date: Date) => {
    if (!endDateObj) return false;
    return isSameDay(date, endDateObj);
  }, [endDateObj]);

  const isDateInHoverRange = useCallback((date: Date) => {
    if (!hoverDate || selectingStart || !startDateObj) return false;
    return isDateBetween(date, startDateObj, hoverDate);
  }, [hoverDate, selectingStart, startDateObj]);

  const handleDateClick = useCallback((date: Date) => {
    const dateString = formatDateString(date);
    
    if (selectingStart) {
      onStartDateChange(dateString);
      onEndDateChange(''); // Reset end date
      setSelectingStart(false);
      setHoverDate(null);
    } else {
      if (startDateObj && date < startDateObj) {
        // Se la data di fine è prima della data di inizio, scambia
        onStartDateChange(dateString);
        onEndDateChange(formatDateString(startDateObj));
      } else {
        onEndDateChange(dateString);
      }
      setSelectingStart(true);
      setHoverDate(null);
    }
  }, [selectingStart, startDateObj, onStartDateChange, onEndDateChange]);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(prev => prev + 1);
      } else {
        setCurrentMonth(prev => prev + 1);
      }
    } else {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(prev => prev - 1);
      } else {
        setCurrentMonth(prev => prev - 1);
      }
    }
  }, [currentMonth]);

  const getQuickDateRanges = useCallback(() => {
    const todayClone = createSafeDate(today.getFullYear(), today.getMonth(), today.getDate());
    
    const ranges = [
      {
        label: 'Oggi',
        start: todayClone,
        end: todayClone
      },
      {
        label: 'Ultimi 7 giorni',
        start: createSafeDate(today.getFullYear(), today.getMonth(), today.getDate() - 6),
        end: todayClone
      },
      {
        label: 'Ultimi 30 giorni',
        start: createSafeDate(today.getFullYear(), today.getMonth(), today.getDate() - 29),
        end: todayClone
      },
      {
        label: 'Questo mese',
        start: createSafeDate(today.getFullYear(), today.getMonth(), 1),
        end: todayClone
      },
      {
        label: 'Mese scorso',
        start: createSafeDate(today.getFullYear(), today.getMonth() - 1, 1),
        end: createSafeDate(today.getFullYear(), today.getMonth(), 0)
      }
    ];
    return ranges;
  }, [today]);

  const applyQuickRange = useCallback((start: Date, end: Date) => {
    onStartDateChange(formatDateString(start));
    onEndDateChange(formatDateString(end));
    setSelectingStart(true);
    setHoverDate(null);
  }, [onStartDateChange, onEndDateChange]);

  const clearDates = useCallback(() => {
    onStartDateChange('');
    onEndDateChange('');
    setSelectingStart(true);
    setHoverDate(null);
  }, [onStartDateChange, onEndDateChange]);

  const handleApply = useCallback(() => {
    if (startDate && endDate) {
      onApply();
      setIsOpen(false);
    }
  }, [startDate, endDate, onApply]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setHoverDate(null);
  }, []);

  const days = useMemo(() => getDaysInMonth(currentMonth, currentYear), [getDaysInMonth, currentMonth, currentYear]);

  // Validation: ensure dates are in correct order
  const hasValidDateRange = useMemo(() => {
    if (!startDate || !endDate) return false;
    const start = parseDateString(startDate);
    const end = parseDateString(endDate);
    return start && end && start <= end;
  }, [startDate, endDate]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          handleClose();
          break;
        case 'Enter':
          if (hasValidDateRange) {
            event.preventDefault();
            handleApply();
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          navigateMonth('prev');
          break;
        case 'ArrowRight':
          event.preventDefault();
          navigateMonth('next');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasValidDateRange, handleClose, handleApply, navigateMonth]);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center justify-between w-full px-4 py-3 border border-gray-300 rounded-lg bg-white hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        aria-label="Seleziona periodo di date"
      >
        <div className="flex items-center space-x-3">
          <Calendar className="h-5 w-5 text-gray-500" />
          <div className="text-left">
            {hasValidDateRange ? (
              <div className="text-sm">
                <span className="font-medium text-gray-900">
                  {startDateObj?.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                </span>
                <span className="text-gray-500 mx-2">—</span>
                <span className="font-medium text-gray-900">
                  {endDateObj?.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            ) : (
              <span className="text-gray-500 text-sm">
                {selectingStart ? 'Seleziona data di inizio' : 'Seleziona data di fine'}
              </span>
            )}
          </div>
        </div>
        <ChevronRight 
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
        />
      </button>

      {/* Calendar Modal */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden min-w-[520px]">
          <div ref={modalRef}>
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Seleziona periodo
                </h3>
                <button
                  onClick={handleClose}
                  className="p-1 hover:bg-white/50 rounded-full transition-colors"
                  aria-label="Chiudi calendario"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {selectingStart ? 'Scegli la data di inizio' : 'Scegli la data di fine'}
              </p>
            </div>

            <div className="flex">
              {/* Quick Ranges */}
              <div className="w-48 p-4 bg-gray-50 border-r border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Intervalli rapidi</h4>
                <div className="space-y-1">
                  {getQuickDateRanges().map((range, index) => (
                    <button
                      key={index}
                      onClick={() => applyQuickRange(range.start, range.end)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
                      type="button"
                    >
                      {range.label}
                    </button>
                  ))}
                  
                  {(startDate || endDate) && (
                    <button
                      onClick={clearDates}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors mt-2 border-t border-gray-200 pt-3"
                      type="button"
                    >
                      Cancella selezione
                    </button>
                  )}
                </div>
              </div>

              {/* Calendar */}
              <div className="flex-1 p-4">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    type="button"
                    aria-label="Mese precedente"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-600" />
                  </button>
                  
                  <h3 className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
                    {MONTHS[currentMonth]} {currentYear}
                  </h3>
                  
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    type="button"
                    aria-label="Mese successivo"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  </button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DAYS.map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map(({ date, isCurrentMonth }, index) => {
                    const isToday = isSameDay(date, today);
                    const isStart = isDateStart(date);
                    const isEnd = isDateEnd(date);
                    const isInRange = isDateInRange(date);
                    const isInHoverRange = isDateInHoverRange(date);
                    const isPast = date < today && !isToday;
                    const isClickable = isCurrentMonth && !isPast;

                    return (
                      <button
                        key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${index}`}
                        onClick={() => isClickable && handleDateClick(date)}
                        onMouseEnter={() => isCurrentMonth && setHoverDate(date)}
                        onMouseLeave={() => setHoverDate(null)}
                        disabled={!isClickable}
                        type="button"
                        aria-label={`Seleziona ${date.toLocaleDateString('it-IT')}`}
                        className={`
                          relative h-10 w-10 text-sm rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                          ${!isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : ''}
                          ${isPast && isCurrentMonth ? 'text-gray-400 cursor-not-allowed opacity-50' : ''}
                          ${isClickable && !isStart && !isEnd && !isInRange && !isInHoverRange ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:scale-105' : ''}
                          ${isToday && !isStart && !isEnd ? 'ring-2 ring-blue-500 font-bold' : ''}
                          ${isStart || isEnd ? 'bg-blue-600 text-white font-bold shadow-md scale-105' : ''}
                          ${isInRange && !isStart && !isEnd ? 'bg-blue-100 text-blue-800' : ''}
                          ${isInHoverRange && !isStart && !isEnd && !isInRange ? 'bg-blue-50 text-blue-700' : ''}
                        `}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                {hasValidDateRange ? (
                  <>
                    Periodo selezionato: 
                    <span className="font-medium ml-1">
                      {startDate} — {endDate}
                    </span>
                    <span className="text-gray-500 ml-2">
                      ({Math.abs(Math.ceil((endDateObj!.getTime() - startDateObj!.getTime()) / (1000 * 60 * 60 * 24))) + 1} giorni)
                    </span>
                  </>
                ) : (
                  'Seleziona entrambe le date per continuare'
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
                  type="button"
                >
                  Annulla
                </button>
                <button
                  onClick={handleApply}
                  disabled={!hasValidDateRange || loading}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                  type="button"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Caricamento...
                    </>
                  ) : (
                    'Applica filtro'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
