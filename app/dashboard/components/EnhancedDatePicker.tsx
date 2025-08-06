'use client';

import { useState, useRef, useEffect } from 'react';
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

  const today = new Date();
  const startDateObj = startDate ? new Date(startDate) : null;
  const endDateObj = endDate ? new Date(endDate) : null;

  // Ottieni i giorni del mese
  const getDaysInMonth = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days = [];

    // Giorni del mese precedente per riempire la prima settimana
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }

    // Giorni del mese corrente
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }

    // Giorni del mese successivo per riempire le ultime settimane
    const totalCells = Math.ceil(days.length / 7) * 7;
    for (let i = days.length; i < totalCells; i++) {
      const nextDate: Date = new Date(year, month + 1, i - days.length + 1);
      days.push({ date: nextDate, isCurrentMonth: false });
    }

    return days;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isDateInRange = (date: Date) => {
    if (!startDateObj || !endDateObj) return false;
    return date >= startDateObj && date <= endDateObj;
  };

  const isDateStart = (date: Date) => {
    if (!startDateObj) return false;
    return date.toDateString() === startDateObj.toDateString();
  };

  const isDateEnd = (date: Date) => {
    if (!endDateObj) return false;
    return date.toDateString() === endDateObj.toDateString();
  };

  const isDateInHoverRange = (date: Date) => {
    if (!hoverDate) return false;
    if (selectingStart) return false;
    if (!startDateObj) return false;
    
    const start = startDateObj;
    const end = hoverDate;
    const startTime = start.getTime();
    const endTime = end.getTime();
    const dateTime = date.getTime();
    
    return dateTime >= Math.min(startTime, endTime) && 
           dateTime <= Math.max(startTime, endTime);
  };

  const handleDateClick = (date: Date) => {
    if (selectingStart) {
      onStartDateChange(formatDate(date));
      onEndDateChange(''); // Reset end date
      setSelectingStart(false);
    } else {
      if (startDateObj && date < startDateObj) {
        // Se la data di fine è prima della data di inizio, scambia
        onStartDateChange(formatDate(date));
        onEndDateChange(formatDate(startDateObj));
      } else {
        onEndDateChange(formatDate(date));
      }
      setSelectingStart(true);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    } else {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    }
  };

  const getQuickDateRanges = () => {
    const today = new Date();
    const ranges = [
      {
        label: 'Oggi',
        start: today,
        end: today
      },
      {
        label: 'Ultimi 7 giorni',
        start: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
        end: today
      },
      {
        label: 'Ultimi 30 giorni',
        start: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
        end: today
      },
      {
        label: 'Questo mese',
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: today
      },
      {
        label: 'Mese scorso',
        start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        end: new Date(today.getFullYear(), today.getMonth(), 0)
      }
    ];
    return ranges;
  };

  const applyQuickRange = (start: Date, end: Date) => {
    onStartDateChange(formatDate(start));
    onEndDateChange(formatDate(end));
    setSelectingStart(true);
  };

  const clearDates = () => {
    onStartDateChange('');
    onEndDateChange('');
    setSelectingStart(true);
  };

  const days = getDaysInMonth(currentMonth, currentYear);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center justify-between w-full px-4 py-3 border border-gray-300 rounded-lg bg-white hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <div className="flex items-center space-x-3">
          <Calendar className="h-5 w-5 text-gray-500" />
          <div className="text-left">
            {startDate && endDate ? (
              <div className="text-sm">
                <span className="font-medium text-gray-900">
                  {new Date(startDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                </span>
                <span className="text-gray-500 mx-2">—</span>
                <span className="font-medium text-gray-900">
                  {new Date(endDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            ) : (
              <span className="text-gray-500 text-sm">Seleziona le date</span>
            )}
          </div>
        </div>
        <ChevronRight 
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
        />
      </button>

      {/* Calendar Modal */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden min-w-[500px]">
          <div ref={modalRef}>
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Seleziona periodo
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/50 rounded-full transition-colors"
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
                    >
                      {range.label}
                    </button>
                  ))}
                  
                  {(startDate || endDate) && (
                    <button
                      onClick={clearDates}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors mt-2 border-t border-gray-200 pt-3"
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
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-600" />
                  </button>
                  
                  <h3 className="text-lg font-semibold text-gray-900">
                    {MONTHS[currentMonth]} {currentYear}
                  </h3>
                  
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
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
                    const isToday = date.toDateString() === today.toDateString();
                    const isStart = isDateStart(date);
                    const isEnd = isDateEnd(date);
                    const isInRange = isDateInRange(date);
                    const isInHoverRange = isDateInHoverRange(date);
                    const isPast = date < today && !isToday;

                    return (
                      <button
                        key={index}
                        onClick={() => handleDateClick(date)}
                        onMouseEnter={() => setHoverDate(date)}
                        onMouseLeave={() => setHoverDate(null)}
                        disabled={!isCurrentMonth}
                        className={`
                          relative h-10 w-10 text-sm rounded-lg transition-all
                          ${!isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : ''}
                          ${isCurrentMonth && !isStart && !isEnd && !isInRange && !isInHoverRange ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-700' : ''}
                          ${isToday && !isStart && !isEnd ? 'ring-2 ring-blue-500 font-bold' : ''}
                          ${isStart || isEnd ? 'bg-blue-600 text-white font-bold' : ''}
                          ${isInRange && !isStart && !isEnd ? 'bg-blue-100 text-blue-800' : ''}
                          ${isInHoverRange && !isStart && !isEnd && !isInRange ? 'bg-blue-50 text-blue-700' : ''}
                          ${isPast && isCurrentMonth ? 'opacity-60' : ''}
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
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {startDate && endDate ? (
                  <>Periodo selezionato: <span className="font-medium">{startDate} — {endDate}</span></>
                ) : (
                  'Seleziona entrambe le date per continuare'
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    onApply();
                    setIsOpen(false);
                  }}
                  disabled={!startDate || !endDate || loading}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
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
