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
  // Dati aggiuntivi per le statistiche generali
  totalClicks: number;
  uniqueClicks: number;
  totalReferrers: number;
  totalDevices: number;
  totalCountries: number;
}

export default function ClicksTrendChart({ 
  data, 
  filterType = 'all', 
  dateRange,
  totalClicks = 0,
  uniqueClicks = 0,
  totalReferrers = 0,
  totalDevices = 0,
  totalCountries = 0
}: ClicksTrendChartProps) {
  
  // Componente personalizzato per il tooltip interno al componente
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length && label) {
      // Trova il dato originale per ottenere la data completa
      const originalItem = data.find((item: TimeSeriesData) => item.date === label);
      if (!originalItem) return null;

      // Formatta la label in base al filtro attivo
      const date = new Date(originalItem.date);
      let formattedLabel = '';
      
      switch (filterType) {
        case 'today':
          formattedLabel = date.toLocaleString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit',
            day: '2-digit',
            month: 'short'
          });
          break;
        case 'week':
          formattedLabel = date.toLocaleDateString('it-IT', { 
            weekday: 'long',
            day: '2-digit', 
            month: 'long'
          });
          break;
        case 'month':
        case '3months':
          formattedLabel = date.toLocaleDateString('it-IT', { 
            day: '2-digit', 
            month: 'long',
            year: 'numeric'
          });
          break;
        case 'year':
          formattedLabel = date.toLocaleDateString('it-IT', { 
            month: 'long',
            year: 'numeric'
          });
          break;
        case 'custom':
        case 'all':
        default:
          formattedLabel = date.toLocaleDateString('it-IT', { 
            day: '2-digit', 
            month: 'long',
            year: 'numeric'
          });
          break;
      }

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

    // Filtra i dati in base al filtro selezionato
    const getFilteredData = () => {
      const now = new Date();
      let filteredData = [...data];

      switch (filterType) {
        case 'today':
          const today = now.toISOString().split('T')[0];
          filteredData = data.filter(d => d.date === today);
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const weekAgoStr = weekAgo.toISOString().split('T')[0];
          filteredData = data.filter(d => d.date >= weekAgoStr);
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          const monthAgoStr = monthAgo.toISOString().split('T')[0];
          filteredData = data.filter(d => d.date >= monthAgoStr);
          break;
        case '3months':
          const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];
          filteredData = data.filter(d => d.date >= threeMonthsAgoStr);
          break;
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          const yearAgoStr = yearAgo.toISOString().split('T')[0];
          filteredData = data.filter(d => d.date >= yearAgoStr);
          break;
        case 'custom':
          if (dateRange?.startDate && dateRange?.endDate) {
            filteredData = data.filter(d => 
              d.date >= dateRange.startDate && d.date <= dateRange.endDate
            );
          }
          break;
        case 'all':
        default:
          // Usa tutti i dati disponibili
          break;
      }

      return filteredData.length > 0 ? filteredData : data;
    };

    const filteredData = getFilteredData();
    const clicks = filteredData.map(d => d.clicks);
    
    // Calcola il picco (massimo numero di click nel periodo filtrato)
    const peak = Math.max(...clicks);

    // Calcola la media dei click in base al filtro selezionato
    const getAverageForFilter = () => {
      switch (filterType) {
        case 'today':
          // Media oraria per oggi: click del giorno corrente / 24 ore
          const todayStr = new Date().toISOString().split('T')[0];
          const todayData = data.filter(d => d.date === todayStr);
          const todayClicks = todayData.reduce((sum, d) => sum + d.clicks, 0);
          return Math.round((todayClicks / 24) * 100) / 100;
          
        case 'week':
          // Click totali nell'ultima settimana / 7 giorni
          const weekClicks = filteredData.reduce((sum, d) => sum + d.clicks, 0);
          return Math.round((weekClicks / 7) * 100) / 100;
          
        case 'month':
          // Click degli ultimi 30 giorni / 30 giorni
          const monthClicks = filteredData.reduce((sum, d) => sum + d.clicks, 0);
          return Math.round((monthClicks / 30) * 100) / 100;
          
        case '3months':
          // Click degli ultimi 3 mesi / 90 giorni
          const quarterClicks = filteredData.reduce((sum, d) => sum + d.clicks, 0);
          return Math.round((quarterClicks / 90) * 100) / 100;
          
        case 'year':
          // Click dell'ultimo anno / 365 giorni
          const yearClicks = filteredData.reduce((sum, d) => sum + d.clicks, 0);
          return Math.round((yearClicks / 365) * 100) / 100;
          
        case 'custom':
          // Click del periodo personalizzato / numero di giorni nel periodo
          const customClicks = filteredData.reduce((sum, d) => sum + d.clicks, 0);
          const customDays = filteredData.length;
          return customDays > 0 ? Math.round((customClicks / customDays) * 100) / 100 : 0;
          
        case 'all':
        default:
          // Click totali / (data di oggi - data di creazione del primo link)
          const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0);
          const firstDate = new Date(data[0]?.date || new Date());
          const currentDate = new Date();
          const daysDiff = Math.max(1, Math.ceil((currentDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
          return Math.round((totalClicks / daysDiff) * 100) / 100;
      }
    };

    const average = getAverageForFilter();

    // Algoritmo di regressione lineare con analisi della tendenza avanzata
    const n = clicks.length;
    if (n < 2) {
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
    const recentPeriod = Math.min(Math.max(2, Math.floor(n / 3)), 7); // Almeno 2, massimo 7 punti
    const recentAvg = yValues.slice(-recentPeriod).reduce((sum, c) => sum + c, 0) / recentPeriod;
    const earlierAvg = yValues.slice(0, recentPeriod).reduce((sum, c) => sum + c, 0) / recentPeriod;
    const percentChange = earlierAvg !== 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;

    // Determina la tendenza usando multiple metriche
    let trend = 'stabile';
    const slopeThreshold = Math.max(0.1, average * 0.05); // Soglia dinamica basata sulla media
    
    if (slope > slopeThreshold && percentChange > 5) {
      trend = 'crescente';
    } else if (slope < -slopeThreshold && percentChange < -5) {
      trend = 'decrescente';
    }

    // Previsione specifica per il tipo di filtro
    const getPredictionForFilter = () => {
      switch (filterType) {
        case 'today':
          // Previsione per le prossime ore del giorno
          const hoursRemaining = 24 - new Date().getHours();
          const hourlyAverage = average / 24;
          const hourlyTrend = slope / 24;
          return Math.max(0, Math.round(hourlyAverage * hoursRemaining + hourlyTrend * hoursRemaining));
          
        case 'week':
          // Previsione per la prossima settimana
          const weeklyTrend = slope * 7;
          return Math.max(0, Math.round((average * 7) + weeklyTrend));
          
        case 'month':
          // Previsione per il prossimo mese
          const monthlyTrend = slope * 30;
          return Math.max(0, Math.round((average * 30) + monthlyTrend));
          
        case '3months':
          // Previsione per i prossimi 3 mesi
          const quarterlyTrend = slope * 90;
          return Math.max(0, Math.round((average * 90) + quarterlyTrend));
          
        case 'year':
          // Previsione per il prossimo anno
          const yearlyTrend = slope * 365;
          return Math.max(0, Math.round((average * 365) + yearlyTrend));
          
        case 'custom':
          // Previsione per un periodo equivalente a quello personalizzato
          const customDays = filteredData.length;
          const customTrend = slope * customDays;
          return Math.max(0, Math.round((average * customDays) + customTrend));
          
        case 'all':
        default:
          // Previsione per il prossimo mese (default)
          const defaultTrend = slope * 30;
          return Math.max(0, Math.round((average * 30) + defaultTrend));
      }
    };

    const prediction = getPredictionForFilter();

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

  // Funzione per ottenere il testo del tooltip della tendenza
  const getTrendTooltip = () => {
    const baseText = `Previsione basata su analisi statistica (${stats.confidence}% affidabilità)`;
    
    switch (filterType) {
      case 'today':
        return `${baseText} - Stima click nelle prossime ore`;
      case 'week':
        return `${baseText} - Stima click nella prossima settimana`;
      case 'month':
        return `${baseText} - Stima click nel prossimo mese`;
      case '3months':
        return `${baseText} - Stima click nei prossimi 3 mesi`;
      case 'year':
        return `${baseText} - Stima click nel prossimo anno`;
      case 'custom':
        return `${baseText} - Stima click nel prossimo periodo equivalente`;
      case 'all':
      default:
        return `${baseText} - Stima click nel prossimo mese`;
    }
  };

  const stats = calculateAdvancedStats();

  // Funzione per ottenere i dati filtrati basati sul filtro selezionato
  const getFilteredDataForChart = () => {
    const now = new Date();
    let filteredData = [...data];

    switch (filterType) {
      case 'today':
        const today = now.toISOString().split('T')[0];
        filteredData = data.filter(d => d.date === today);
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        filteredData = data.filter(d => d.date >= weekAgoStr);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const monthAgoStr = monthAgo.toISOString().split('T')[0];
        filteredData = data.filter(d => d.date >= monthAgoStr);
        break;
      case '3months':
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];
        filteredData = data.filter(d => d.date >= threeMonthsAgoStr);
        break;
      case 'year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        const yearAgoStr = yearAgo.toISOString().split('T')[0];
        filteredData = data.filter(d => d.date >= yearAgoStr);
        break;
      case 'custom':
        if (dateRange?.startDate && dateRange?.endDate) {
          filteredData = data.filter(d => 
            d.date >= dateRange.startDate && d.date <= dateRange.endDate
          );
        }
        break;
      case 'all':
      default:
        // Mostra gli ultimi 30 giorni per default
        const defaultAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const defaultAgoStr = defaultAgo.toISOString().split('T')[0];
        filteredData = data.filter(d => d.date >= defaultAgoStr);
        break;
    }

    return filteredData.length > 0 ? filteredData : data.slice(-30); // Fallback agli ultimi 30 punti
  };

  // Formattatore intelligente per l'asse X basato sul tipo di filtro e periodo
  const formatXAxisDate = (dateString: string) => {
    const date = new Date(dateString);
    
    switch (filterType) {
      case 'today':
        // Per oggi, mostra ora:minuti
        return date.toLocaleTimeString('it-IT', { 
          hour: '2-digit', 
          minute: '2-digit'
        });
      case 'week':
        // Per settimana, mostra giorno della settimana e giorno
        return date.toLocaleDateString('it-IT', { 
          weekday: 'short',
          day: '2-digit'
        });
      case 'month':
        // Per mese, mostra giorno e mese
        return date.toLocaleDateString('it-IT', { 
          day: '2-digit', 
          month: 'short'
        });
      case '3months':
        // Per 3 mesi, mostra giorno e mese
        return date.toLocaleDateString('it-IT', { 
          day: '2-digit', 
          month: 'short'
        });
      case 'year':
        // Per anno, mostra mese e anno
        return date.toLocaleDateString('it-IT', { 
          month: 'short',
          year: '2-digit'
        });
      case 'custom':
        // Per periodo custom, adatta in base alla lunghezza
        const customData = getFilteredDataForChart();
        if (customData.length <= 7) {
          // Periodo breve: mostra giorno della settimana
          return date.toLocaleDateString('it-IT', { 
            weekday: 'short',
            day: '2-digit'
          });
        } else if (customData.length <= 31) {
          // Periodo medio: mostra giorno e mese
          return date.toLocaleDateString('it-IT', { 
            day: '2-digit', 
            month: 'short'
          });
        } else {
          // Periodo lungo: mostra mese e anno
          return date.toLocaleDateString('it-IT', { 
            month: 'short',
            year: '2-digit'
          });
        }
      case 'all':
      default:
        // Default: mostra giorno e mese
        return date.toLocaleDateString('it-IT', { 
          day: '2-digit', 
          month: 'short'
        });
    }
  };

  // Ottieni i dati filtrati effettivi per il grafico
  const chartData = getFilteredDataForChart();

  // Formattiamo i dati per l'asse X con logica intelligente per le etichette
  const formattedData = chartData.map((item, index) => {
    let shouldShowLabel = false;
    
    // Logica più intelligente per mostrare le etichette basata sui dati effettivi
    const dataLength = chartData.length;
    
    switch (filterType) {
      case 'today':
        // Per oggi, mostra ogni 2-4 ore a seconda dei dati disponibili
        const hourInterval = Math.max(1, Math.floor(dataLength / 6));
        shouldShowLabel = index % hourInterval === 0;
        break;
      case 'week':
        // Per settimana, mostra tutti i giorni se <= 7, altrimenti ogni 2
        shouldShowLabel = dataLength <= 7 ? true : index % 2 === 0;
        break;
      case 'month':
        // Per mese, mostra ogni 3-5 giorni a seconda della lunghezza
        const dayInterval = Math.max(1, Math.floor(dataLength / 8));
        shouldShowLabel = index % dayInterval === 0;
        break;
      case '3months':
        // Per 3 mesi, mostra ogni settimana circa
        const weekInterval = Math.max(1, Math.floor(dataLength / 12));
        shouldShowLabel = index % weekInterval === 0;
        break;
      case 'year':
        // Per anno, mostra ogni mese circa
        const monthInterval = Math.max(1, Math.floor(dataLength / 12));
        shouldShowLabel = index % monthInterval === 0;
        break;
      case 'custom':
        // Per custom, adatta in base alla lunghezza
        if (dataLength <= 7) {
          shouldShowLabel = true;
        } else if (dataLength <= 31) {
          shouldShowLabel = index % Math.max(1, Math.floor(dataLength / 6)) === 0;
        } else {
          shouldShowLabel = index % Math.max(1, Math.floor(dataLength / 10)) === 0;
        }
        break;
      case 'all':
      default:
        // Default: mostra 6-8 etichette
        const defaultInterval = Math.max(1, Math.floor(dataLength / 7));
        shouldShowLabel = index % defaultInterval === 0;
        break;
    }
    
    // Assicurati sempre di mostrare la prima e l'ultima etichetta
    if (index === 0 || index === dataLength - 1) {
      shouldShowLabel = true;
    }
    
    return {
      ...item,
      displayDate: shouldShowLabel ? formatXAxisDate(item.date) : ''
    };
  });

  return (
    <div className="space-y-6">
      {/* Blocco statistiche generali */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          📊 Panoramica Generale
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-2xl font-bold text-blue-600">{totalClicks.toLocaleString()}</div>
            <div className="text-sm text-gray-600 font-medium">Click Totali</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-2xl font-bold text-green-600">{uniqueClicks.toLocaleString()}</div>
            <div className="text-sm text-gray-600 font-medium">Click Univoci</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
            <div className="text-2xl mb-2">🔗</div>
            <div className="text-2xl font-bold text-orange-600">{totalReferrers}</div>
            <div className="text-sm text-gray-600 font-medium">Sorgenti Traffico</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
            <div className="text-2xl mb-2">📱</div>
            <div className="text-2xl font-bold text-purple-600">{totalDevices}</div>
            <div className="text-sm text-gray-600 font-medium">Dispositivi</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-r from-teal-50 to-teal-100 rounded-lg">
            <div className="text-2xl mb-2">🌍</div>
            <div className="text-2xl font-bold text-teal-600">{totalCountries}</div>
            <div className="text-sm text-gray-600 font-medium">Paesi</div>
          </div>
        </div>
      </div>

      {/* Grafico andamento temporale */}
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
            <div className="text-gray-500" title={getTrendTooltip()}>
              Tendenza
            </div>
          </div>

        </div>
      </div>

      {/* Grafico */}
      <div className="h-80">
        {chartData.length > 0 ? (
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
                angle={filterType === 'today' ? 0 : -45}
                textAnchor={filterType === 'today' ? 'middle' : 'end'}
                height={filterType === 'today' ? 30 : 50}
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
    </div>
  );
}
