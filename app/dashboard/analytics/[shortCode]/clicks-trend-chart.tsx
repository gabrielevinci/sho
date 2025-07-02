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
}

// Formattatore personalizzato per le date nel tooltip
const formatTooltipDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT', { 
    day: '2-digit', 
    month: 'short',
    weekday: 'short'
  });
};

// Formattatore per l'asse X (mostra solo alcune date)
const formatXAxisDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT', { 
    day: '2-digit', 
    month: 'short'
  });
};

// Componente personalizzato per il tooltip
const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-2">
          {formatTooltipDate(label || '')}
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

export default function ClicksTrendChart({ data, totalClicks }: ClicksTrendChartProps) {
  // Calcolo delle statistiche per la sezione header
  const maxDailyClicks = Math.max(...data.map(d => d.clicks));
  const avgDailyClicks = totalClicks > 0 ? (totalClicks / 30).toFixed(1) : '0';
  const recentTrend = data.length >= 7 ? 
    data.slice(-7).reduce((sum, d) => sum + d.clicks, 0) - 
    data.slice(-14, -7).reduce((sum, d) => sum + d.clicks, 0) : 0;

  // Formattiamo i dati per far visualizzare solo alcune etichette sull'asse X
  const formattedData = data.map((item, index) => ({
    ...item,
    displayDate: index % 5 === 0 ? formatXAxisDate(item.date) : ''
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header della sezione */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Andamento Click (Ultimi 30 giorni)
          </h3>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{maxDailyClicks}</div>
            <div className="text-gray-500">Picco</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{avgDailyClicks}</div>
            <div className="text-gray-500">Media/giorno</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold flex items-center ${recentTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`h-4 w-4 mr-1 ${recentTrend < 0 ? 'rotate-180' : ''}`} />
              {recentTrend >= 0 ? '+' : ''}{recentTrend}
            </div>
            <div className="text-gray-500">Settimana</div>
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
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="displayDate"
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="clicks" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nessun dato disponibile</p>
              <p className="text-sm">I dati dei click appariranno qui quando disponibili</p>
            </div>
          </div>
        )}
      </div>

      {/* Note aggiuntive */}
      <div className="mt-4 text-xs text-gray-500 border-t pt-4">
        <p>
          • Il grafico mostra i click giornalieri degli ultimi 30 giorni
          • La tendenza settimanale confronta gli ultimi 7 giorni con i 7 precedenti
          • Passa il mouse sui punti per vedere i dettagli
        </p>
      </div>
    </div>
  );
}
