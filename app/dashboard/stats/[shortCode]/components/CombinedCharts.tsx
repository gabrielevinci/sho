import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, BarChart3 } from 'lucide-react';

// Importa i tipi dalle interfacce esistenti
interface MonthlyDataPoint {
  mese: string;
  mese_nome: string;
  mese_completo: string;
  numero_di_click: number;
  numero_di_click_unici: number;
  isCurrentMonth?: boolean;
}

interface WeeklyDataPoint {
  settimana: string;
  inizio_settimana: string;
  fine_settimana: string;
  settimana_display: string;
  numero_di_click: number;
  numero_di_click_unici: number;
  isCurrentWeek?: boolean;
}

interface CombinedChartsProps {
  shortCode: string;
  triggerRefresh?: number;
}

const CombinedCharts: React.FC<CombinedChartsProps> = ({ shortCode, triggerRefresh }) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Stati per il grafico mensile
  const [monthlyData, setMonthlyData] = useState<MonthlyDataPoint[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);
  
  // Stati per il grafico settimanale
  const [weeklyData, setWeeklyData] = useState<WeeklyDataPoint[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  // Funzione per recuperare i dati mensili
  const fetchMonthlyData = async () => {
    setMonthlyLoading(true);
    setMonthlyError(null);

    try {
      const url = `/api/links/${shortCode}/monthly-stats?year=${selectedYear}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
      }

      const data = await response.json();
      const transformedData: MonthlyDataPoint[] = data.map((item: any) => {
        const [yearStr, monthStr] = item.mese.split('-');
        const monthNumber = parseInt(monthStr);
        
        const monthNames = [
          'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
          'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
        ];

        const fullMonthNames = [
          'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
          'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
        ];

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const isCurrentMonth = selectedYear === currentYear && monthNumber === currentMonth;

        return {
          mese: item.mese,
          mese_nome: monthNames[monthNumber - 1],
          mese_completo: fullMonthNames[monthNumber - 1],
          numero_di_click: parseInt(item.numero_di_click) || 0,
          numero_di_click_unici: parseInt(item.numero_di_click_unici) || 0,
          isCurrentMonth: isCurrentMonth
        };
      });

      setMonthlyData(transformedData);
    } catch (err) {
      setMonthlyError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setMonthlyLoading(false);
    }
  };

  // Funzione per recuperare i dati settimanali
  const fetchWeeklyData = async () => {
    setWeeklyLoading(true);
    setWeeklyError(null);

    try {
      const url = `/api/links/${shortCode}/weekly-stats?year=${selectedYear}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
      }

      const data = await response.json();
      const transformedData: WeeklyDataPoint[] = data.map((item: any) => {
        const [yearStr, weekStr] = item.settimana.split('-');
        const weekNumber = parseInt(weekStr);
        
        const currentDate = new Date();
        const startDate = new Date(item.inizio_settimana + 'T00:00:00');
        const endDate = new Date(item.fine_settimana + 'T23:59:59');
        const isCurrentWeek = currentDate >= startDate && currentDate <= endDate;

        return {
          settimana: item.settimana,
          inizio_settimana: item.inizio_settimana,
          fine_settimana: item.fine_settimana,
          settimana_display: `S${weekNumber}`,
          numero_di_click: parseInt(item.numero_di_click) || 0,
          numero_di_click_unici: parseInt(item.numero_di_click_unici) || 0,
          isCurrentWeek: isCurrentWeek
        };
      });

      setWeeklyData(transformedData);
    } catch (err) {
      setWeeklyError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setWeeklyLoading(false);
    }
  };

  // Effetti per caricare i dati
  useEffect(() => {
    if (shortCode && selectedYear) {
      fetchMonthlyData();
      fetchWeeklyData();
    }
  }, [shortCode, selectedYear]);

  // Tooltip personalizzato per il grafico mensile
  const MonthlyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = monthlyData.find(item => item.mese_nome === label);
      const isCurrent = dataPoint?.isCurrentMonth;
      
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-xl">
          <p className="font-semibold text-gray-900 mb-2 text-sm flex items-center">
            {dataPoint?.mese_completo || label} {selectedYear}
            {isCurrent && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                Corrente
              </span>
            )}
          </p>
          <div className="space-y-2">
            <p className="flex items-center text-sm text-gray-800">
              <span className={`w-3 h-3 rounded-full mr-2 ${isCurrent ? 'bg-blue-900' : 'bg-blue-500'}`}></span>
              <span className="text-gray-700">Click Totali:</span>
              <span className="font-bold text-gray-900 ml-1">{payload[0].value}</span>
            </p>
            <p className="flex items-center text-sm text-gray-800">
              <span className={`w-3 h-3 rounded-full mr-2 ${isCurrent ? 'bg-green-900' : 'bg-green-500'}`}></span>
              <span className="text-gray-700">Click Unici:</span>
              <span className="font-bold text-gray-900 ml-1">{payload[1].value}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Tooltip personalizzato per il grafico settimanale
  const WeeklyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = weeklyData.find(item => item.settimana_display === label);
      const isCurrent = dataPoint?.isCurrentWeek;
      
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('it-IT', {
          day: '2-digit',
          month: 'short'
        });
      };
      
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-xl">
          <p className="font-semibold text-gray-900 mb-2 text-sm flex items-center">
            Settimana {label?.replace('S', '')} - {selectedYear}
            {isCurrent && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                Corrente
              </span>
            )}
          </p>
          {dataPoint && (
            <p className="text-xs text-gray-600 mb-3">
              {formatDate(dataPoint.inizio_settimana)} - {formatDate(dataPoint.fine_settimana)}
            </p>
          )}
          <div className="space-y-2">
            <p className="flex items-center text-sm text-gray-800">
              <span className={`w-3 h-3 rounded-full mr-2 ${isCurrent ? 'bg-blue-900' : 'bg-blue-500'}`}></span>
              <span className="text-gray-700">Click Totali:</span>
              <span className="font-bold text-gray-900 ml-1">{payload[0].value}</span>
            </p>
            <p className="flex items-center text-sm text-gray-800">
              <span className={`w-3 h-3 rounded-full mr-2 ${isCurrent ? 'bg-green-900' : 'bg-green-500'}`}></span>
              <span className="text-gray-700">Click Unici:</span>
              <span className="font-bold text-gray-900 ml-1">{payload[1].value}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calcola le statistiche di riepilogo per entrambi i grafici
  const monthlyTotalClicks = monthlyData.reduce((sum, item) => sum + item.numero_di_click, 0);
  const monthlyUniqueClicks = monthlyData.reduce((sum, item) => sum + item.numero_di_click_unici, 0);
  const weeklyTotalClicks = weeklyData.reduce((sum, item) => sum + item.numero_di_click, 0);
  const weeklyUniqueClicks = weeklyData.reduce((sum, item) => sum + item.numero_di_click_unici, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
      {/* Header del grafico */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
            Andamento per periodo
          </h3>
          
          {/* Selettore dell'anno */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-white"
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
            <div className="text-lg font-bold text-blue-600">{monthlyTotalClicks.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unici Anno</div>
            <div className="text-lg font-bold text-green-600">{monthlyUniqueClicks.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Grafico Mensile */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-gray-800 flex items-center">
            <BarChart3 className="h-4 w-4 mr-2 text-blue-600" />
            Mesi
          </h4>
        </div>

        {/* Loading mensile */}
        {monthlyLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-gray-600">Caricamento statistiche mensili...</span>
            </div>
          </div>
        )}

        {/* Errore mensile */}
        {monthlyError && !monthlyLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 mb-2">⚠️ Errore</div>
              <p className="text-gray-600">{monthlyError}</p>
              <button
                onClick={fetchMonthlyData}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Riprova
              </button>
            </div>
          </div>
        )}

        {/* Grafico mensile */}
        {!monthlyLoading && !monthlyError && monthlyData.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
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
                  height={60}
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
                <Tooltip content={<MonthlyTooltip />} />
                <Bar dataKey="numero_di_click" name="Click Totali">
                  {monthlyData.map((entry, index) => {
                    const color = entry.isCurrentMonth ? "#1e3a8a" : "#3b82f6";
                    return <Cell key={`monthly-cell-${index}`} fill={color} />;
                  })}
                </Bar>
                <Bar dataKey="numero_di_click_unici" name="Click Unici">
                  {monthlyData.map((entry, index) => {
                    const color = entry.isCurrentMonth ? "#14532d" : "#10b981";
                    return <Cell key={`monthly-cell-unique-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {!monthlyLoading && !monthlyError && monthlyData.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Nessun dato mensile per l'anno {selectedYear}</p>
            </div>
          </div>
        )}
      </div>

      {/* Grafico Settimanale */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-gray-800 flex items-center">
            <BarChart3 className="h-4 w-4 mr-2 text-blue-600" />
            Settimane
          </h4>
        </div>

        {/* Loading settimanale */}
        {weeklyLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-gray-600">Caricamento statistiche settimanali...</span>
            </div>
          </div>
        )}

        {/* Errore settimanale */}
        {weeklyError && !weeklyLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 mb-2">⚠️ Errore</div>
              <p className="text-gray-600">{weeklyError}</p>
              <button
                onClick={fetchWeeklyData}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Riprova
              </button>
            </div>
          </div>
        )}

        {/* Grafico settimanale */}
        {!weeklyLoading && !weeklyError && weeklyData.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyData}
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
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
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
                <Tooltip content={<WeeklyTooltip />} />
                <Bar dataKey="numero_di_click" name="Click Totali">
                  {weeklyData.map((entry, index) => {
                    const color = entry.isCurrentWeek ? "#1e3a8a" : "#3b82f6";
                    return <Cell key={`weekly-cell-${index}`} fill={color} />;
                  })}
                </Bar>
                <Bar dataKey="numero_di_click_unici" name="Click Unici">
                  {weeklyData.map((entry, index) => {
                    const color = entry.isCurrentWeek ? "#14532d" : "#10b981";
                    return <Cell key={`weekly-cell-unique-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {!weeklyLoading && !weeklyError && weeklyData.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Nessun dato settimanale per l'anno {selectedYear}</p>
            </div>
          </div>
        )}
      </div>

      {/* Leggenda minimale */}
      <div className="flex justify-center mt-4">
        <div className="flex items-center space-x-4 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
            <span>Click Totali</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
            <span>Click Unici</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombinedCharts;
