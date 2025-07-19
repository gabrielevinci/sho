'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ExternalLink, Calendar, Globe, Monitor, Smartphone, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import ClicksTrendChartDual from './clicks-trend-chart-dual';
import PeriodChart from './period-chart';
import AnalyticsFilters, { DateFilter, DateRange } from './analytics-filters';
import LinkHeader from './link-header';

// Tipi per i dati delle statistiche
type LinkAnalytics = {
  short_code: string;
  original_url: string;
  title: string | null;
  description: string | null;
  click_count: number;
  created_at: Date;
};

type ClickAnalytics = {
  total_clicks: number;
  unique_clicks: number;
  unique_countries: number;
  unique_referrers: number;
  unique_devices: number;
  unique_browsers: number;
  top_referrer: string | null;
  most_used_browser: string | null;
  most_used_device: string | null;
  clicks_today: number;
  clicks_this_week: number;
  clicks_this_month: number;
  unique_clicks_today: number;
  unique_clicks_this_week: number;
  unique_clicks_this_month: number;
  avg_total_clicks_per_period: number;      // Media click totali per periodo (ora/giorno)
  avg_unique_clicks_per_period: number;     // Media click unici per periodo (ora/giorno)
};

type GeographicData = {
  country: string;
  clicks: number;
  percentage: number;
  unique_clicks?: number;
};

type DeviceData = {
  device_type: string;
  clicks: number;
  percentage: number;
  unique_clicks?: number;
};

type BrowserData = {
  browser_name: string;
  clicks: number;
  percentage: number;
  unique_clicks?: number;
};

type ReferrerData = {
  referrer: string;
  clicks: number;
  percentage: number;
  unique_clicks?: number;
};

type TimeSeriesData = {
  date: string;
  total_clicks: number;
  unique_clicks: number;
  full_datetime?: string | Date; // Campo opzionale per i dati orari
};

type MonthlyData = {
  month: string;
  month_number: number;
  year: number;
  total_clicks: number;
  unique_clicks: number;
};

type WeeklyData = {
  week: number;
  year: number;
  week_start: string;
  week_end: string;
  total_clicks: number;
  unique_clicks: number;
};

interface AnalyticsData {
  linkData: LinkAnalytics;
  clickAnalytics: ClickAnalytics;
  geographicData: GeographicData[];
  deviceData: DeviceData[];
  browserData: BrowserData[];
  referrerData: ReferrerData[];
  timeSeriesData: TimeSeriesData[];
  monthlyData: MonthlyData[];
  weeklyData: WeeklyData[];
}

interface AnalyticsClientProps {
  initialData: AnalyticsData;
  shortCode: string;
}

