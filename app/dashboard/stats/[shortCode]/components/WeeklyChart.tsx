import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, BarChart3 } from 'lucide-react';

interface WeeklyDataPoint {
  settimana: string;
  settimana_display: string; // Formato per visualizzazione
  numero_di_click: number;
  numero_di_click_unici: number;
  isCurrentWeek?: boolean; // Flag per identificare la settimana corrente
}

interface WeeklyChartProps {
  shortCode: string;
  year: number;
  triggerRefresh?: number;
  onYearChange: (year: number) => void;
}

const WeeklyChart: React.FC<WeeklyChartProps> = ({ shortCode, year, triggerRefresh, onYearChange }) => {
  const [chartData, setChartData] = useState<WeeklyDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Funzione per recuperare i dati del grafico settimanale
  const fetchWeeklyData = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/links/${shortCode}/weekly-stats?year=${year}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
      }

      const data = await response.json();

      // Trasforma i dati per il grafico
      const transformedData: WeeklyDataPoint[] = data.map((item: any) => {
        const [yearStr, weekStr] = item.settimana.split('-');
        const weekNumber = parseInt(weekStr);
        
        // Determina se è la settimana corrente
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        
        // Calcola la settimana corrente (ISO week)
        const startOfYear = new Date(currentYear, 0, 4); // 4 gennaio per seguire ISO 8601
        const startOfWeek = new Date(startOfYear.getTime() - (startOfYear.getDay() - 1) * 24 * 60 * 60 * 1000);
        const daysSinceStart = Math.floor((currentDate.getTime() - startOfWeek.getTime()) / (24 * 60 * 60 * 1000));
        const currentWeek = Math.floor(daysSinceStart / 7) + 1;
        
        const isCurrentWeek = year === currentYear && weekNumber === currentWeek;

        return {
          settimana: item.settimana,
          settimana_display: `S${weekNumber}`, // Formato breve per l'asse X
          numero_di_click: parseInt(item.numero_di_click) || 0,
          numero_di_click_unici: parseInt(item.numero_di_click_unici) || 0,
          isCurrentWeek: isCurrentWeek
        };
      });

      setChartData(transformedData);
      
      // Debug: log per verificare i dati
      console.log('WeeklyChart - Dati aggiornati:', transformedData);
      console.log('WeeklyChart - Settimana corrente dovrebbe essere evidenziata');
    } catch (err) {
      console.error('Errore nel caricamento dei dati settimanali:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  // Effetto per caricare i dati quando cambiano i parametri
  useEffect(() => {
    if (shortCode && year && triggerRefresh !== undefined) {
      fetchWeeklyData();
    }
  }, [shortCode, year, triggerRefresh]);

  // Componente di loading
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
            Statistiche Settimanali
          </h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
            <span className="text-gray-600">Caricamento grafico settimanale...</span>
          </div>
        </div>
      </div>
    );
  }

  // Componente di errore
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
            Statistiche Settimanali
          </h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 mb-2">⚠️ Errore</div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={fetchWeeklyData}
              className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
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
      <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
            Statistiche Settimanali
          </h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Nessun dato disponibile per l'anno {year}</p>
          </div>
        </div>
      </div>
    );
  }

  // Calcola le statistiche di riepilogo
  const totalClicks = chartData.reduce((sum, item) => sum + item.numero_di_click, 0);
  const uniqueClicks = chartData.reduce((sum, item) => sum + item.numero_di_click_unici, 0);

  // Funzione per determinare se una barra è della settimana corrente
  const isCurrentWeek = (dataPoint: WeeklyDataPoint) => {
    return dataPoint.isCurrentWeek === true;
  };

  // Tooltip personalizzato
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Trova i dati completi per questo punto
      const dataPoint = chartData.find(item => item.settimana_display === label);
      const isCurrent = dataPoint ? isCurrentWeek(dataPoint) : false;
      
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-xl">
          <p className="font-semibold text-gray-900 mb-2 text-sm flex items-center">
            Settimana {label?.replace('S', '')} - {year}
            {isCurrent && (
              <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                Corrente
              </span>
            )}
          </p>
          <div className="space-y-2">
            <p className="flex items-center text-sm text-gray-800">
              <span className={`w-3 h-3 rounded-full mr-2 ${isCurrent ? 'bg-purple-900' : 'bg-purple-500'}`}></span>
              <span className="text-gray-700">Click Totali:</span>
              <span className="font-bold text-gray-900 ml-1">{payload[0].value}</span>
            </p>
            <p className="flex items-center text-sm text-gray-800">
              <span className={`w-3 h-3 rounded-full mr-2 ${isCurrent ? 'bg-orange-900' : 'bg-orange-500'}`}></span>
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
    <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
      {/* Header del grafico */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
            Statistiche Settimanali
          </h3>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={year}
              onChange={(e) => onYearChange(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm bg-white"
            >
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(yearOption => (
                <option key={yearOption} value={yearOption}>{yearOption}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Statistiche di riepilogo */}
        <div className="flex space-x-4 mt-3 sm:mt-0">
          <div className="text-center">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Totale Anno</div>
            <div className="text-lg font-bold text-purple-600">{totalClicks.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unici Anno</div>
            <div className="text-lg font-bold text-orange-600">{uniqueClicks.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Grafico a colonne */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            key={`weekly-chart-${year}-${chartData.length}-${Date.now()}`}
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="settimana_display" 
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={Math.max(0, Math.floor(chartData.length / 20))} // Mostra solo alcune etichette per evitare sovrapposizione
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => Math.round(value).toString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="numero_di_click" 
              name="Click Totali"
            >
              {chartData.map((entry, index) => {
                const color = entry.isCurrentWeek ? "#581c87" : "#a855f7";
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={color} 
                  />
                );
              })}
            </Bar>
            <Bar 
              dataKey="numero_di_click_unici" 
              name="Click Unici"
            >
              {chartData.map((entry, index) => {
                const color = entry.isCurrentWeek ? "#9a3412" : "#f97316";
                return (
                  <Cell 
                    key={`cell-unique-${index}`} 
                    fill={color} 
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WeeklyChart;
