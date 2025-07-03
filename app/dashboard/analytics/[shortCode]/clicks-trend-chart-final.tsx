'use client';

import { useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Tipi di dati per il grafico
type TimeSeriesData = {
  date: string;
  clicks: number;
};

type HourlyData = {
  date: string;
  clicks: number;
  displayHour: string;
};

type ChartDataItem = TimeSeriesData | HourlyData;

// Props del componente
interface ClicksTrendChartProps {
  data: TimeSeriesData[];
  filterType?: string;
  dateRange?: { startDate: string; endDate: string };
  totalClicks: number;
  uniqueClicks: number;
  totalReferrers: number;
  totalDevices: number;
  totalCountries: number;
}

// Utility functions for robust date management
const DateUtils = {
  // Converte una data in formato YYYY-MM-DD con validazione
  toDateString: (date: Date): string => {
    if (!date || isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  },
  
  // Crea una data sicura da una stringa con fallback robusto
  parseDate: (dateString: string): Date => {
    if (!dateString || typeof dateString !== 'string') {
      return new Date();
    }
    
    let date = new Date(dateString);
    
    // Se fallisce, prova a parsare come timestamp
    if (isNaN(date.getTime()) && !isNaN(Number(dateString))) {
      date = new Date(Number(dateString));
    }
    
    // Se ancora fallisce, usa la data corrente
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date string: ${dateString}, using current date`);
      return new Date();
    }
    
    return date;
  },
  
  // Ottiene l'inizio del giorno con timezone handling
  startOfDay: (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  },
  
  // Ottiene la fine del giorno con timezone handling
  endOfDay: (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  },
  
  // Verifica se una data è oggi
  isToday: (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  },
  
  // Verifica se una data è in un range
  isInRange: (date: Date, startDate: Date, endDate: Date): boolean => {
    const dateTime = date.getTime();
    return dateTime >= startDate.getTime() && dateTime <= endDate.getTime();
  }
};

// Mathematical and statistical utilities with enhanced robustness
const StatUtils = {
  // Calcola la media di un array con validazione robusta
  mean: (values: number[]): number => {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const validValues = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
    if (validValues.length === 0) return 0;
    return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
  },
  
  // Calcola la mediana con gestione robusta dei casi edge
  median: (values: number[]): number => {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const validValues = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
    if (validValues.length === 0) return 0;
    
    const sorted = [...validValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  },
  
  // Calcola la deviazione standard con correzione di Bessel
  standardDeviation: (values: number[]): number => {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const validValues = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
    if (validValues.length < 2) return 0;
    
    const avg = StatUtils.mean(validValues);
    const squareDiffs = validValues.map(value => Math.pow(value - avg, 2));
    // Usa n-1 per la correzione di Bessel (campione vs popolazione)
    const variance = squareDiffs.reduce((sum, val) => sum + val, 0) / (validValues.length - 1);
    return Math.sqrt(variance);
  },
  
  // Regressione lineare con validazione robusta e diagnostiche
  linearRegression: (xValues: number[], yValues: number[]): { 
    slope: number; 
    intercept: number; 
    rSquared: number;
    isValid: boolean;
    sampleSize: number;
  } => {
    if (!Array.isArray(xValues) || !Array.isArray(yValues)) {
      return { slope: 0, intercept: 0, rSquared: 0, isValid: false, sampleSize: 0 };
    }
    
    if (xValues.length !== yValues.length || xValues.length < 2) {
      return { slope: 0, intercept: 0, rSquared: 0, isValid: false, sampleSize: xValues.length };
    }
    
    // Filtra valori non validi
    const validPairs = xValues
      .map((x, i) => ({ x, y: yValues[i] }))
      .filter(pair => 
        typeof pair.x === 'number' && typeof pair.y === 'number' &&
        !isNaN(pair.x) && !isNaN(pair.y) && 
        isFinite(pair.x) && isFinite(pair.y)
      );
    
    if (validPairs.length < 2) {
      return { slope: 0, intercept: 0, rSquared: 0, isValid: false, sampleSize: validPairs.length };
    }
    
    const n = validPairs.length;
    const xMean = StatUtils.mean(validPairs.map(p => p.x));
    const yMean = StatUtils.mean(validPairs.map(p => p.y));
    
    let numerator = 0;
    let denominator = 0;
    
    for (const pair of validPairs) {
      numerator += (pair.x - xMean) * (pair.y - yMean);
      denominator += Math.pow(pair.x - xMean, 2);
    }
    
    if (Math.abs(denominator) < Number.EPSILON) {
      return { slope: 0, intercept: yMean, rSquared: 0, isValid: false, sampleSize: n };
    }
    
    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;
    
    // Calcola R² con controllo per evitare divisione per zero
    let ssRes = 0;
    let ssTot = 0;
    
    for (const pair of validPairs) {
      const predicted = intercept + slope * pair.x;
      ssRes += Math.pow(pair.y - predicted, 2);
      ssTot += Math.pow(pair.y - yMean, 2);
    }
    
    let rSquared = 0;
    if (Math.abs(ssTot) > Number.EPSILON) {
      rSquared = Math.max(0, Math.min(1, 1 - (ssRes / ssTot)));
    }
    
    const isValid = n >= 3 && !isNaN(slope) && !isNaN(intercept) && isFinite(slope) && isFinite(intercept);
    
    return { slope, intercept, rSquared, isValid, sampleSize: n };
  }
};

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
  
  // Filtro dati basato su filtro temporale con gestione date robusta
  const filteredData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const now = new Date();
    let result = [...data];

    try {
      switch (filterType) {
        case 'today': {
          const today = DateUtils.toDateString(now);
          result = data.filter(d => {
            try {
              return d?.date === today;
            } catch {
              return false;
            }
          });
          break;
        }
        case 'week': {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const weekAgoStr = DateUtils.toDateString(weekAgo);
          result = data.filter(d => {
            try {
              return d?.date && d.date >= weekAgoStr;
            } catch {
              return false;
            }
          });
          break;
        }
        case 'month': {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          const monthAgoStr = DateUtils.toDateString(monthAgo);
          result = data.filter(d => {
            try {
              return d?.date && d.date >= monthAgoStr;
            } catch {
              return false;
            }
          });
          break;
        }
        case '3months': {
          const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          const threeMonthsAgoStr = DateUtils.toDateString(threeMonthsAgo);
          result = data.filter(d => {
            try {
              return d?.date && d.date >= threeMonthsAgoStr;
            } catch {
              return false;
            }
          });
          break;
        }
        case 'year': {
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          const yearAgoStr = DateUtils.toDateString(yearAgo);
          result = data.filter(d => {
            try {
              return d?.date && d.date >= yearAgoStr;
            } catch {
              return false;
            }
          });
          break;
        }
        case 'custom': {
          if (dateRange?.startDate && dateRange?.endDate) {
            const startDate = DateUtils.parseDate(dateRange.startDate);
            const endDate = DateUtils.parseDate(dateRange.endDate);
            result = data.filter(d => {
              try {
                if (!d?.date) return false;
                const itemDate = DateUtils.parseDate(d.date);
                return DateUtils.isInRange(itemDate, startDate, endDate);
              } catch {
                return false;
              }
            });
          }
          break;
        }
        case 'all':
        default:
          // Usa tutti i dati disponibili con validazione
          result = data.filter(d => d?.date && typeof d.clicks === 'number');
          break;
      }
    } catch (e) {
      console.error('Error in filteredData:', e);
      // Fallback: ritorna i dati validi se possibile
      return data.filter(d => d?.date && typeof d.clicks === 'number');
    }

    return result.length > 0 ? result : data.filter(d => d?.date && typeof d.clicks === 'number');
  }, [data, filterType, dateRange]);

  // Funzione per ottenere sempre gli ultimi 24 ore di dati per il grafico (solo per filtro "oggi")
  const hourlyData = useMemo(() => {
    try {
      const now = new Date();
      const last24Hours: HourlyData[] = [];
      
      // Genera le 24 ore precedenti con gestione robusta
      for (let i = 23; i >= 0; i--) {
        const hourDate = new Date(now.getTime() - (i * 60 * 60 * 1000));
        const dateString = DateUtils.toDateString(hourDate);
        const hourString = `${dateString}T${hourDate.getHours().toString().padStart(2, '0')}:00:00`;
        
        // Cerca se esiste un dato per questa ora specifica con protezione errori
        const existingData = data.find(d => {
          try {
            const dataDate = DateUtils.parseDate(d.date);
            return dataDate.getFullYear() === hourDate.getFullYear() &&
                  dataDate.getMonth() === hourDate.getMonth() &&
                  dataDate.getDate() === hourDate.getDate() &&
                  dataDate.getHours() === hourDate.getHours();
          } catch {
            return false;
          }
        });
        
        last24Hours.push({
          date: hourString,
          clicks: existingData?.clicks ?? 0,
          displayHour: hourDate.toLocaleTimeString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit'
          })
        });
      }
      
      return last24Hours;
    } catch (e) {
      console.error('Error in hourlyData:', e);
      return [];
    }
  }, [data]);

  // Ottieni i dati corretti in base al filtro
  const chartData = useMemo(() => {
    return filterType === 'today' ? hourlyData : filteredData;
  }, [filterType, hourlyData, filteredData]);

  // Statistiche avanzate calcolate con utility matematiche robuste
  const stats = useMemo(() => {
    if (!Array.isArray(chartData) || chartData.length === 0) {
      return { 
        peak: 0, 
        average: 0, 
        median: 0,
        standardDeviation: 0,
        trend: 'stabile', 
        prediction: 0, 
        confidence: 0,
        slope: 0,
        percentChange: 0,
        rSquared: 0,
        sampleSize: 0
      };
    }

    const clicks = chartData.map(d => typeof d.clicks === 'number' ? d.clicks : 0);
    
    // Statistiche di base con utility robuste
    const peak = Math.max(...clicks, 0);
    const average = StatUtils.mean(clicks);
    const median = StatUtils.median(clicks);
    const standardDeviation = StatUtils.standardDeviation(clicks);

    // Calcola media normalizzata per periodo con gestione sicura
    const getAverageForFilter = () => {
      const totalClicks = clicks.reduce((sum, c) => sum + c, 0);
      
      switch (filterType) {
        case 'today':
          return totalClicks / 24; // Media oraria
        case 'week':
          return totalClicks / 7; // Media giornaliera
        case 'month':
          return totalClicks / 30; // Media giornaliera
        case '3months':
          return totalClicks / 90; // Media giornaliera
        case 'year':
          return totalClicks / 365; // Media giornaliera
        case 'custom':
          const customDays = Math.max(1, chartData.length);
          return totalClicks / customDays;
        case 'all':
        default:
          if (chartData.length > 0 && chartData[0]?.date) {
            const firstDate = DateUtils.parseDate(chartData[0].date);
            const lastDate = chartData.length > 1 ? 
                            DateUtils.parseDate(chartData[chartData.length - 1].date) : 
                            new Date();
            const daysDiff = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
            return totalClicks / daysDiff;
          }
          return average;
      }
    };

    const normalizedAverage = getAverageForFilter();

    // Regressione lineare robusta con utility matematiche
    const xValues = Array.from({ length: clicks.length }, (_, i) => i);
    const regression = StatUtils.linearRegression(xValues, clicks);
    
    // Determina tendenza con soglie dinamiche basate su deviazione standard
    const slopeThreshold = Math.max(0.1, standardDeviation * 0.1);
    let trend: 'crescente' | 'decrescente' | 'stabile' = 'stabile';
    
    if (regression.isValid && regression.sampleSize >= 3) {
      if (regression.slope > slopeThreshold) {
        trend = 'crescente';
      } else if (regression.slope < -slopeThreshold) {
        trend = 'decrescente';
      }
    }

    // Calcola percentuale di cambio tra primi e ultimi punti
    const recentPeriodSize = Math.min(Math.max(2, Math.floor(clicks.length / 3)), 7);
    const recentAvg = StatUtils.mean(clicks.slice(-recentPeriodSize));
    const earlierAvg = StatUtils.mean(clicks.slice(0, recentPeriodSize));
    const percentChange = earlierAvg !== 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;

    // Previsione basata su regressione lineare con validazione
    const getPredictionForFilter = () => {
      if (!regression.isValid || regression.sampleSize < 3) {
        return Math.round(normalizedAverage);
      }

      const futurePeriods = (() => {
        switch (filterType) {
          case 'today': return 24 - new Date().getHours(); // Ore rimanenti
          case 'week': return 7; // Prossima settimana
          case 'month': return 30; // Prossimo mese
          case '3months': return 90; // Prossimi 3 mesi
          case 'year': return 365; // Prossimo anno
          case 'custom': return Math.max(1, chartData.length); // Periodo equivalente
          case 'all':
          default: return 30; // Default: prossimo mese
        }
      })();

      const nextX = clicks.length; // Prossimo punto temporale
      const predictedValue = regression.intercept + regression.slope * nextX;
      const scaledPrediction = Math.max(0, predictedValue * futurePeriods);
      
      return Math.round(scaledPrediction);
    };

    const prediction = getPredictionForFilter();
    const confidence = Math.round(regression.rSquared * 100);

    return {
      peak,
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      trend,
      prediction,
      confidence,
      slope: Math.round(regression.slope * 1000) / 1000,
      percentChange: Math.round(percentChange * 10) / 10,
      rSquared: Math.round(regression.rSquared * 10000) / 10000,
      sampleSize: regression.sampleSize
    };
  }, [chartData, filterType]);

  // Funzione per generare il titolo del grafico dinamico
  const getChartTitle = () => {
    switch (filterType) {
      case 'today':
        return 'Andamento Temporale (Ultime 24 Ore)';
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
          try {
            const start = DateUtils.parseDate(dateRange.startDate).toLocaleDateString('it-IT');
            const end = DateUtils.parseDate(dateRange.endDate).toLocaleDateString('it-IT');
            return `Andamento Temporale (${start} - ${end})`;
          } catch {
            return 'Andamento Temporale (Periodo Personalizzato)';
          }
        }
        return 'Andamento Temporale (Periodo Personalizzato)';
      case 'all':
      default:
        return 'Andamento Temporale (Tutti i Dati)';
    }
  };

  // Tooltip dinamico per la tendenza con validazione
  const getTrendTooltip = () => {
    try {
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
    } catch {
      return 'Previsione basata su analisi statistica';
    }
  };
  
  // Componente personalizzato per il tooltip con gestione date robusta
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (!(active && payload && payload.length && label)) {
      return null;
    }
    
    try {
      // Trova il dato originale per ottenere la data completa con gestione errori
      const originalItem = chartData.find((item: ChartDataItem) => item.date === label);
      if (!originalItem) return null;

      // Formatta la label in base al filtro attivo usando DateUtils per robustezza
      const date = DateUtils.parseDate(originalItem.date);
      let formattedLabel = '';
      
      try {
        if (filterType === 'today') {
          formattedLabel = date.toLocaleString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit',
            day: '2-digit',
            month: 'short',
            weekday: 'short'
          });
        } else {
          switch (filterType) {
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
        }
      } catch (e) {
        console.error('Error formatting date for tooltip:', e);
        // Fallback formattazione
        formattedLabel = date.toLocaleDateString('it-IT');
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
    } catch (e) {
      console.error('Error in CustomTooltip:', e);
      return null;
    }
  };

  // Formatta le etichette dell'asse X in base al tipo di dato
  const formatAxisLabel = useCallback((dateString: string, itemData?: ChartDataItem) => {
    try {
      const date = DateUtils.parseDate(dateString);
      
      if (filterType === 'today') {
        // Per "oggi", usa le ore dal campo displayHour se disponibile
        const hourlyData = itemData as HourlyData;
        return hourlyData?.displayHour || date.toLocaleTimeString('it-IT', { 
          hour: '2-digit', 
          minute: '2-digit'
        });
      } else {
        // Per tutti gli altri filtri, usa i giorni con formattazione appropriata
        switch (filterType) {
          case 'week':
            return date.toLocaleDateString('it-IT', { 
              weekday: 'short',
              day: '2-digit'
            });
          case 'month':
            return date.toLocaleDateString('it-IT', { 
              day: '2-digit', 
              month: 'short'
            });
          case '3months':
            return date.toLocaleDateString('it-IT', { 
              day: '2-digit', 
              month: 'short'
            });
          case 'year':
            return date.toLocaleDateString('it-IT', { 
              month: 'short',
              year: '2-digit'
            });
          case 'custom': {
            const customDataLength = chartData.length;
            if (customDataLength <= 7) {
              return date.toLocaleDateString('it-IT', { 
                weekday: 'short',
                day: '2-digit'
              });
            } else if (customDataLength <= 31) {
              return date.toLocaleDateString('it-IT', { 
                day: '2-digit', 
                month: 'short'
              });
            } else {
              return date.toLocaleDateString('it-IT', { 
                month: 'short',
                year: '2-digit'
              });
            }
          }
          case 'all':
          default:
            return date.toLocaleDateString('it-IT', { 
              day: '2-digit', 
              month: 'short'
            });
        }
      }
    } catch (e) {
      console.error('Error in formatAxisLabel:', e);
      return dateString;
    }
  }, [filterType, chartData?.length]);

  // Formattiamo i dati per l'asse X con logica adattiva e tipo sicuro
  const formattedData = useMemo(() => {
    if (!Array.isArray(chartData) || chartData.length === 0) {
      return [];
    }
    
    return chartData.map((item: ChartDataItem, index: number) => {
      let shouldShowLabel = false;
      const dataLength = chartData.length;
      
      if (filterType === 'today') {
        // Per "oggi", mostra etichette ogni 4 ore
        const hourInterval = 4;
        shouldShowLabel = index % hourInterval === 0;
      } else {
        // Per altri filtri, adatta in base alla lunghezza dei dati
        switch (filterType) {
          case 'week':
            // Per settimana, mostra tutti i giorni se <= 7, altrimenti ogni 2
            shouldShowLabel = dataLength <= 7 ? true : index % 2 === 0;
            break;
          case 'month':
            // Per mese, mostra ogni 3-5 giorni
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
      }
      
      // Assicurati sempre di mostrare la prima e l'ultima etichetta
      if (index === 0 || index === dataLength - 1) {
        shouldShowLabel = true;
      }
      
      return {
        ...item,
        displayDate: shouldShowLabel ? formatAxisLabel(item.date, item) : ''
      };
    });
  }, [chartData, filterType, formatAxisLabel]);

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
