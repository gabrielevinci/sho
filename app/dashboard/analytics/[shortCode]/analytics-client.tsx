'use client';

import { useState } from 'react';
import { ArrowLeft, ExternalLink, Calendar, Globe, Monitor, Smartphone, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import ClicksTrendChartDual from './clicks-trend-chart-dual';
import AnalyticsFilters, { DateFilter, DateRange } from './analytics-filters';

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
  top_referrer: string | null;
  most_used_browser: string | null;
  most_used_device: string | null;
  clicks_today: number;
  clicks_this_week: number;
  clicks_this_month: number;
  unique_clicks_today: number;
  unique_clicks_this_week: number;
  unique_clicks_this_month: number;
};

type GeographicData = {
  country: string;
  clicks: number;
  unique_clicks?: number;
};

type DeviceData = {
  device_type: string;
  clicks: number;
  unique_clicks?: number;
};

type BrowserData = {
  browser_name: string;
  clicks: number;
  unique_clicks?: number;
};

type ReferrerData = {
  referrer: string;
  clicks: number;
  unique_clicks?: number;
};

type TimeSeriesData = {
  date: string;
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
      const endDate = italianNow.toISOString().split('T')[0];
      const weekAgo = new Date(italianNow.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: weekAgo.toISOString().split('T')[0], endDate };
    case 'month':
      const endDateMonth = italianNow.toISOString().split('T')[0];
      const monthAgo = new Date(italianNow.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: monthAgo.toISOString().split('T')[0], endDate: endDateMonth };
    case '3months':
      const endDate3M = italianNow.toISOString().split('T')[0];
      const threeMonthsAgo = new Date(italianNow.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { startDate: threeMonthsAgo.toISOString().split('T')[0], endDate: endDate3M };
    case 'year':
      const endDateYear = italianNow.toISOString().split('T')[0];
      const yearAgo = new Date(italianNow.getTime() - 365 * 24 * 60 * 60 * 1000);
      return { startDate: yearAgo.toISOString().split('T')[0], endDate: endDateYear };
    case 'custom':
      if (customRange?.startDate && customRange?.endDate) {
        return {
          startDate: customRange.startDate.toISOString().split('T')[0],
          endDate: customRange.endDate.toISOString().split('T')[0]
        };
      }
      return { startDate: '', endDate: '' };
    case 'all':
    default:
      return { startDate: '', endDate: '' };
  }
};

