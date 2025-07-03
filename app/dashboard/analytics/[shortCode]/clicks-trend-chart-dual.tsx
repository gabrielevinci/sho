'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

// Tipi di dati per il grafico
type TimeSeriesData = {
  date: string;
  total_clicks: number;
  unique_clicks: number;
};

type DateFilter = 
  | 'all'
  | 'today' 
  | 'week' 
  | 'month' 
  | '3months'
  | 'year' 
  | 'custom';

// Props del componente
interface ClicksTrendChartDualProps {
  data: TimeSeriesData[];
  filterType?: DateFilter;
  totalClicks: number;
  uniqueClicks: number;
}

// Funzione utility per formattare le date
const formatDate = (dateString: string, filterType: DateFilter = 'all'): string => {
  if (filterType === 'today') {
    // Per "oggi", la stringa è già in formato HH:MM dal database
    return dateString;
  }
  
  // Controllo di sicurezza: verifica che dateString sia valido
  if (!dateString || dateString.trim() === '') {
    return '';
  }
  
  // Per altri filtri, il backend restituisce date in formato YYYY-MM-DD
  // Aggiungiamo 'T00:00:00' per creare un timestamp valido
  const dateToFormat = dateString.includes('T') ? dateString : `${dateString}T00:00:00`;
  const date = new Date(dateToFormat);
  
  // Verifica che la data sia valida
  if (isNaN(date.getTime())) {
    console.warn(`Data non valida ricevuta: ${dateString}`);
    return dateString; // Fallback al valore originale
  }
  
  if (filterType === 'week') {
    // Per settimana, mostra giorno della settimana e giorno del mese
    return date.toLocaleDateString('it-IT', { 
      weekday: 'short',
      day: '2-digit' 
    });
  } else if (filterType === 'month' || filterType === '3months') {
    // Per mese e 3 mesi, mostra giorno e mese
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: 'short' 
    });
  } else if (filterType === 'year') {
    // Per anno, mostra mese e anno per evitare sovraffollamento
    return date.toLocaleDateString('it-IT', { 
      month: 'short',
      year: '2-digit'
    });
  } else if (filterType === 'all') {
    // Per "sempre", format dipende dalla lunghezza del periodo
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: 'short'
    });
  } else if (filterType === 'custom') {
    // Per filtro personalizzato
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: 'short'
    });
  } else {
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: 'short'
    });
  }
};

// Funzione per calcolare il trend
const calculateTrend = (data: TimeSeriesData[]): { 
  totalTrend: 'up' | 'down' | 'stable';
  uniqueTrend: 'up' | 'down' | 'stable';
  totalChange: number;
  uniqueChange: number;
} => {
  if (data.length < 2) {
    return { 
      totalTrend: 'stable', 
      uniqueTrend: 'stable', 
      totalChange: 0, 
      uniqueChange: 0 
    };
  }

  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));

  const firstHalfTotalAvg = firstHalf.reduce((sum, item) => sum + item.total_clicks, 0) / firstHalf.length;
  const secondHalfTotalAvg = secondHalf.reduce((sum, item) => sum + item.total_clicks, 0) / secondHalf.length;
  
  const firstHalfUniqueAvg = firstHalf.reduce((sum, item) => sum + item.unique_clicks, 0) / firstHalf.length;
  const secondHalfUniqueAvg = secondHalf.reduce((sum, item) => sum + item.unique_clicks, 0) / secondHalf.length;

  const totalChange = firstHalfTotalAvg > 0 ? ((secondHalfTotalAvg - firstHalfTotalAvg) / firstHalfTotalAvg) * 100 : 0;
  const uniqueChange = firstHalfUniqueAvg > 0 ? ((secondHalfUniqueAvg - firstHalfUniqueAvg) / firstHalfUniqueAvg) * 100 : 0;

  const totalTrend = Math.abs(totalChange) < 5 ? 'stable' : totalChange > 0 ? 'up' : 'down';
  const uniqueTrend = Math.abs(uniqueChange) < 5 ? 'stable' : uniqueChange > 0 ? 'up' : 'down';

  return { totalTrend, uniqueTrend, totalChange, uniqueChange };
};