// Funzione helper per calcolare l'intervallo di date in base al filtro
const getDateRangeFromFilter = (filter: DateFilter, customRange?: DateRange): { startDate: string; endDate: string } => {
  // Usa il fuso orario italiano per il calcolo delle date
  const now = new Date();
  const italianNow = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
  
  switch (filter) {
    case 'today':
      // Calcola l'ora corrente italiana arrotondata all'ora
      const currentHourItalian = new Date(italianNow);
      currentHourItalian.setMinutes(0, 0, 0); 
      
      // Calcola le precedenti 23 ore per un totale di 24 ore
      const startHourItalian = new Date(currentHourItalian.getTime() - 23 * 60 * 60 * 1000);
      
      // Passiamo i timestamp italiani al backend che li convertirà in UTC per il database
      return { 
        startDate: startHourItalian.toISOString().replace('Z', '+02:00'), // Indica che è ora italiana
        endDate: currentHourItalian.toISOString().replace('Z', '+02:00')   // Indica che è ora italiana
      };
    case 'week':
      // Includere il giorno corrente: end date va a fine giornata
      const endDate = new Date(italianNow);
      endDate.setHours(23, 59, 59, 999);
      const weekAgo = new Date(italianNow.getTime() - 6 * 24 * 60 * 60 * 1000); // 6 giorni fa + oggi = 7 giorni
      weekAgo.setHours(0, 0, 0, 0);
      return { startDate: weekAgo.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] };
    case 'month':
      // Includere il giorno corrente: end date va a fine giornata
      const endDateMonth = new Date(italianNow);
      endDateMonth.setHours(23, 59, 59, 999);
      const monthAgo = new Date(italianNow.getTime() - 29 * 24 * 60 * 60 * 1000); // 29 giorni fa + oggi = 30 giorni
      monthAgo.setHours(0, 0, 0, 0);
      return { startDate: monthAgo.toISOString().split('T')[0], endDate: endDateMonth.toISOString().split('T')[0] };
    case '3months':
      // Includere il giorno corrente: end date va a fine giornata
      const endDate3M = new Date(italianNow);
      endDate3M.setHours(23, 59, 59, 999);
      const threeMonthsAgo = new Date(italianNow.getTime() - 89 * 24 * 60 * 60 * 1000); // 89 giorni fa + oggi = 90 giorni
      threeMonthsAgo.setHours(0, 0, 0, 0);
      return { startDate: threeMonthsAgo.toISOString().split('T')[0], endDate: endDate3M.toISOString().split('T')[0] };
    case 'year':
      // Includere il giorno corrente: end date va a fine giornata
      const endDateYear = new Date(italianNow);
      endDateYear.setHours(23, 59, 59, 999);
      const yearAgo = new Date(italianNow.getTime() - 364 * 24 * 60 * 60 * 1000); // 364 giorni fa + oggi = 365 giorni
      yearAgo.setHours(0, 0, 0, 0);
      return { startDate: yearAgo.toISOString().split('T')[0], endDate: endDateYear.toISOString().split('T')[0] };
    case 'custom':
      if (customRange?.startDate && customRange?.endDate) {
        // Per le date personalizzate, includere l'intera giornata finale
        const endDate = new Date(customRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        return {
          startDate: customRange.startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        };
      }
      return { startDate: '', endDate: '' };
    case 'all':
    default:
      return { startDate: '', endDate: '' };
  }
};

// Funzione helper per ottenere il label del periodo per le medie
const getPeriodLabel = (filter: DateFilter): string => {
  switch (filter) {
    case 'today':
      return '/ora';
    case 'week':
    case 'month':
    case '3months':
    case 'year':
    case 'all':
    case 'custom':
    default:
      return '/giorno';
  }
};

