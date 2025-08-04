import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, BarChart3 } from 'lucide-react';

interface MonthlyDataPoint {
  mese: string;
  mese_nome: string;
  numero_di_click: number;
  numero_di_click_unici: number;
}

interface MonthlyChartProps {
  shortCode: string;
  year: number;
  triggerRefresh?: number;
}

const MonthlyChart: React.FC<MonthlyChartProps> = ({ shortCode, year, triggerRefresh }) => {
  const [chartData, setChartData] = useState<MonthlyDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Funzione per recuperare i dati del grafico mensile
  const fetchMonthlyData = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/links/${shortCode}/monthly-stats?year=${year}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
      }

      const data = await response.json();

      // Trasforma i dati per il grafico
      const transformedData: MonthlyDataPoint[] = data.map((item: any) => {
        const [yearStr, monthStr] = item.mese.split('-');
        const monthNumber = parseInt(monthStr);
        
        // Nomi dei mesi in italiano
        const monthNames = [
          'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
          'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
        ];

        return {
          mese: item.mese,
          mese_nome: monthNames[monthNumber - 1],
          numero_di_click: parseInt(item.numero_di_click) || 0,
          numero_di_click_unici: parseInt(item.numero_di_click_unici) || 0
        };
      });

      setChartData(transformedData);
    } catch (err) {
      console.error('Errore nel caricamento dei dati mensili:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  // Effetto per caricare i dati quando cambiano i parametri
  useEffect(() => {
    if (shortCode && year && triggerRefresh !== undefined) {
      fetchMonthlyData();
    }
  }, [shortCode, year, triggerRefresh]);

  // Componente di loading
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
            Statistiche Mensili {year}
          </h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-gray-600">Caricamento grafico mensile...</span>
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
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
            Statistiche Mensili {year}
          </h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 mb-2">⚠️ Errore</div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={fetchMonthlyData}
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
      <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
            Statistiche Mensili {year}
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
    <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
      {/* Header del grafico */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
            Statistiche Mensili {year}
          </h3>
        </div>
        
        {/* Statistiche di riepilogo */}
        <div className="flex space-x-4 mt-3 sm:mt-0">
          <div className="text-center">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Totale Anno</div>
            <div className="text-lg font-bold text-blue-600">{totalClicks.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unici Anno</div>
            <div className="text-lg font-bold text-green-600">{uniqueClicks.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Grafico a colonne */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
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
              dataKey="mese_nome" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
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
              fill="#3b82f6" 
              name="Click Totali"
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              dataKey="numero_di_click_unici" 
              fill="#10b981" 
              name="Click Unici"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyChart;
