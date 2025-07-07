'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Calendar, Download, Eye, EyeOff } from 'lucide-react';
import { addTestDataToMonthly, addTestDataToWeekly } from './test-data';

type MonthlyData = {
  month: string;
  month_number: number;
  year: number;
  total_clicks: number;
  unique_clicks: number;
};

type WeeklyData = {
  week: number;
  year: number;
  week_start: string;
  week_end: string;
  total_clicks: number;
  unique_clicks: number;
};

// Tipi estesi per i dati del grafico
type EnhancedMonthlyData = {
  name: string;
  total_clicks: number;
  unique_clicks: number;
  month_number: number;
  isCurrentMonth: boolean;
  totalClicksColor: string;
  uniqueClicksColor: string;
  isHighlighted: boolean;
};

type EnhancedWeeklyData = {
  name: string;
  total_clicks: number;
  unique_clicks: number;
  week: number;
  isCurrentWeek: boolean;
  totalClicksColor: string;
  uniqueClicksColor: string;
  isHighlighted: boolean;
  period: string;
};

interface PeriodChartProps {
  monthlyData: MonthlyData[];
  weeklyData: WeeklyData[];
}

type ViewMode = 'monthly' | 'weekly';

type TooltipProps = {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: {
      week?: number;
      period?: string;
      total_clicks: number;
      unique_clicks: number;
    };
  }>;
  label?: string;
};