export default function AnalyticsClient({ initialData, shortCode }: AnalyticsClientProps) {
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [currentFilter, setCurrentFilter] = useState<DateFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });

  // Funzione per caricare i dati filtrati
  const loadFilteredData = useCallback(async (filter: DateFilter, customRange?: DateRange) => {
    try {
      let params: URLSearchParams;
      
      if (filter === 'all') {
        // Per il filtro "all", passiamo solo il filterType per calcolare le medie
        params = new URLSearchParams({
          filterType: filter
        });
      } else {
        const { startDate, endDate } = getDateRangeFromFilter(filter, customRange);
        
        // Per altri filtri, passiamo anche le date
        params = new URLSearchParams({
          filterType: filter,
          ...(startDate && { startDate }),
          ...(endDate && { endDate })
        });
      }
      
      const response = await fetch(`/api/analytics/${shortCode}?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error loading filtered data:', error);
    }
  }, [shortCode]);

  // Auto-refresh per il filtro "all" alla mezzanotte italiana
  useEffect(() => {
    if (currentFilter !== 'all') return;

    const setupMidnightRefresh = () => {
      // Calcola il tempo fino alla prossima mezzanotte italiana
      const now = new Date();
      const italianNow = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
      
      // Prossima mezzanotte italiana
      const nextMidnight = new Date(italianNow);
      nextMidnight.setHours(24, 0, 0, 0); // Mezzanotte del giorno successivo
      
      // Converti di nuovo in UTC per il setTimeout
      const timeUntilMidnight = nextMidnight.getTime() - italianNow.getTime();
      
      console.log(`Prossimo refresh alla mezzanotte italiana tra ${Math.round(timeUntilMidnight / 1000 / 60)} minuti`);
      
      const timeoutId = setTimeout(() => {
        console.log('Auto-refresh alla mezzanotte italiana per il filtro "sempre"');
        loadFilteredData('all');
        // Configura il prossimo refresh (ogni 24 ore)
        setupMidnightRefresh();
      }, timeUntilMidnight);

      return timeoutId;
    };

    const timeoutId = setupMidnightRefresh();
    
    // Cleanup del timeout quando il componente viene smontato o il filtro cambia
    return () => clearTimeout(timeoutId);
  }, [currentFilter, loadFilteredData]);

  // Handler per il cambio di filtro
  const handleFilterChange = (filter: DateFilter, customRange?: DateRange) => {
    setCurrentFilter(filter);
    if (customRange) {
      setDateRange(customRange);
    }
    loadFilteredData(filter, customRange);
  };

  // Effetto per il refresh automatico dei dati a mezzanotte italiana
  useEffect(() => {
    const now = new Date();
    const italianNow = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
    
    // Controlla se il filtro attuale è "all"
    if (currentFilter === 'all') {
      // Calcola il tempo rimanente fino alla mezzanotte italiana
      const nextMidnight = new Date(italianNow);
      nextMidnight.setHours(24, 0, 0, 0);
      
      const timeout = nextMidnight.getTime() - italianNow.getTime();
      
      // Imposta un timeout per aggiornare i dati a mezzanotte
      const timer = setTimeout(() => {
        loadFilteredData('all');
      }, timeout);

      // Pulisci il timer all'unmount del componente
      return () => clearTimeout(timer);
    }
  }, [currentFilter, loadFilteredData]);

  // Effetto per inizializzare i dati con le medie per il filtro "all"
  useEffect(() => {
    if (currentFilter === 'all') {
      loadFilteredData('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Esegue solo al mount del componente

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 py-8">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header con navigazione */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/dashboard" 
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Torna alla Dashboard
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">Aggiornato ora</span>
          </div>
        </div>

        {/* 1. Statistiche link */}
        <LinkHeader linkData={data.linkData} shortCode={shortCode} />

        {/* 2. Filtri temporali */}
        <AnalyticsFilters
          currentFilter={currentFilter}
          dateRange={dateRange}
          onFilterChange={handleFilterChange}
        />

        {/* 3. Statistiche generali */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-indigo-600" />
            Statistiche Generali
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Click totali */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-blue-600 text-2xl">🚀</div>
                <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Totali</div>
              </div>
              <div className="text-2xl font-bold text-blue-900 mb-1">
                {data.clickAnalytics.total_clicks.toLocaleString('it-IT')}
              </div>
              <div className="text-sm text-blue-700">Click totali</div>
              {data.clickAnalytics.avg_total_clicks_per_period > 0 && (
                <div className="text-xs text-blue-600 mt-2 font-medium">
                  Media: {data.clickAnalytics.avg_total_clicks_per_period.toLocaleString('it-IT')}{getPeriodLabel(currentFilter)}
                </div>
              )}
            </div>

            {/* Click unici */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-green-600 text-2xl">👥</div>
                <div className="text-xs text-green-600 font-medium uppercase tracking-wide">Univoci</div>
              </div>
              <div className="text-2xl font-bold text-green-900 mb-1">
                {data.clickAnalytics.unique_clicks.toLocaleString('it-IT')}
              </div>
              <div className="text-sm text-green-700">Click unici</div>
              {data.clickAnalytics.avg_unique_clicks_per_period > 0 && (
                <div className="text-xs text-green-600 mt-2 font-medium">
                  Media: {data.clickAnalytics.avg_unique_clicks_per_period.toLocaleString('it-IT')}{getPeriodLabel(currentFilter)}
                </div>
              )}
            </div>

            {/* Origini/Referrer */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-purple-600 text-2xl">🌐</div>
                <div className="text-xs text-purple-600 font-medium uppercase tracking-wide">Origini</div>
              </div>
              <div className="text-2xl font-bold text-purple-900 mb-1">
                {data.clickAnalytics.unique_referrers}
              </div>
              <div className="text-sm text-purple-700">Sorgenti dati</div>
            </div>

            {/* Dispositivi */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-orange-600 text-2xl">📱</div>
                <div className="text-xs text-orange-600 font-medium uppercase tracking-wide">Dispositivi</div>
              </div>
              <div className="text-2xl font-bold text-orange-900 mb-1">
                {data.clickAnalytics.unique_devices}
              </div>
              <div className="text-sm text-orange-700">Dispositivi</div>
            </div>

            {/* Browser */}
            <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg p-4 border border-violet-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-violet-600 text-2xl">🌐</div>
                <div className="text-xs text-violet-600 font-medium uppercase tracking-wide">Browser</div>
              </div>
              <div className="text-2xl font-bold text-violet-900 mb-1">
                {data.clickAnalytics.unique_browsers}
              </div>
              <div className="text-sm text-violet-700">Browser unici</div>
            </div>

            {/* Paesi */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 border border-teal-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-teal-600 text-2xl">🗺️</div>
                <div className="text-xs text-teal-600 font-medium uppercase tracking-wide">Paesi</div>
              </div>
              <div className="text-2xl font-bold text-teal-900 mb-1">
                {data.clickAnalytics.unique_countries}
              </div>
              <div className="text-sm text-teal-700">Paesi</div>
            </div>
          </div>
        </div>

        {/* 4. Andamento click */}
        <ClicksTrendChartDual 
          data={data.timeSeriesData} 
          filterType={currentFilter}
        />

        {/* 5. Analisi periodica (nuovo grafico) */}
        <PeriodChart 
          monthlyData={data.monthlyData} 
          weeklyData={data.weeklyData}
        />

        {/* 6. Statistiche dettagliate */}
        <div className="space-y-6">
          {/* Header senza toggle */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Statistiche Dettagliate
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Statistiche geografiche */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Globe className="h-5 w-5 mr-2 text-green-600" />
              Click per Paese
            </h3>
            {data.geographicData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Paese</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Click Totali</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Click Unici</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Percentuale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.geographicData.map((country, index) => {
                      // Calcola i click unici proporzionalmente ai click totali globali
                      const uniqueClicks = country.unique_clicks !== undefined 
                        ? country.unique_clicks 
                        : data.clickAnalytics.total_clicks > 0 
                          ? Math.round((country.clicks / data.clickAnalytics.total_clicks) * data.clickAnalytics.unique_clicks)
                          : 0;
                      
                      // Calcola la percentuale basata sui click totali del link
                      const percentage = data.clickAnalytics.total_clicks > 0 
                        ? (country.clicks / data.clickAnalytics.total_clicks) * 100
                        : 0;
                      
                      return (
                        <tr key={country.country} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">#{index + 1}</span>
                              <span className="text-sm font-medium text-gray-900">{country.country}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right text-sm text-gray-900 font-semibold">
                            {country.clicks.toLocaleString('it-IT')}
                          </td>
                          <td className="py-3 px-3 text-right text-sm text-gray-700">
                            {uniqueClicks.toLocaleString('it-IT')}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="text-sm font-medium text-green-600">
                              {percentage.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nessun dato disponibile</p>
            )}
          </div>

          {/* Statistiche dispositivi */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Monitor className="h-5 w-5 mr-2 text-blue-600" />
              Dispositivi
            </h3>
            {data.deviceData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Dispositivo</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Click Totali</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Click Unici</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Percentuale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.deviceData.map((device) => {
                      // Calcola i click unici proporzionalmente ai click totali globali
                      const uniqueClicks = device.unique_clicks !== undefined 
                        ? device.unique_clicks 
                        : data.clickAnalytics.total_clicks > 0 
                          ? Math.round((device.clicks / data.clickAnalytics.total_clicks) * data.clickAnalytics.unique_clicks)
                          : 0;
                      
                      // Calcola la percentuale basata sui click totali del link
                      const percentage = data.clickAnalytics.total_clicks > 0 
                        ? (device.clicks / data.clickAnalytics.total_clicks) * 100
                        : 0;
                      
                      return (
                        <tr key={device.device_type} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-2">
                              {device.device_type === 'mobile' ? (
                                <Smartphone className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Monitor className="h-4 w-4 text-blue-600" />
                              )}
                              <span className="text-sm font-medium text-gray-900 capitalize">{device.device_type}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right text-sm text-gray-900 font-semibold">
                            {device.clicks.toLocaleString('it-IT')}
                          </td>
                          <td className="py-3 px-3 text-right text-sm text-gray-700">
                            {uniqueClicks.toLocaleString('it-IT')}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="text-sm font-medium text-blue-600">
                              {percentage.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nessun dato disponibile</p>
            )}
          </div>

          {/* Statistiche browser */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Globe className="h-5 w-5 mr-2 text-purple-600" />
              Browser
            </h3>
            {data.browserData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Browser</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Click Totali</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Click Unici</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Percentuale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.browserData.map((browser, index) => {
                      // Calcola i click unici proporzionalmente ai click totali globali
                      const uniqueClicks = browser.unique_clicks !== undefined 
                        ? browser.unique_clicks 
                        : data.clickAnalytics.total_clicks > 0 
                          ? Math.round((browser.clicks / data.clickAnalytics.total_clicks) * data.clickAnalytics.unique_clicks)
                          : 0;
                      
                      // Calcola la percentuale basata sui click totali del link
                      const percentage = data.clickAnalytics.total_clicks > 0 
                        ? (browser.clicks / data.clickAnalytics.total_clicks) * 100
                        : 0;
                      
                      return (
                        <tr key={browser.browser_name} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">#{index + 1}</span>
                              <span className="text-sm font-medium text-gray-900">{browser.browser_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right text-sm text-gray-900 font-semibold">
                            {browser.clicks.toLocaleString('it-IT')}
                          </td>
                          <td className="py-3 px-3 text-right text-sm text-gray-700">
                            {uniqueClicks.toLocaleString('it-IT')}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="text-sm font-medium text-purple-600">
                              {percentage.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nessun dato disponibile</p>
            )}
          </div>

          {/* Statistiche referrer */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ExternalLink className="h-5 w-5 mr-2 text-orange-600" />
              Sorgenti di Traffico
            </h3>
            {data.referrerData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Sorgente</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Click Totali</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Click Unici</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Percentuale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.referrerData.map((referrer, index) => {
                      // Calcola i click unici proporzionalmente ai click totali globali
                      const uniqueClicks = referrer.unique_clicks !== undefined 
                        ? referrer.unique_clicks 
                        : data.clickAnalytics.total_clicks > 0 
                          ? Math.round((referrer.clicks / data.clickAnalytics.total_clicks) * data.clickAnalytics.unique_clicks)
                          : 0;
                      
                      // Calcola la percentuale basata sui click totali del link
                      const percentage = data.clickAnalytics.total_clicks > 0 
                        ? (referrer.clicks / data.clickAnalytics.total_clicks) * 100
                        : 0;
                      
                      return (
                        <tr key={referrer.referrer} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">#{index + 1}</span>
                              <span className="text-sm font-medium text-gray-900 truncate max-w-32">
                                {referrer.referrer === 'Direct' ? 'Diretto' : referrer.referrer}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right text-sm text-gray-900 font-semibold">
                            {referrer.clicks.toLocaleString('it-IT')}
                          </td>
                          <td className="py-3 px-3 text-right text-sm text-gray-700">
                            {uniqueClicks.toLocaleString('it-IT')}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="text-sm font-medium text-orange-600">
                              {percentage.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nessun dato disponibile</p>
            )}
          </div>        </div>
        </div>

      </div>
    </div>
  );
}
