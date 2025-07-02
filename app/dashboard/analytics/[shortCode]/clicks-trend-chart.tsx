'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar } from 'lucide-react';

type TimeSeriesData = {
  date: string;
  clicks: number;
};

interface ClicksTrendChartProps {
  data: TimeSeriesData[];
  filterType?: string;
  dateRange?: { startDate: string; endDate: string };
  clicksToday: number;
  clicksThisWeek: number;
  clicksThisMonth: number;
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

export default function ClicksTrendChart({ 
  data, 
  filterType = 'all', 
  dateRange,
  clicksToday,
  clicksThisWeek,
  clicksThisMonth
}: ClicksTrendChartProps) {
  
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
  // Statistiche fisse indipendenti dai filtri
  const statistics = {
    today: clicksToday,
    week: clicksThisWeek, 
    month: clicksThisMonth
  };

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
            <div className="text-lg font-bold text-gray-900">{statistics.today}</div>
            <div className="text-gray-500">Oggi</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{statistics.week}</div>
            <div className="text-gray-500">Ultimi 7 giorni</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{statistics.month}</div>
            <div className="text-gray-500">Ultimi 30 giorni</div>
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
