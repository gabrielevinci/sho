import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CalendarDays, TrendingUp, Users } from 'lucide-react';

interface ChartDataPoint {
  date: string;
  clickTotali: number;
  clickUnici: number;
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

        // Formatta la data per la visualizzazione
        let displayDate: string;
        if (filter === '24h') {
          // Per le ore, mostra solo l'ora
          displayDate = new Date(dateValue).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
          });
        } else {
          // Per i giorni, mostra la data
          const date = new Date(dateValue);
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
        }

        return {
          date: displayDate,
          clickTotali: parseInt(item.click_totali) || 0,
          clickUnici: parseInt(item.click_unici) || 0
        };
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
            Grafico delle Statistiche
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
            Grafico delle Statistiche
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
            Grafico delle Statistiche
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
            Grafico delle Statistiche
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
  const avgClicksPerPeriod = Math.round(totalClicks / chartData.length);

  // Tooltip personalizzato
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-xl">
          <p className="font-semibold text-gray-900 mb-2 text-sm">{label}</p>
          <div className="space-y-2">
            <p className="flex items-center text-sm text-gray-800">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
              <span className="text-gray-700">Click Totali:</span>
              <span className="font-bold text-gray-900 ml-1">{payload[0].value}</span>
            </p>
            <p className="flex items-center text-sm text-gray-800">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              <span className="text-gray-700">Click Unici:</span>
              <span className="font-bold text-gray-900 ml-1">{payload[1].value}</span>
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
            Grafico delle Statistiche
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Andamento temporale dei click per il periodo selezionato
          </p>
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
          <div className="text-center">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Media</div>
            <div className="text-lg font-bold text-purple-600">{avgClicksPerPeriod.toLocaleString()}</div>
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
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="clickTotali" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              name="Click Totali"
            />
            <Line 
              type="monotone" 
              dataKey="clickUnici" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
              name="Click Unici"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda aggiuntiva */}
      <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">Click Totali - Tutti i click ricevuti</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">Click Unici - Visitatori unici (basato su fingerprint)</span>
        </div>
      </div>
    </div>
  );
};

export default StatsChart;