export default function AnalyticsClient({ initialData, shortCode }: AnalyticsClientProps) {
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [loading, setLoading] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<DateFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });

  // Funzione per caricare i dati filtrati
  const loadFilteredData = async (filter: DateFilter, customRange?: DateRange) => {
    if (filter === 'all') {
      setData(initialData);
      return;
    }

    setLoading(true);
    try {
      const { startDate, endDate } = getDateRangeFromFilter(filter, customRange);
      
      // Per il filtro "today", passiamo anche l'informazione dell'ora
      const params = new URLSearchParams({
        filterType: filter,
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      });
      
      const response = await fetch(`/api/analytics/${shortCode}?${params.toString()}`);
      if (response.ok) {
        const filteredData = await response.json();
        setData(filteredData);
      }
    } catch (error) {
      console.error('Error loading filtered data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handler per il cambio di filtro
  const handleFilterChange = (filter: DateFilter, customRange?: DateRange) => {
    setCurrentFilter(filter);
    if (customRange) {
      setDateRange(customRange);
    }
    loadFilteredData(filter, customRange);
  };

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

        {/* Filtri temporali */}
        <AnalyticsFilters
          currentFilter={currentFilter}
          dateRange={dateRange}
          onFilterChange={handleFilterChange}
        />

        {/* Statistiche di base */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-indigo-600" />
            Statistiche Generali
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
            </div>

            {/* Click univoci */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-green-600 text-2xl">👥</div>
                <div className="text-xs text-green-600 font-medium uppercase tracking-wide">Univoci</div>
              </div>
              <div className="text-2xl font-bold text-green-900 mb-1">
                {data.clickAnalytics.unique_clicks.toLocaleString('it-IT')}
              </div>
              <div className="text-sm text-green-700">Click univoci</div>
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
                <div className="text-xs text-orange-600 font-medium uppercase tracking-wide">Device</div>
              </div>
              <div className="text-2xl font-bold text-orange-900 mb-1">
                {data.clickAnalytics.unique_devices}
              </div>
              <div className="text-sm text-orange-700">Dispositivi</div>
            </div>

            {/* Paesi */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 border border-teal-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-teal-600 text-2xl">🗺️</div>
                <div className="text-xs text-teal-600 font-medium uppercase tracking-wide">Global</div>
              </div>
              <div className="text-2xl font-bold text-teal-900 mb-1">
                {data.clickAnalytics.unique_countries}
              </div>
              <div className="text-sm text-teal-700">Paesi</div>
            </div>
          </div>
        </div>

        {/* Intestazione del link */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Statistiche Link
                </h1>
                {loading && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                )}
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-gray-800">
                  {data.linkData.title || 'Link senza titolo'}
                </h2>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <code className="bg-gray-100 px-2 py-1 rounded text-blue-600 font-medium">
                    /{shortCode}
                  </code>
                  <span>→</span>
                  <a 
                    href={data.linkData.original_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 truncate max-w-md"
                  >
                    <span className="truncate">{data.linkData.original_url}</span>
                    <ExternalLink className="h-4 w-4 flex-shrink-0" />
                  </a>
                </div>
                {data.linkData.description && (
                  <p className="text-gray-600 text-sm">{data.linkData.description}</p>
                )}
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>Creato il {new Date(data.linkData.created_at).toLocaleDateString('it-IT', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                  })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grafico andamento temporale - usa sempre i dati filtrati */}
        <ClicksTrendChartDual 
          data={data.timeSeriesData} 
          filterType={currentFilter}
          totalClicks={data.clickAnalytics.total_clicks}
          uniqueClicks={data.clickAnalytics.unique_clicks}
        />

        {/* Grafici e tabelle dettagliate */}
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
                      // Calcola la percentuale basata sui click totali di questa categoria rispetto alla somma dei click delle categorie
                      const totalCategoryClicks = data.geographicData.reduce((sum, item) => sum + item.clicks, 0);
                      const percentage = totalCategoryClicks > 0 ? (country.clicks / totalCategoryClicks) * 100 : 0;
                      
                      // Calcola i click unici proporzionalmente ai click unici totali reali
                      const uniqueClicks = country.unique_clicks !== undefined 
                        ? country.unique_clicks 
                        : totalCategoryClicks > 0 
                          ? Math.round((country.clicks / totalCategoryClicks) * data.clickAnalytics.unique_clicks)
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
                      // Calcola la percentuale basata sui click totali di questa categoria
                      const totalCategoryClicks = data.deviceData.reduce((sum, item) => sum + item.clicks, 0);
                      const percentage = totalCategoryClicks > 0 ? (device.clicks / totalCategoryClicks) * 100 : 0;
                      
                      // Calcola i click unici proporzionalmente ai click unici totali reali
                      const uniqueClicks = device.unique_clicks !== undefined 
                        ? device.unique_clicks 
                        : totalCategoryClicks > 0 
                          ? Math.round((device.clicks / totalCategoryClicks) * data.clickAnalytics.unique_clicks)
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
                      // Calcola la percentuale basata sui click totali di questa categoria
                      const totalCategoryClicks = data.browserData.reduce((sum, item) => sum + item.clicks, 0);
                      const percentage = totalCategoryClicks > 0 ? (browser.clicks / totalCategoryClicks) * 100 : 0;
                      
                      // Calcola i click unici proporzionalmente ai click unici totali reali
                      const uniqueClicks = browser.unique_clicks !== undefined 
                        ? browser.unique_clicks 
                        : totalCategoryClicks > 0 
                          ? Math.round((browser.clicks / totalCategoryClicks) * data.clickAnalytics.unique_clicks)
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
                      // Calcola la percentuale basata sui click totali di questa categoria
                      const totalCategoryClicks = data.referrerData.reduce((sum, item) => sum + item.clicks, 0);
                      const percentage = totalCategoryClicks > 0 ? (referrer.clicks / totalCategoryClicks) * 100 : 0;
                      
                      // Calcola i click unici proporzionalmente ai click unici totali reali
                      const uniqueClicks = referrer.unique_clicks !== undefined 
                        ? referrer.unique_clicks 
                        : totalCategoryClicks > 0 
                          ? Math.round((referrer.clicks / totalCategoryClicks) * data.clickAnalytics.unique_clicks)
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

        {/* Statistiche temporali - usa sempre i dati originali, non filtrati */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            Andamento Temporale
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Oggi */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 relative overflow-hidden">
              <div className="absolute top-2 right-2 text-blue-200 text-4xl">📅</div>
              <div className="relative">
                <div className="flex items-baseline space-x-2 mb-2">
                  <span className="text-3xl font-bold text-blue-900">
                    {initialData.clickAnalytics.clicks_today}
                  </span>
                  <span className="text-lg font-semibold text-blue-700">
                    ({initialData.clickAnalytics.unique_clicks_today})
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-blue-800">Oggi</div>
                  <div className="text-xs text-blue-600">
                    Totali <span className="font-medium">({initialData.clickAnalytics.clicks_today})</span> • 
                    Unici <span className="font-medium">({initialData.clickAnalytics.unique_clicks_today})</span>
                  </div>
                  {initialData.clickAnalytics.clicks_today > 0 && (
                    <div className="text-xs text-blue-500 mt-2">
                      Tasso unicità: {Math.round((initialData.clickAnalytics.unique_clicks_today / initialData.clickAnalytics.clicks_today) * 100)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Ultimi 7 giorni */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 relative overflow-hidden">
              <div className="absolute top-2 right-2 text-green-200 text-4xl">📊</div>
              <div className="relative">
                <div className="flex items-baseline space-x-2 mb-2">
                  <span className="text-3xl font-bold text-green-900">
                    {initialData.clickAnalytics.clicks_this_week}
                  </span>
                  <span className="text-lg font-semibold text-green-700">
                    ({initialData.clickAnalytics.unique_clicks_this_week})
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-green-800">Ultimi 7 giorni</div>
                  <div className="text-xs text-green-600">
                    Totali <span className="font-medium">({initialData.clickAnalytics.clicks_this_week})</span> • 
                    Unici <span className="font-medium">({initialData.clickAnalytics.unique_clicks_this_week})</span>
                  </div>
                  {initialData.clickAnalytics.clicks_this_week > 0 && (
                    <div className="text-xs text-green-500 mt-2">
                      Tasso unicità: {Math.round((initialData.clickAnalytics.unique_clicks_this_week / initialData.clickAnalytics.clicks_this_week) * 100)}%
                    </div>
                  )}
                  <div className="text-xs text-green-500 mt-1">
                    Media giornaliera: {Math.round(initialData.clickAnalytics.clicks_this_week / 7)} click
                  </div>
                </div>
              </div>
            </div>
            
            {/* Ultimi 30 giorni */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 relative overflow-hidden">
              <div className="absolute top-2 right-2 text-purple-200 text-4xl">📈</div>
              <div className="relative">
                <div className="flex items-baseline space-x-2 mb-2">
                  <span className="text-3xl font-bold text-purple-900">
                    {initialData.clickAnalytics.clicks_this_month}
                  </span>
                  <span className="text-lg font-semibold text-purple-700">
                    ({initialData.clickAnalytics.unique_clicks_this_month})
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-purple-800">Ultimi 30 giorni</div>
                  <div className="text-xs text-purple-600">
                    Totali <span className="font-medium">({initialData.clickAnalytics.clicks_this_month})</span> • 
                    Unici <span className="font-medium">({initialData.clickAnalytics.unique_clicks_this_month})</span>
                  </div>
                  {initialData.clickAnalytics.clicks_this_month > 0 && (
                    <div className="text-xs text-purple-500 mt-2">
                      Tasso unicità: {Math.round((initialData.clickAnalytics.unique_clicks_this_month / initialData.clickAnalytics.clicks_this_month) * 100)}%
                    </div>
                  )}
                  <div className="text-xs text-purple-500 mt-1">
                    Media giornaliera: {Math.round(initialData.clickAnalytics.clicks_this_month / 30)} click
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
