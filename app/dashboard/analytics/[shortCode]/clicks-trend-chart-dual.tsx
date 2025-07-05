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
  // IMPORTANTE: Non aggiungere 'T00:00:00' per evitare problemi di timezone
  // Usiamo direttamente la data come stringa YYYY-MM-DD che viene interpretata come data locale
  let date: Date;
  
  if (dateString.includes('T')) {
    // Se già include un orario, usala così com'è
    date = new Date(dateString);
  } else {
    // Per le date in formato YYYY-MM-DD, creiamo la data in modo che sia interpretata come fuso orario locale
    // invece che UTC, usando il costruttore Date con parametri separati
    const [year, month, day] = dateString.split('-').map(Number);
    date = new Date(year, month - 1, day); // month - 1 perché i mesi in JavaScript sono 0-based
  }
  
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
    // Per anno, mostra solo il mese per evitare sovraffollamento sull'asse X
    // ma i dati rimangono giorno per giorno
    return date.toLocaleDateString('it-IT', { 
      month: 'short'
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
const CustomTooltip = ({ active, payload, label, filterType, isPercentageView }: {
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
            // È una data completa, creiamo la data nel fuso orario locale
            let date: Date;
            if (dataPoint.date.includes('T')) {
              date = new Date(dataPoint.date);
            } else {
              const [year, month, day] = dataPoint.date.split('-').map(Number);
              date = new Date(year, month - 1, day);
            }
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
        const formattedDate = formatDate(label, filterType);
        
        // Per il filtro year, mostriamo la data completa nel tooltip anche se l'asse X mostra solo il mese
        if (filterType === 'year') {
          // Ricostruiamo la data completa dal payload per il tooltip
          const dataPoint = payload[0].payload;
          if (dataPoint && dataPoint.date) {
            let fullDate: Date;
            if (dataPoint.date.includes('T')) {
              fullDate = new Date(dataPoint.date);
            } else {
              // Creiamo la data nel fuso orario locale per evitare problemi di timezone
              const [year, month, day] = dataPoint.date.split('-').map(Number);
              fullDate = new Date(year, month - 1, day);
            }
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

  // Prepara i dati per il grafico - sempre valori assoluti
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      displayDate: formatDate(item.date, filterType)
    }));
  }, [data, filterType]);

  // Calcola il massimo per l'asse Y - sempre valori assoluti
  const maxValue = useMemo(() => {
    const maxTotal = Math.max(...data.map(d => d.total_clicks));
    const maxUnique = Math.max(...data.map(d => d.unique_clicks));
    const rawMax = Math.max(maxTotal, maxUnique);
    // Arrotonda per eccesso e aggiungi padding intero per avere solo numeri interi
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
            <h3 className="text-lg font-semibold text-gray-900">Andamento Click</h3>
            <p className="text-sm text-gray-600">
              Click totali e unici nel tempo
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
                filterType === 'today' ? 1 : // Per ore, mostra ogni 2 ore
                filterType === 'week' ? 0 : // Per settimana, mostra tutti i giorni
                filterType === 'month' ? Math.max(0, Math.floor(data.length / 8)) : // Per mese, mostra circa 8 date
                filterType === '3months' ? Math.max(0, Math.floor(data.length / 10)) : // Per 3 mesi, mostra circa 10 date
                filterType === 'year' ? Math.max(0, Math.floor(data.length / 15)) : // Per anno, mostra circa 15-20 etichette per evitare sovraffollamento
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
              content={<CustomTooltip filterType={filterType} isPercentageView={false} />}
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
