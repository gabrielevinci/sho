'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';

type TimeSeriesData = {
  date: string;
  clicks: number;
};

interface ClicksTrendChartProps {
  data: TimeSeriesData[];
  totalClicks: number;
  filterType?: string;
  dateRange?: { startDate: string; endDate: string };
}

// Componente personalizzato per il tooltip
const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (active && payload && payload.length && label) {
    // Formatta la label in base al contesto
    const date = new Date(label);
    const isHour = label.includes('T') || label.includes(':');
    const formattedLabel = isHour 
      ? date.toLocaleString('it-IT', { 
          hour: '2-digit', 
          minute: '2-digit',
          day: '2-digit',
          month: 'short'
        })
      : date.toLocaleDateString('it-IT', { 
          day: '2-digit', 
          month: 'short',
          weekday: 'short'
        });

    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-2">
          {formattedLabel}
        </p>
        <p className="text-blue-600">
          <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
          Click: <span className="font-semibold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function ClicksTrendChart({ data, totalClicks, filterType = 'all', dateRange }: ClicksTrendChartProps) {
  
  // Funzione per generare il titolo dinamico
  const getChartTitle = () => {
    switch (filterType) {
      case 'today':
        return 'Andamento Click (Oggi)';
      case 'week':
        return 'Andamento Click (Ultima Settimana)';
      case 'month':
        return 'Andamento Click (Ultimo Mese)';
      case '3months':
        return 'Andamento Click (Ultimi 3 Mesi)';
      case 'year':
        return 'Andamento Click (Ultimo Anno)';
      case 'custom':
        if (dateRange?.startDate && dateRange?.endDate) {
          const start = new Date(dateRange.startDate).toLocaleDateString('it-IT');
          const end = new Date(dateRange.endDate).toLocaleDateString('it-IT');
          return `Andamento Click (${start} - ${end})`;
        }
        return 'Andamento Click (Periodo Personalizzato)';
      case 'all':
      default:
        return 'Andamento Click (Tutti i Dati)';
    }
  };

  // Formattatore per l'asse X basato sul tipo di filtro
  const formatXAxisDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (filterType === 'today') {
      return date.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit'
      });
    }
    
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: 'short'
    });
  };
  // Calcolo delle statistiche per la sezione header basate sul filtro attivo
  const getStatistics = () => {
    if (data.length === 0) {
      return {
        maxClicks: 0,
        avgClicks: '0',
        trend: 0,
        trendLabel: 'Trend'
      };
    }

    const maxClicks = Math.max(...data.map(d => d.clicks));
    
    // Calcola la media in base al periodo
    let avgClicks = '0';
    let trendLabel = 'Trend';
    let trend = 0;

    switch (filterType) {
      case 'today':
        avgClicks = (totalClicks / Math.max(data.length, 1)).toFixed(1);
        trendLabel = 'Ultima ora';
        // Confronta ultima ora con penultima
        if (data.length >= 2) {
          trend = data[data.length - 1].clicks - data[data.length - 2].clicks;
        }
        break;
        
      case 'week':
        avgClicks = (totalClicks / 7).toFixed(1);
        trendLabel = 'vs ieri';
        // Confronta oggi con ieri
        if (data.length >= 2) {
          trend = data[data.length - 1].clicks - data[data.length - 2].clicks;
        }
        break;
        
      case 'month':
        avgClicks = (totalClicks / 30).toFixed(1);
        trendLabel = 'Settimana';
        // Confronta ultima settimana con precedente
        if (data.length >= 14) {
          const lastWeek = data.slice(-7).reduce((sum, d) => sum + d.clicks, 0);
          const prevWeek = data.slice(-14, -7).reduce((sum, d) => sum + d.clicks, 0);
          trend = lastWeek - prevWeek;
        }
        break;
        
      case '3months':
        avgClicks = (totalClicks / 90).toFixed(1);
        trendLabel = 'Ultimo mese';
        // Confronta ultimo mese con precedente
        if (data.length >= 60) {
          const lastMonth = data.slice(-30).reduce((sum, d) => sum + d.clicks, 0);
          const prevMonth = data.slice(-60, -30).reduce((sum, d) => sum + d.clicks, 0);
          trend = lastMonth - prevMonth;
        }
        break;
        
      case 'year':
        avgClicks = (totalClicks / 365).toFixed(1);
        trendLabel = 'Ultimo trim.';
        // Confronta ultimo trimestre con precedente
        if (data.length >= 180) {
          const lastQuarter = data.slice(-90).reduce((sum, d) => sum + d.clicks, 0);
          const prevQuarter = data.slice(-180, -90).reduce((sum, d) => sum + d.clicks, 0);
          trend = lastQuarter - prevQuarter;
        }
        break;
        
      default:
        avgClicks = data.length > 0 ? (totalClicks / data.length).toFixed(1) : '0';
        trendLabel = 'Generale';
        if (data.length >= 7) {
          const recent = data.slice(-7).reduce((sum, d) => sum + d.clicks, 0);
          const previous = data.slice(-14, -7).reduce((sum, d) => sum + d.clicks, 0);
          trend = recent - previous;
        }
    }

    return {
      maxClicks,
      avgClicks,
      trend,
      trendLabel
    };
  };

  const statistics = getStatistics();

  // Formattiamo i dati per far visualizzare solo alcune etichette sull'asse X
  const formattedData = data.map((item, index) => {
    let shouldShowLabel = false;
    
    // Logica più intelligente per mostrare le etichette
    switch (filterType) {
      case 'today':
        // Per oggi, mostra ogni 3 ore (se ci sono 24 punti)
        shouldShowLabel = index % Math.max(1, Math.floor(data.length / 8)) === 0;
        break;
      case 'week':
        // Per settimana, mostra tutti i giorni
        shouldShowLabel = true;
        break;
      case 'month':
        // Per mese, mostra ogni 5 giorni circa
        shouldShowLabel = index % Math.max(1, Math.floor(data.length / 6)) === 0;
        break;
      case '3months':
      case 'year':
        // Per periodi lunghi, mostra meno etichette
        shouldShowLabel = index % Math.max(1, Math.floor(data.length / 8)) === 0;
        break;
      default:
        // Default: mostra ogni 5° elemento
        shouldShowLabel = index % 5 === 0;
    }
    
    // Assicurati sempre di mostrare la prima e l'ultima etichetta
    if (index === 0 || index === data.length - 1) {
      shouldShowLabel = true;
    }
    
    return {
      ...item,
      displayDate: shouldShowLabel ? formatXAxisDate(item.date) : ''
    };
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header della sezione */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {getChartTitle()}
          </h3>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{statistics.maxClicks}</div>
            <div className="text-gray-500">Picco</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{statistics.avgClicks}</div>
            <div className="text-gray-500">Media{filterType === 'today' ? '/ora' : '/giorno'}</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold flex items-center ${statistics.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`h-4 w-4 mr-1 ${statistics.trend < 0 ? 'rotate-180' : ''}`} />
              {statistics.trend >= 0 ? '+' : ''}{statistics.trend}
            </div>
            <div className="text-gray-500">{statistics.trendLabel}</div>
          </div>
        </div>
      </div>

      {/* Grafico */}
      <div className="h-80">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="displayDate"
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="clicks" 
                stroke="#3b82f6" 
                strokeWidth={2.5}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nessun dato disponibile</p>
              <p className="text-sm">I dati dei click appariranno qui quando disponibili per il periodo selezionato</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
