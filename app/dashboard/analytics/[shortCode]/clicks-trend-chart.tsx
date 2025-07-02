'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
  
  // Funzione per generare il titolo dinamico basato sul filtro attuale
  const getChartTitle = () => {
    switch (filterType) {
      case 'today':
        return 'Andamento Temporale (Oggi)';
      case 'week':
        return 'Andamento Temporale (Ultima Settimana)';
      case 'month':
        return 'Andamento Temporale (Ultimo Mese)';
      case '3months':
        return 'Andamento Temporale (Ultimi 3 Mesi)';
      case 'year':
        return 'Andamento Temporale (Ultimo Anno)';
      case 'custom':
        if (dateRange?.startDate && dateRange?.endDate) {
          const start = new Date(dateRange.startDate).toLocaleDateString('it-IT');
          const end = new Date(dateRange.endDate).toLocaleDateString('it-IT');
          return `Andamento Temporale (${start} - ${end})`;
        }
        return 'Andamento Temporale (Periodo Personalizzato)';
      case 'all':
      default:
        return 'Andamento Temporale (Ultimi 30 giorni)';
    }
  };

  // Funzioni per calcolare le statistiche avanzate con algoritmi professionali
  const calculateAdvancedStats = () => {
    if (data.length === 0) {
      return { peak: 0, average: 0, trend: 'stabile', prediction: 0, confidence: 0 };
    }

    const clicks = data.map(d => d.clicks);
    
    // Calcola il picco (massimo numero di click)
    const peak = Math.max(...clicks);

    // Calcola la media dei click
    const totalClicks = clicks.reduce((sum, c) => sum + c, 0);
    const average = Math.round((totalClicks / clicks.length) * 100) / 100;

    // Algoritmo di regressione lineare con analisi della tendenza avanzata
    const n = clicks.length;
    if (n < 3) {
      return { peak, average, trend: 'stabile', prediction: Math.round(average), confidence: 0 };
    }

    // Prepara i dati per la regressione lineare (x = indice temporale, y = clicks)
    const xValues = Array.from({ length: n }, (_, i) => i);
    const yValues = clicks;

    // Calcola medie
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;

    // Calcola coefficienti della regressione lineare (y = a + bx)
    let numerator = 0;
    let denominator = 0;
    let ssRes = 0; // Somma dei quadrati dei residui
    let ssTot = 0; // Somma totale dei quadrati

    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
      denominator += (xValues[i] - xMean) ** 2;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // Calcola R² (coefficiente di determinazione) per misurare la qualità del fit
    for (let i = 0; i < n; i++) {
      const predicted = intercept + slope * xValues[i];
      ssRes += (yValues[i] - predicted) ** 2;
      ssTot += (yValues[i] - yMean) ** 2;
    }

    const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
    const confidence = Math.max(0, Math.min(100, Math.round(rSquared * 100)));

    // Media mobile esponenziale per smoother trend detection
    const alpha = 0.3; // Fattore di smoothing
    let ema = yValues[0];
    const emaValues = [ema];
    
    for (let i = 1; i < yValues.length; i++) {
      ema = alpha * yValues[i] + (1 - alpha) * ema;
      emaValues.push(ema);
    }

    // Calcola la tendenza basata su più fattori
    const recentPeriod = Math.min(7, Math.floor(n / 3)); // Ultimi 7 giorni o 1/3 del periodo
    const recentAvg = yValues.slice(-recentPeriod).reduce((sum, c) => sum + c, 0) / recentPeriod;
    const earlierAvg = yValues.slice(0, recentPeriod).reduce((sum, c) => sum + c, 0) / recentPeriod;
    const percentChange = earlierAvg !== 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;

    // Determina la tendenza usando multiple metriche
    let trend = 'stabile';
    const slopeThreshold = Math.max(0.1, average * 0.05); // Soglia dinamica basata sulla media
    
    if (slope > slopeThreshold && percentChange > 10) {
      trend = 'crescente';
    } else if (slope < -slopeThreshold && percentChange < -10) {
      trend = 'decrescente';
    }

    // Previsione usando combinazione di regressione lineare e media mobile
    const linearPrediction = intercept + slope * n;
    const emaPrediction = emaValues[emaValues.length - 1];
    const weightedPrediction = (linearPrediction * 0.7) + (emaPrediction * 0.3);
    
    // Applica limiti realistici alla previsione
    const prediction = Math.max(0, Math.round(weightedPrediction));

    return { 
      peak, 
      average, 
      trend, 
      prediction,
      confidence,
      slope: Math.round(slope * 100) / 100,
      percentChange: Math.round(percentChange * 10) / 10
    };
  };

  const stats = calculateAdvancedStats();

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
        <div className="flex items-center space-x-6 text-sm">
          {/* Statistiche avanzate */}
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">{stats.peak}</div>
            <div className="text-gray-500">Picco</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{stats.average}</div>
            <div className="text-gray-500">Media</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold flex items-center justify-center space-x-1 ${
              stats.trend === 'crescente' ? 'text-green-600' : 
              stats.trend === 'decrescente' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {stats.trend === 'crescente' ? <TrendingUp className="h-4 w-4" /> : 
               stats.trend === 'decrescente' ? <TrendingDown className="h-4 w-4" /> : 
               <Minus className="h-4 w-4" />}
              <span>{stats.prediction}</span>
            </div>
            <div className="text-gray-500" title={`Previsione basata su analisi statistica (${stats.confidence}% affidabilità)`}>
              Tendenza
            </div>
          </div>
          {/* Statistiche periodo fisse */}
          <div className="border-l border-gray-200 pl-6 flex items-center space-x-4">
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
