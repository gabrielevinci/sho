'use client';

import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Calendar } from 'lucide-react';

// Interfaccia per i dati della serie temporale (usando quella esistente)
interface TimeSeriesData {
  date: string;
  total_clicks: number;
  unique_clicks: number;
  full_datetime?: string;
}

// Tipo per i filtri date (compatibile con quello esistente)
type DateFilter = 'today' | 'week' | 'month' | '3months' | 'year' | 'all' | 'custom';

interface WorkspaceClicksTrendChartProps {
  data: TimeSeriesData[];
  filterType?: DateFilter;
}

// Funzione per formattare le date in base al tipo di filtro
const formatDate = (dateStr: string, filterType: DateFilter): string => {
  if (!dateStr) return '';

  try {
    let date: Date;
    
    if (filterType === 'today' && dateStr.includes(':')) {
      // Per il filtro "oggi", il dateStr è in formato ora "HH:mm"
      return dateStr;
    }
    
    // Per tutti gli altri casi, parseizza la data
    if (dateStr.includes('T')) {
      date = new Date(dateStr);
    } else {
      date = new Date(`${dateStr}T00:00:00`);
    }
    
    if (isNaN(date.getTime())) {
      return dateStr;
    }

    switch (filterType) {
      case 'today':
        return date.toLocaleTimeString('it-IT', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      case 'week':
        return date.toLocaleDateString('it-IT', { 
          weekday: 'short',
          day: '2-digit',
          month: 'short'
        });
      case 'month':
        return date.toLocaleDateString('it-IT', { 
          day: '2-digit',
          month: 'short'
        });
      case '3months':
        return date.toLocaleDateString('it-IT', { 
          day: '2-digit',
          month: 'short'
        });
      case 'year':
        return date.toLocaleDateString('it-IT', { 
          month: 'short',
          year: '2-digit'
        });
      case 'custom':
        return date.toLocaleDateString('it-IT', { 
          day: '2-digit',
          month: 'short'
        });
      default:
        return date.toLocaleDateString('it-IT', { 
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
    }
  } catch (error) {
    console.error('Errore nella formattazione della data:', error);
    return dateStr;
  }
};

// Componente personalizzato per il tooltip
const CustomTooltip = ({ 
  active, 
  payload, 
  label,
  filterType
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
    payload?: {
      date: string;
      full_datetime?: string;
      total_clicks: number;
      unique_clicks: number;
      displayDate?: string;
    };
  }>;
  label?: string;
  filterType?: DateFilter;
}) => {
  if (active && payload && payload.length && label) {
    // Formato del label in base al tipo di filtro
    let formattedLabel: string;
    
    if (filterType === 'today') {
      // Per "oggi", usa sempre l'ora del label
      const dataPoint = payload[0].payload;
      let dateString = "";
      const timeString = label;
      
      try {
        // Per la data, cerca di usare full_datetime solo per determinare il giorno
        if (dataPoint && dataPoint.full_datetime) {
          const date = new Date(dataPoint.full_datetime);
          if (!isNaN(date.getTime())) {
            dateString = date.toLocaleDateString('it-IT', {
              weekday: 'short',
              day: '2-digit',
              month: 'short'
            });
          }
        }
        
        // Se non abbiamo la data da full_datetime, usa oggi
        if (!dateString) {
          const today = new Date();
          const italianToday = new Date(today.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
          dateString = italianToday.toLocaleDateString('it-IT', {
            weekday: 'short',
            day: '2-digit',
            month: 'short'
          });
        }
      } catch (e) {
        console.error("Errore nella formattazione della data:", e);
        const today = new Date();
        const italianToday = new Date(today.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
        dateString = italianToday.toLocaleDateString('it-IT', {
          weekday: 'short',
          day: '2-digit',
          month: 'short'
        });
      }
      
      formattedLabel = dateString && timeString
        ? `📅 ${dateString} alle ${timeString}`
        : `🕐 Ore ${timeString || label}`;
    } else {
      // Per tutti gli altri filtri, formattiamo la data
      try {
        const formattedDate = formatDate(label, filterType || 'all');
        
        // Per il filtro year, mostriamo la data completa nel tooltip
        if (filterType === 'year') {
          const dataPoint = payload[0].payload;
          if (dataPoint && dataPoint.date) {
            const dateToFormat = dataPoint.date.includes('T') ? dataPoint.date : `${dataPoint.date}T00:00:00`;
            const fullDate = new Date(dateToFormat);
            if (!isNaN(fullDate.getTime())) {
              const fullFormattedDate = fullDate.toLocaleDateString('it-IT', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              });
              formattedLabel = `📅 ${fullFormattedDate}`;
            } else {
              formattedLabel = `📅 ${formattedDate}`;
            }
          } else {
            formattedLabel = `📅 ${formattedDate}`;
          }
        } else {
          formattedLabel = `📅 ${formattedDate}`;
        }
      } catch {
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
        
        {/* Footer con tasso conversione se ci sono entrambi i valori */}
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

export default function WorkspaceClicksTrendChart({ 
  data, 
  filterType = 'all',
}: WorkspaceClicksTrendChartProps) {

  // Prepara i dati per il grafico
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      displayDate: formatDate(item.date, filterType)
    }));
  }, [data, filterType]);

  // Calcola il massimo per l'asse Y
  const maxValue = useMemo(() => {
    const maxTotal = Math.max(...data.map(d => d.total_clicks));
    const maxUnique = Math.max(...data.map(d => d.unique_clicks));
    const rawMax = Math.max(maxTotal, maxUnique);
    // Arrotonda per eccesso e aggiungi padding
    return Math.ceil(rawMax * 1.1);
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
        <div className="flex items-center space-x-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Andamento Click - Workspace</h3>
            <p className="text-sm text-gray-600">
              Click totali e unici aggregati per tutti i link del workspace
            </p>
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
                filterType === 'today' ? 1 : 
                filterType === 'week' ? 0 : 
                filterType === 'month' ? Math.max(0, Math.floor(data.length / 8)) : 
                filterType === '3months' ? Math.max(0, Math.floor(data.length / 10)) : 
                filterType === 'year' ? Math.max(0, Math.floor(data.length / 15)) : 
                filterType === 'custom' ? Math.max(0, Math.floor(data.length / 10)) :
                'preserveStartEnd'
              }
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#666"
              domain={[0, maxValue]}
              allowDecimals={false}
              tickCount={6}
              type="number"
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