// Tooltip personalizzato
const CustomTooltip = ({ active, payload, label, filterType }: {
  active?: boolean;
  payload?: Array<{
    color: string;
    name: string;
    value: number;
  }>;
  label?: string;
  filterType?: DateFilter;
}) => {
  if (active && payload && payload.length && label) {
    // Formato del label in base al tipo di filtro
    let formattedLabel: string;
    
    if (filterType === 'today') {
      // Per "oggi", il label è già in formato HH:MM
      formattedLabel = `🕐 ${label}`;
    } else {
      // Per tutti gli altri filtri, formattiamo la data
      try {
        const formattedDate = formatDate(label, filterType);
        formattedLabel = `📅 ${formattedDate}`;
      } catch {
        // Fallback in caso di errore nella formattazione
        formattedLabel = `📅 ${label}`;
      }
    }

    return (
      <div className="bg-white border-2 border-gray-300 rounded-xl shadow-2xl p-4 min-w-[220px] backdrop-blur-sm">
        {/* Header del tooltip */}
        <div className="mb-3 pb-2 border-b border-gray-200">
          <p className="font-bold text-gray-900 text-base">
            {formattedLabel}
          </p>
        </div>
        
        {/* Dati */}
        <div className="space-y-2">
          {payload.map((entry, index: number) => (
            <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm font-semibold text-gray-700">
                  {entry.name === 'total_clicks' ? 'Click Totali' : 'Click Unici'}
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {entry.value.toLocaleString('it-IT')}
              </span>
            </div>
          ))}
        </div>
        
        {/* Footer con totale se ci sono entrambi i valori */}
        {payload.length === 2 && (
          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Tasso conversione:</span>
              <span className="font-medium">
                {payload[0].value > 0 
                  ? `${Math.round((payload[1].value / payload[0].value) * 100)}%`
                  : '0%'
                }
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function ClicksTrendChartDual({ 
  data, 
  filterType = 'all',
  totalClicks = 0,
  uniqueClicks = 0
}: ClicksTrendChartDualProps) {

  // Prepara i dati per il grafico
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      displayDate: formatDate(item.date, filterType)
    }));
  }, [data, filterType]);

  // Calcola il trend
  const trend = useMemo(() => calculateTrend(data), [data]);

  // Calcola il massimo per l'asse Y
  const maxValue = useMemo(() => {
    const maxTotal = Math.max(...data.map(d => d.total_clicks));
    const maxUnique = Math.max(...data.map(d => d.unique_clicks));
    return Math.max(maxTotal, maxUnique) * 1.1; // Aggiungi 10% di padding
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">Nessun dato disponibile</p>
            <p className="text-sm">Non ci sono click registrati per questo periodo</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header del grafico */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Andamento Click</h3>
          <p className="text-sm text-gray-600">Click totali e unici nel tempo</p>
        </div>
        
        {/* Statistiche trend */}
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="flex items-center space-x-1">
              {trend.totalTrend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : trend.totalTrend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : null}
              <span className="text-sm font-semibold text-gray-900">
                {totalClicks.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-gray-500">Click Totali</p>
            {Math.abs(trend.totalChange) >= 5 && (
              <span className={`text-xs font-medium ${
                trend.totalTrend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.totalTrend === 'up' ? '+' : ''}{trend.totalChange.toFixed(1)}%
              </span>
            )}
          </div>
          
          <div className="text-center">
            <div className="flex items-center space-x-1">
              {trend.uniqueTrend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-blue-600" />
              ) : trend.uniqueTrend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : null}
              <span className="text-sm font-semibold text-gray-900">
                {uniqueClicks.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-gray-500">Click Unici</p>
            {Math.abs(trend.uniqueChange) >= 5 && (
              <span className={`text-xs font-medium ${
                trend.uniqueTrend === 'up' ? 'text-blue-600' : 'text-red-600'
              }`}>
                {trend.uniqueTrend === 'up' ? '+' : ''}{trend.uniqueChange.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grafico */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="displayDate"
              tick={{ fontSize: 12 }}
              stroke="#666"
              angle={filterType === 'today' ? -45 : -45}
              textAnchor="end"
              height={60}
              interval={
                filterType === 'today' ? 1 : // Per ore, mostra ogni 2 ore
                filterType === 'week' ? 0 : // Per settimana, mostra tutti i giorni
                filterType === 'month' ? Math.max(0, Math.floor(data.length / 8)) : // Per mese, mostra circa 8 date
                filterType === '3months' ? Math.max(0, Math.floor(data.length / 10)) : // Per 3 mesi, mostra circa 10 date
                filterType === 'year' ? Math.max(0, Math.floor(data.length / 12)) : // Per anno, mostra circa 12 date
                'preserveStartEnd' // Per altri filtri, mostra inizio e fine
              }
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#666"
              domain={[0, maxValue]}
            />
            <Tooltip 
              content={<CustomTooltip filterType={filterType} />}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value: string) => 
                value === 'total_clicks' ? 'Click Totali' : 'Click Unici'
              }
            />
            <Line 
              type="monotone" 
              dataKey="total_clicks" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
              name="total_clicks"
            />
            <Line 
              type="monotone" 
              dataKey="unique_clicks" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
              name="unique_clicks"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer con informazioni aggiuntive */}
      {data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {filterType === 'today' 
                ? `Periodo: Ultime 24 ore (${data[0].date} - ${data[data.length - 1].date})`
                : `Periodo: ${formatDate(data[0].date, filterType)} - ${formatDate(data[data.length - 1].date, filterType)}`
              }
            </span>
            <span>
              {data.length} {filterType === 'today' ? 'ore' : 'punti dati'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
