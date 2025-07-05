'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar } from 'lucide-react';

// Tipi di dati per il grafico
type TimeSeriesData = {
  date: string;
  total_clicks: number;
  unique_clicks: number;
  full_datetime?: string | Date; // Campo opzionale per i dati orari
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
}

// Funzione per aggregare i dati per settimana quando il periodo è lungo
const aggregateWeeklyData = (data: TimeSeriesData[]): TimeSeriesData[] => {
  if (data.length <= 50) return data; // Non aggregare se ci sono meno di 50 punti dati

  const weeklyMap = new Map<string, { total_clicks: number; unique_clicks: number; dates: string[] }>();
  
  data.forEach(item => {
    const date = new Date(`${item.date}T00:00:00`);
    if (isNaN(date.getTime())) return;
    
    // Calcola l'inizio della settimana (lunedì)
    const dayOfWeek = date.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Se domenica (0), vai indietro di 6 giorni
    const monday = new Date(date);
    monday.setDate(date.getDate() + mondayOffset);
    
    const weekKey = monday.toISOString().split('T')[0];
    
    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, { total_clicks: 0, unique_clicks: 0, dates: [] });
    }
    
    const weekData = weeklyMap.get(weekKey)!;
    weekData.total_clicks += item.total_clicks;
    weekData.unique_clicks += item.unique_clicks;
    weekData.dates.push(item.date);
  });
  
  return Array.from(weeklyMap.entries())
    .map(([weekStart, data]) => ({
      date: weekStart,
      total_clicks: data.total_clicks,
      unique_clicks: data.unique_clicks
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

// Funzione utility per formattare le date
const formatDate = (dateString: string, filterType: DateFilter = 'all', isAggregated: boolean = false): string => {
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
  
  // Se i dati sono aggregati per settimana, mostra formato settimana
  if (isAggregated && filterType === 'year') {
    const endOfWeek = new Date(date);
    endOfWeek.setDate(date.getDate() + 6);
    
    // Se sono nella stessa settimana di oggi, mostra "Questa settimana"
    const now = new Date();
    const startOfThisWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfThisWeek.setDate(now.getDate() + mondayOffset);
    startOfThisWeek.setHours(0, 0, 0, 0);
    
    if (date.toDateString() === startOfThisWeek.toDateString()) {
      return 'Questa settimana';
    }
    
    // Se nell'anno corrente, mostra solo giorno e mese
    if (date.getFullYear() === now.getFullYear()) {
      return `${date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} - ${endOfWeek.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}`;
    } else {
      // Se in un anno diverso, includi l'anno
      return `${date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' })}`;
    }
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
      year: 'numeric'
    });
  } else if (filterType === 'all') {
    // Per "sempre", format dipende dalla lunghezza del periodo
    // Le date dal backend sono già in formato YYYY-MM-DD, rappresentano giorni italiani
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

// Tooltip personalizzato
const CustomTooltip = ({ active, payload, label, filterType, isPercentageView, isAggregated }: {
  active?: boolean;
  payload?: Array<{
    color: string;
    name: string;
    value: number;
    payload: TimeSeriesData; // Aggiungiamo il payload completo
  }>;
  label?: string;
  filterType?: DateFilter;
  isPercentageView?: boolean;
  isAggregated?: boolean;
}) => {
  if (active && payload && payload.length && label) {
    // Formato del label in base al tipo di filtro
    let formattedLabel: string;
    
    if (filterType === 'today') {
      // Per "oggi", usa sempre l'ora del label (che corrisponde all'asse X) per evitare discrepanze
      const dataPoint = payload[0].payload;
      let dateString = "";
      const timeString = label; // Usa sempre l'ora del label dell'asse X
      
      try {
        // Per la data, cerca di usare full_datetime solo per determinare il giorno
        if (dataPoint && dataPoint.full_datetime) {
          const date = new Date(dataPoint.full_datetime);
          if (!isNaN(date.getTime())) {
            // Usa solo la parte della data, non l'ora
            dateString = date.toLocaleDateString('it-IT', {
              weekday: 'short',
              day: '2-digit',
              month: 'short'
            });
          }
        }
        
        // Se non abbiamo la data da full_datetime, prova con il campo date
        if (!dateString && dataPoint && dataPoint.date) {
          if (dataPoint.date.includes(':')) {
            // È un'ora, usa la data di oggi in Italia
            const now = new Date();
            const italianDate = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
            dateString = italianDate.toLocaleDateString('it-IT', {
              weekday: 'short',
              day: '2-digit',
              month: 'short'
            });
          } else {
            // È una data completa
            const date = new Date(`${dataPoint.date}T00:00:00`);
            if (!isNaN(date.getTime())) {
              dateString = date.toLocaleDateString('it-IT', {
                weekday: 'short',
                day: '2-digit',
                month: 'short'
              });
            }
          }
        }
        
        // Fallback finale: usa oggi in orario italiano
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
        
        // Fallback completo
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
        const formattedDate = formatDate(label, filterType, isAggregated);
        if (isAggregated && filterType === 'year') {
          formattedLabel = `📅 Settimana: ${formattedDate}`;
        } else {
          formattedLabel = `📅 ${formattedDate}`;
        }
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
                  {isAggregated && filterType === 'year' 
                    ? (entry.name === 'total_clicks' ? 'Click Totali (settimana)' : 'Click Unici (settimana)')
                    : (entry.name === 'total_clicks' ? 'Click Totali' : 'Click Unici')
                  }
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {isPercentageView 
                  ? `${entry.value.toFixed(1)}%`
                  : entry.value.toLocaleString('it-IT')
                }
              </span>
            </div>
          ))}
        </div>
        
        {/* Footer con totale se ci sono entrambi i valori */}
        {payload.length === 2 && !isPercentageView && (
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
}: ClicksTrendChartDualProps) {

  // Determina se aggregare i dati
  const shouldAggregate = filterType === 'year' && data.length > 50;
  
  // Prepara i dati per il grafico - aggrega se necessario
  const processedData = useMemo(() => {
    return shouldAggregate ? aggregateWeeklyData(data) : data;
  }, [data, shouldAggregate]);

  // Prepara i dati per il grafico - sempre valori assoluti
  const chartData = useMemo(() => {
    return processedData.map(item => ({
      ...item,
      displayDate: formatDate(item.date, filterType, shouldAggregate)
    }));
  }, [processedData, filterType, shouldAggregate]);

  // Calcola il massimo per l'asse Y - sempre valori assoluti
  const maxValue = useMemo(() => {
    const maxTotal = Math.max(...processedData.map(d => d.total_clicks));
    const maxUnique = Math.max(...processedData.map(d => d.unique_clicks));
    const rawMax = Math.max(maxTotal, maxUnique);
    // Arrotonda per eccesso e aggiungi padding intero per avere solo numeri interi
    return Math.ceil(rawMax * 1.1);
  }, [processedData]);

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
            <h3 className="text-lg font-semibold text-gray-900">Andamento Click</h3>
            <p className="text-sm text-gray-600">
              {shouldAggregate 
                ? 'Click totali e unici aggregati per settimana' 
                : 'Click totali e unici nel tempo'
              }
            </p>
          </div>
        </div>
        {shouldAggregate && (
          <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            📊 Dati aggregati per settimana per migliorare la leggibilità
          </div>
        )}
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
                filterType === 'month' ? Math.max(0, Math.floor(chartData.length / 8)) : // Per mese, mostra circa 8 date
                filterType === '3months' ? Math.max(0, Math.floor(chartData.length / 10)) : // Per 3 mesi, mostra circa 10 date
                filterType === 'year' ? (shouldAggregate ? Math.max(0, Math.floor(chartData.length / 8)) : Math.max(0, Math.floor(chartData.length / 12))) : // Per anno, intervallo basato su aggregazione
                'preserveStartEnd' // Per altri filtri, mostra inizio e fine
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
              content={<CustomTooltip filterType={filterType} isPercentageView={false} isAggregated={shouldAggregate} />}
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
      {processedData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {filterType === 'today' 
                ? `Periodo: Ultime 24 ore (${processedData[0].date} - ${processedData[processedData.length - 1].date})`
                : `Periodo: ${formatDate(processedData[0].date, filterType, shouldAggregate)} - ${formatDate(processedData[processedData.length - 1].date, filterType, shouldAggregate)}`
              }
            </span>
            <span>
              {processedData.length} {filterType === 'today' ? 'ore' : shouldAggregate ? 'settimane' : 'punti dati'}
              {shouldAggregate && ` (${data.length} giorni aggregati)`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