const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export default function PeriodChart({ monthlyData, weeklyData }: PeriodChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [showTotalClicks, setShowTotalClicks] = useState(true);
  const [showUniqueClicks, setShowUniqueClicks] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Debug: Log the received data
  console.log('PeriodChart received data:', { monthlyData, weeklyData });

  // Ensure data is properly formatted and fallback to empty arrays if needed
  const safeMonthlyData = Array.isArray(monthlyData) ? monthlyData : [];
  const safeWeeklyData = Array.isArray(weeklyData) ? weeklyData : [];

  // Process data - add test data if real data is all zeros to help with debugging
  const processedMonthlyData = safeMonthlyData.length === 0 || safeMonthlyData.every(item => item.total_clicks === 0)
    ? addTestDataToMonthly(safeMonthlyData)
    : safeMonthlyData;

  const processedWeeklyData = safeWeeklyData.length === 0 || safeWeeklyData.every(item => item.total_clicks === 0)
    ? addTestDataToWeekly(safeWeeklyData)
    : safeWeeklyData;

  // Generiamo serie complete se i dati dal server non sono completi
  const generateCompleteMonthlyData = () => {
    const completeData = [];
    const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed
    
    for (let month = 1; month <= 12; month++) {
      const existingData = processedMonthlyData.find(item => item.month_number === month);
      const isCurrentMonth = month === currentMonth;
      
      completeData.push({
        name: MONTHS_IT[month - 1],
        total_clicks: existingData ? Number(existingData.total_clicks) || 0 : 0,
        unique_clicks: existingData ? Number(existingData.unique_clicks) || 0 : 0,
        month_number: month,
        isCurrentMonth: isCurrentMonth, // Flag per identificare il mese corrente
        // Colori dinamici per evidenziare il mese corrente
        totalClicksColor: isCurrentMonth ? '#4f46e5' : '#6366f1', // Più scuro per il mese corrente
        uniqueClicksColor: isCurrentMonth ? '#059669' : '#10b981', // Più scuro per il mese corrente
        // Stile per l'ombra/glow effect
        isHighlighted: isCurrentMonth
      });
    }
    console.log('Generated monthly chart data:', completeData);
    console.log('Current month:', currentMonth);
    return completeData;
  };

  const generateCompleteWeeklyData = () => {
    const completeData = [];
    
    // Per il 2025, la settimana 1 ISO va dal 30 dicembre 2024 al 5 gennaio 2025
    // Questo è il formato standard ISO 8601
    const year2025Week1Start = new Date('2024-12-30'); // Lunedì della settimana 1 del 2025
    
    // Calcola la settimana corrente
    const currentDate = new Date();
    const daysSinceWeek1 = Math.floor((currentDate.getTime() - year2025Week1Start.getTime()) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.min(52, Math.max(1, Math.floor(daysSinceWeek1 / 7) + 1));
    
    // Genera tutte le 52 settimane del 2025
    for (let weekNumber = 1; weekNumber <= 52; weekNumber++) {
      // Calcola l'inizio di ogni settimana
      const weekStart = new Date(year2025Week1Start);
      weekStart.setDate(year2025Week1Start.getDate() + (weekNumber - 1) * 7);
      
      // Calcola la fine della settimana (domenica)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Trova i dati corrispondenti a questa settimana
      const existingData = processedWeeklyData.find(item => item.week === weekNumber);
      const isCurrentWeek = weekNumber === currentWeek;
      
      completeData.push({
        name: `Sett. ${weekNumber}`,
        total_clicks: existingData ? Number(existingData.total_clicks) || 0 : 0,
        unique_clicks: existingData ? Number(existingData.unique_clicks) || 0 : 0,
        week: weekNumber,
        isCurrentWeek: isCurrentWeek, // Flag per identificare la settimana corrente
        // Colori dinamici per evidenziare la settimana corrente
        totalClicksColor: isCurrentWeek ? '#4f46e5' : '#6366f1', // Più scuro per la settimana corrente
        uniqueClicksColor: isCurrentWeek ? '#059669' : '#10b981', // Più scuro per la settimana corrente
        // Stile per l'ombra/glow effect
        isHighlighted: isCurrentWeek,
        period: `${weekStart.toLocaleDateString('it-IT', { 
          day: '2-digit', 
          month: '2-digit' 
        })} - ${weekEnd.toLocaleDateString('it-IT', { 
          day: '2-digit', 
          month: '2-digit' 
        })}`
      });
    }
    
    console.log('Generated weekly chart data for all 52 weeks of 2025:', completeData.slice(0, 5));
    console.log('Current week:', currentWeek);
    return completeData;
  };

  // Otteniamo i dati completi
  const monthlyChartData = generateCompleteMonthlyData();
  const weeklyChartData = generateCompleteWeeklyData();

  // Debug: Log the chart data
  console.log('Chart data generated:', { 
    viewMode, 
    monthlyChartData: monthlyChartData.slice(0, 3), // Log first 3 items
    weeklyChartData: weeklyChartData.slice(0, 3),  // Log first 3 items
    monthlyDataLength: monthlyChartData.length,
    weeklyDataLength: weeklyChartData.length
  });

  // Otteniamo i dati da visualizzare
  const displayData = useMemo(() => {
    return viewMode === 'monthly' ? monthlyChartData : weeklyChartData;
  }, [monthlyChartData, weeklyChartData, viewMode]);

  // Funzioni di utilità
  const handleViewModeChange = (mode: ViewMode) => {
    setIsAnimating(true);
    setViewMode(mode);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const exportData = () => {
    const dataToExport = displayData.map(item => ({
      Periodo: item.name,
      'Click Totali': item.total_clicks,
      'Click Unici': item.unique_clicks,
      ...(viewMode === 'weekly' && 'week' in item && 'period' in item && { 
        Settimana: item.week, 
        Range: item.period 
      })
    }));

    const csvContent = [
      Object.keys(dataToExport[0]).join(','),
      ...dataToExport.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-${viewMode}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const totalClicks = data.total_clicks || 0;
      const uniqueClicks = data.unique_clicks || 0;
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg border-l-4 border-l-indigo-500">
          <p className="font-semibold text-gray-900 mb-3 text-base">
            {viewMode === 'monthly' ? label : `Settimana ${data.week} del 2025`}
          </p>
          {viewMode === 'weekly' && (
            <p className="text-sm text-gray-600 mb-3 font-medium">{data.period}</p>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-indigo-500 rounded-full mr-3"></span>
                <span className="text-sm text-gray-700">Click totali:</span>
              </div>
              <span className="font-bold text-indigo-600 text-lg">{Number(totalClicks).toLocaleString('it-IT')}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-emerald-500 rounded-full mr-3"></span>
                <span className="text-sm text-gray-700">Click unici:</span>
              </div>
              <span className="font-bold text-emerald-600 text-lg">{Number(uniqueClicks).toLocaleString('it-IT')}</span>
            </div>
            {Number(totalClicks) > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Tasso di unicità:</span>
                  <span className="font-medium">
                    {((Number(uniqueClicks) / Number(totalClicks)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Analisi Periodica
          </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle buttons */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('monthly')}
              disabled={isAnimating}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                viewMode === 'monthly'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              } ${isAnimating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Mensile
            </button>
            <button
              onClick={() => handleViewModeChange('weekly')}
              disabled={isAnimating}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                viewMode === 'weekly'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              } ${isAnimating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Settimanale
            </button>
          </div>

          {/* Controlli di visibilità */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setShowTotalClicks(!showTotalClicks)}
              className={`p-2 rounded-md transition-all duration-200 ${
                showTotalClicks 
                  ? 'bg-indigo-500 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title={showTotalClicks ? 'Nascondi click totali' : 'Mostra click totali'}
            >
              {showTotalClicks ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setShowUniqueClicks(!showUniqueClicks)}
              className={`p-2 rounded-md transition-all duration-200 ${
                showUniqueClicks 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title={showUniqueClicks ? 'Nascondi click unici' : 'Mostra click unici'}
            >
              {showUniqueClicks ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>

          {/* Bottoni azioni */}
          <div className="flex items-center space-x-1">
            <button
              onClick={exportData}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all duration-200"
              title="Esporta dati"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grafico */}
      <div className={`h-96 transition-opacity duration-300 ${isAnimating ? 'opacity-50' : 'opacity-100'}`}>
        {(showTotalClicks || showUniqueClicks) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                angle={viewMode === 'weekly' ? -45 : 0}
                textAnchor={viewMode === 'weekly' ? 'end' : 'middle'}
                height={viewMode === 'weekly' ? 80 : 60}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toLocaleString('it-IT')}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {showTotalClicks && (
                <Bar 
                  dataKey="total_clicks" 
                  name="Click totali"
                  fill="#6366f1"
                  radius={[2, 2, 0, 0]}
                  animationDuration={300}
                  minPointSize={2}
                >
                  {displayData.map((entry, index) => {
                    const isCurrentPeriod = viewMode === 'weekly' 
                      ? (entry as EnhancedWeeklyData).isCurrentWeek 
                      : (entry as EnhancedMonthlyData).isCurrentMonth;
                    return (
                      <Cell 
                        key={`cell-total-${index}`}
                        fill={isCurrentPeriod ? '#4f46e5' : '#6366f1'}
                        stroke={isCurrentPeriod ? '#3730a3' : 'transparent'}
                        strokeWidth={isCurrentPeriod ? 2 : 0}
                        style={{
                          filter: isCurrentPeriod ? 'drop-shadow(0 4px 8px rgba(79, 70, 229, 0.3))' : 'none',
                          transform: isCurrentPeriod ? 'scale(1.02)' : 'scale(1)',
                          transformOrigin: 'center bottom',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    );
                  })}
                </Bar>
              )}
              {showUniqueClicks && (
                <Bar 
                  dataKey="unique_clicks" 
                  name="Click unici"
                  fill="#10b981"
                  radius={[2, 2, 0, 0]}
                  animationDuration={300}
                  minPointSize={2}
                >
                  {displayData.map((entry, index) => {
                    const isCurrentPeriod = viewMode === 'weekly' 
                      ? (entry as EnhancedWeeklyData).isCurrentWeek 
                      : (entry as EnhancedMonthlyData).isCurrentMonth;
                    return (
                      <Cell 
                        key={`cell-unique-${index}`}
                        fill={isCurrentPeriod ? '#059669' : '#10b981'}
                        stroke={isCurrentPeriod ? '#047857' : 'transparent'}
                        strokeWidth={isCurrentPeriod ? 2 : 0}
                        style={{
                          filter: isCurrentPeriod ? 'drop-shadow(0 4px 8px rgba(5, 150, 105, 0.3))' : 'none',
                          transform: isCurrentPeriod ? 'scale(1.02)' : 'scale(1)',
                          transformOrigin: 'center bottom',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    );
                  })}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <div className="text-4xl text-gray-400 mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Tutte le serie sono nascoste
              </h3>
              <p className="text-gray-500 text-sm">
                Utilizza i pulsanti di visibilità per mostrare i dati.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info aggiuntive */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-2 sm:space-y-0">
        <div>
          {viewMode === 'monthly' 
            ? 'Dati aggregati per mese dell\'anno corrente'
            : 'Dati aggregati per settimana dell\'anno corrente'
          }
        </div>
        
        <div className="flex items-center space-x-4">
          {!showTotalClicks && (
            <span className="text-gray-400">Click totali nascosti</span>
          )}
          {!showUniqueClicks && (
            <span className="text-gray-400">Click unici nascosti</span>
          )}
          <span className="text-gray-400">
            {displayData.length} {viewMode === 'monthly' ? 'mesi' : 'settimane'} visualizzate
          </span>
        </div>
      </div>
    </div>
  );
}
