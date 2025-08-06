import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CalendarDays, TrendingUp, Users } from 'lucide-react';

interface ChartDataPoint {
  date: string;
  fullDate: string; // Data completa per il tooltip
  dayName?: string; // Nome del giorno per il tooltip (solo per filtri giornalieri)
  clickTotali: number;
  clickUnici: number;
  isCurrentHour?: boolean; // Indica se questa è l'ora corrente (solo per filtro 24h)
}

interface ChartProps {
  shortCode: string;
  filter: string;
  startDate?: string;
  endDate?: string;
  triggerRefresh?: number; // Nuovo prop per controllare quando aggiornare
}

const StatsChart: React.FC<ChartProps> = ({ shortCode, filter, startDate, endDate, triggerRefresh }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleLines, setVisibleLines] = useState({
    clickTotali: true,
    clickUnici: true
  });

  // Funzione per recuperare i dati del grafico
  const fetchChartData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Per il filtro custom, verifica che le date siano fornite
      if (filter === 'custom' && (!startDate || !endDate)) {
        setLoading(false);
        return; // Non fare la chiamata API se mancano le date per il filtro custom
      }

      // Costruisci l'URL della query
      let url = `/api/links/${shortCode}/stats?filter=${filter}`;
      
      if (filter === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
      }

      const data = await response.json();

      // Log di debug per confrontare i totali
      if (filter === 'all') {
        const totalClicks = data.reduce((sum: number, item: any) => sum + (item.click_totali || 0), 0);
        const maxUniqueClicks = Math.max(...data.map((item: any) => item.click_unici || 0));
        const firstDate = data.length > 0 ? data[0].data_italiana : 'N/A';
        const lastDate = data.length > 0 ? data[data.length - 1].data_italiana : 'N/A';
        const daysWithClicks = data.filter((item: any) => (item.click_totali || 0) > 0).length;
        console.log(`📊 CHART - Filtro '${filter}': ${totalClicks} click totali, ${maxUniqueClicks} click unici massimi`);
        console.log(`📊 CHART - Periodo completo: dal ${firstDate} al ${lastDate} (${data.length} giorni totali, ${daysWithClicks} giorni con click)`);
      }

      // Trasforma i dati per il grafico
      const transformedData: ChartDataPoint[] = data.map((item: any) => {
        // Per il filtro 24h usa 'ora_italiana', per gli altri 'data_italiana'
        const dateKey = filter === '24h' ? 'ora_italiana' : 'data_italiana';
        let dateValue = item[dateKey];
        const date = new Date(dateValue);

        // Formatta la data per la visualizzazione
        let displayDate: string;
        let fullDate: string;
        let dayName: string | undefined;

        if (filter === '24h') {
          // Per le ore, mostra solo l'ora 
          const baseHour = date.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
          });
          
          // Per l'asse X manteniamo la visualizzazione pulita
          displayDate = baseHour;
          
          // Per il tooltip includiamo l'indicazione dell'ora corrente
          fullDate = date.toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          dayName = date.toLocaleDateString('it-IT', { weekday: 'long' });
        } else {
          // Per i giorni, mostra la data
          dayName = date.toLocaleDateString('it-IT', { weekday: 'long' });
          
          if (filter === 'all') {
            // Per il filtro "all", usa formato più compatto per gestire periodi lunghi
            displayDate = date.toLocaleDateString('it-IT', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit'
            });
          } else {
            // Per altri filtri, formato senza anno
            displayDate = date.toLocaleDateString('it-IT', {
              day: '2-digit',
              month: '2-digit'
            });
          }
          
          fullDate = date.toLocaleDateString('it-IT', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          });
        }

        const transformedItem: ChartDataPoint = {
          date: displayDate,
          fullDate: fullDate,
          dayName: dayName,
          clickTotali: parseInt(item.click_totali) || 0,
          clickUnici: parseInt(item.click_unici) || 0,
          isCurrentHour: filter === '24h' ? item.is_current_hour : undefined
        };

        return transformedItem;
      });

      setChartData(transformedData);
    } catch (err) {
      console.error('Errore nel caricamento dei dati del grafico:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  // Effetto per caricare i dati solo quando triggerRefresh cambia
  useEffect(() => {
    if (shortCode && filter && triggerRefresh !== undefined) {
      fetchChartData();
    }
  }, [shortCode, filter, triggerRefresh]);

  // Effetto per caricare i dati iniziali solo per filtri non-custom
  useEffect(() => {
    if (shortCode && filter && filter !== 'custom' && triggerRefresh === undefined) {
      fetchChartData();
    }
  }, [shortCode, filter]);

  // Caso speciale: filtro custom senza date
  if (filter === 'custom' && (!startDate || !endDate)) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Andamento click
          </h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Seleziona le date personalizzate per visualizzare il grafico</p>
          </div>
        </div>
      </div>
    );
  }

  // Componente di loading
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Andamento click
          </h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-gray-600">Caricamento grafico...</span>
          </div>
        </div>
      </div>
    );
  }

  // Componente di errore
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Andamento click
          </h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 mb-2">⚠️ Errore</div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={fetchChartData}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Nessun dato disponibile
  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Andamento click
          </h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Nessun dato disponibile per il periodo selezionato</p>
          </div>
        </div>
      </div>
    );
  }

  // Calcola le statistiche di riepilogo
  const totalClicks = chartData.reduce((sum, item) => sum + item.clickTotali, 0);
  const uniqueClicks = chartData.reduce((sum, item) => sum + item.clickUnici, 0);

  // Gestione click sulla leggenda per nascondere/mostrare le linee
  const handleLegendClick = (dataKey: string) => {
    setVisibleLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey as keyof typeof prev]
    }));
  };

  // Leggenda personalizzata sempre visibile
  const CustomLegend = () => {
    // Definiamo manualmente i dati della leggenda per mantenerla sempre visibile
    const legendItems = [
      {
        dataKey: 'clickTotali',
        color: '#3b82f6',
        label: 'Click Totali'
      },
      {
        dataKey: 'clickUnici',
        color: '#10b981',
        label: 'Click Unici'
      }
    ];
    
    return (
      <div className="flex justify-center space-x-6 mt-4">
        {legendItems.map((item, index) => (
          <div
            key={`legend-${index}`}
            className={`flex items-center space-x-2 cursor-pointer select-none transition-opacity duration-200 ${
              !visibleLines[item.dataKey as keyof typeof visibleLines] ? 'opacity-50' : 'opacity-100'
            } hover:opacity-80`}
            onClick={() => handleLegendClick(item.dataKey)}
          >
            <div
              className={`w-4 h-0.5 ${item.dataKey === 'clickUnici' ? 'border-dashed border-t-2' : ''}`}
              style={{ 
                backgroundColor: item.color,
                borderColor: item.dataKey === 'clickUnici' ? item.color : 'transparent'
              }}
            />
            <span className="text-sm text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    );
  };

  // Componente personalizzato per i tick dell'asse X
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const value = payload.value;
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#6b7280" fontSize="12">
          {value}
        </text>
      </g>
    );
  };
  // Tooltip personalizzato
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const clickTotali = payload[0]?.payload?.clickTotali || 0;
      const clickUnici = payload[0]?.payload?.clickUnici || 0;
      const fullDate = payload[0]?.payload?.fullDate || label;
      const dayName = payload[0]?.payload?.dayName;
      
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-xl">
          <div className="mb-2">
            <p className="font-semibold text-gray-900 text-sm">
              {fullDate}
            </p>
            {dayName && filter !== '24h' && (
              <p className="text-xs text-gray-600 capitalize">
                {dayName}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <p className="flex items-center text-sm text-gray-800">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
              <span className="text-gray-700">Click Totali:</span>
              <span className="font-bold text-gray-900 ml-1">{clickTotali}</span>
            </p>
            <p className="flex items-center text-sm text-gray-800">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              <span className="text-gray-700">Click Unici:</span>
              <span className="font-bold text-gray-900 ml-1">{clickUnici}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header del grafico */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Andamento click
          </h3>
        </div>
        
        {/* Statistiche di riepilogo */}
        <div className="flex space-x-4 mt-3 sm:mt-0">
          <div className="text-center">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Totale</div>
            <div className="text-lg font-bold text-blue-600">{totalClicks.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unici</div>
            <div className="text-lg font-bold text-green-600">{uniqueClicks.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Grafico */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: filter === 'all' && chartData.length > 30 ? 60 : 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              interval={filter === 'all' && chartData.length > 30 ? Math.ceil(chartData.length / 10) : 'preserveStartEnd'}
              angle={filter === 'all' && chartData.length > 30 ? -45 : 0}
              textAnchor={filter === 'all' && chartData.length > 30 ? 'end' : 'middle'}
              height={filter === 'all' && chartData.length > 30 ? 60 : 30}
              tick={<CustomXAxisTick />}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[0, (dataMax: number) => Math.max(dataMax, 5)]}
              tickCount={6}
              allowDecimals={false}
              tickFormatter={(value) => Math.round(value).toString()}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Rimuoviamo la Legend di recharts e la renderizziamo manualmente sotto */}
            {visibleLines.clickTotali && (
              <Line 
                type="monotone" 
                dataKey="clickTotali" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                name="Click Totali"
              />
            )}
            {visibleLines.clickUnici && (
              <Line 
                type="monotone" 
                dataKey="clickUnici" 
                stroke="#10b981" 
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                name="Click Unici"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Leggenda personalizzata sempre visibile */}
      <CustomLegend />
    </div>
  );
};

export default StatsChart;
