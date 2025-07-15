'use client';

import { useState, useCallback } from 'react';
import WorkspaceAnalyticsFilters, { DateFilter, DateRange } from './workspace-analytics-filters';
import WorkspaceClicksTrendChart from './workspace-clicks-trend-chart';

// Tipi per i dati delle statistiche del workspace
type WorkspaceAnalytics = {
  total_links: number;
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
  avg_clicks_per_link: number;
  most_clicked_link: string | null;
  most_clicked_link_count: number;
  links_created_today: number;
  links_created_this_week: number;
  links_created_this_month: number;
};

type LinkData = {
  short_code: string;
  original_url: string;
  title: string | null;
  click_count: number;
  unique_click_count: number;
  created_at: Date;
};

type GeographicData = {
  country: string;
  clicks: number;
  percentage: number;
};

type DeviceData = {
  device_type: string;
  clicks: number;
  percentage: number;
};

type BrowserData = {
  browser_name: string;
  clicks: number;
  percentage: number;
};

type ReferrerData = {
  referrer: string;
  clicks: number;
  percentage: number;
};

type TimeSeriesData = {
  date: string;
  total_clicks: number;
  unique_clicks: number;
};

type MonthlyData = {
  month: string;
  month_number: number;
  year: number;
  total_clicks: number;
  unique_clicks: number;
};

type Props = {
  workspaceAnalytics: WorkspaceAnalytics;
  topLinks: LinkData[];
  geographicData: GeographicData[];
  deviceData: DeviceData[];
  browserData: BrowserData[];
  referrerData: ReferrerData[];
  dailyData: TimeSeriesData[];
  monthlyData: MonthlyData[];
};

export default function WorkspaceAnalyticsClient({
  workspaceAnalytics: initialWorkspaceAnalytics,
  topLinks: initialTopLinks,
  geographicData: initialGeographicData,
  deviceData,
  browserData,
  referrerData,
  dailyData: initialDailyData
}: Props) {
  // Stati per i dati che possono essere filtrati
  const [workspaceAnalytics, setWorkspaceAnalytics] = useState(initialWorkspaceAnalytics);
  const [topLinks, setTopLinks] = useState(initialTopLinks);
  const [geographicData, setGeographicData] = useState(initialGeographicData);
  const [dailyData, setDailyData] = useState(initialDailyData);
  
  // Stati per i filtri
  const [currentFilter, setCurrentFilter] = useState<DateFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });

  // Funzione helper per calcolare l'intervallo di date in base al filtro
  const getDateRangeFromFilter = useCallback((filter: DateFilter, customRange?: DateRange): { startDate: string; endDate: string } => {
    const now = new Date();
    const italianNow = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
    
    switch (filter) {
      case 'today':
        const currentHourItalian = new Date(italianNow);
        currentHourItalian.setMinutes(0, 0, 0); 
        const startHourItalian = new Date(currentHourItalian.getTime() - 23 * 60 * 60 * 1000);
        return { 
          startDate: startHourItalian.toISOString().replace('Z', '+02:00'),
          endDate: currentHourItalian.toISOString().replace('Z', '+02:00')
        };
      case 'week':
        const endDate = new Date(italianNow);
        endDate.setHours(23, 59, 59, 999);
        const weekAgo = new Date(italianNow.getTime() - 6 * 24 * 60 * 60 * 1000);
        weekAgo.setHours(0, 0, 0, 0);
        return { startDate: weekAgo.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] };
      case 'month':
        const endDateMonth = new Date(italianNow);
        endDateMonth.setHours(23, 59, 59, 999);
        const monthAgo = new Date(italianNow.getTime() - 29 * 24 * 60 * 60 * 1000);
        monthAgo.setHours(0, 0, 0, 0);
        return { startDate: monthAgo.toISOString().split('T')[0], endDate: endDateMonth.toISOString().split('T')[0] };
      case '3months':
        const endDate3M = new Date(italianNow);
        endDate3M.setHours(23, 59, 59, 999);
        const threeMonthsAgo = new Date(italianNow.getTime() - 89 * 24 * 60 * 60 * 1000);
        threeMonthsAgo.setHours(0, 0, 0, 0);
        return { startDate: threeMonthsAgo.toISOString().split('T')[0], endDate: endDate3M.toISOString().split('T')[0] };
      case 'year':
        const endDateYear = new Date(italianNow);
        endDateYear.setHours(23, 59, 59, 999);
        const yearAgo = new Date(italianNow.getTime() - 364 * 24 * 60 * 60 * 1000);
        yearAgo.setHours(0, 0, 0, 0);
        return { startDate: yearAgo.toISOString().split('T')[0], endDate: endDateYear.toISOString().split('T')[0] };
      case 'custom':
        if (customRange?.startDate && customRange?.endDate) {
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
  }, []);

  // Funzione per caricare i dati filtrati
  const loadFilteredData = useCallback(async (filter: DateFilter, customRange?: DateRange) => {
    try {
      let params: URLSearchParams;
      
      if (filter === 'all') {
        params = new URLSearchParams();
      } else {
        const { startDate, endDate } = getDateRangeFromFilter(filter, customRange);
        params = new URLSearchParams({
          startDate: startDate,
          endDate: endDate
        });
      }

      const response = await fetch(`/api/analytics/workspace?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei dati');
      }

      const data = await response.json();
      
      // Aggiorna gli stati con i nuovi dati
      setWorkspaceAnalytics(data.workspaceAnalytics);
      setTopLinks(data.topLinks);
      setGeographicData(data.geographicData);
      setDailyData(data.timeSeriesData || []);
      
    } catch (error) {
      console.error('Errore nel caricamento dei dati filtrati:', error);
    }
  }, [getDateRangeFromFilter]);

  // Handler per il cambio di filtro
  const handleFilterChange = useCallback((filter: DateFilter, customRange?: DateRange) => {
    setCurrentFilter(filter);
    if (customRange) {
      setDateRange(customRange);
    }
    loadFilteredData(filter, customRange);
  }, [loadFilteredData]);

  return (
    <div className="space-y-6">
      {/* Filtri */}
      <WorkspaceAnalyticsFilters
        currentFilter={currentFilter}
        dateRange={dateRange}
        onFilterChange={handleFilterChange}
      />

      {/* Statistiche Generali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-md border border-blue-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">Totale Link</h3>
          <p className="text-2xl font-black text-blue-700 mb-1">{workspaceAnalytics.total_links}</p>
          <p className="text-xs text-blue-600 font-medium">Link creati nel workspace</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-md border border-green-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
          </div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">Click Totali</h3>
          <p className="text-2xl font-black text-green-700 mb-1">{workspaceAnalytics.total_clicks.toLocaleString()}</p>
          <p className="text-xs text-green-600 font-medium">Click su tutti i link</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-md border border-purple-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">Click Unici</h3>
          <p className="text-2xl font-black text-purple-700 mb-1">{workspaceAnalytics.unique_clicks.toLocaleString()}</p>
          <p className="text-xs text-purple-600 font-medium">Click unici registrati</p>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl shadow-md border border-orange-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">Media Click/Link</h3>
          <p className="text-2xl font-black text-orange-700 mb-1">{workspaceAnalytics.avg_clicks_per_link.toFixed(1)}</p>
          <p className="text-xs text-orange-600 font-medium">Performance media</p>
        </div>
      </div>

      {/* Informazioni Principali */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-100 p-6 rounded-xl shadow-md border border-indigo-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg mr-3 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Link Più Cliccato</h3>
                <p className="text-sm text-gray-600">Performance migliore</p>
              </div>
            </div>
            <div className="p-2 bg-indigo-100 rounded-lg">
              <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
              </svg>
            </div>
          </div>
          {workspaceAnalytics.most_clicked_link ? (
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm font-mono text-indigo-700 mb-2 break-all font-medium">{workspaceAnalytics.most_clicked_link}</p>
              <p className="text-2xl font-black text-indigo-600">{workspaceAnalytics.most_clicked_link_count.toLocaleString()} click</p>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-lg">
              <p className="text-base text-gray-500">Nessun click registrato</p>
            </div>
          )}
        </div>
        
        <div className="bg-gradient-to-br from-emerald-50 to-teal-100 p-6 rounded-xl shadow-md border border-emerald-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg mr-3 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Browser Più Usato</h3>
                <p className="text-sm text-gray-600">Client preferito</p>
              </div>
            </div>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10Z"/>
              </svg>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-2xl font-black text-emerald-600">{workspaceAnalytics.most_used_browser || 'N/A'}</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-red-100 p-6 rounded-xl shadow-md border border-orange-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg mr-3 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Dispositivo Più Usato</h3>
                <p className="text-sm text-gray-600">Device preferito</p>
              </div>
            </div>
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21C5,22.11 5.89,23 7,23H17C18.11,23 19,22.11 19,21V3C19,1.89 18.11,1 17,1M16,13H13V16H11V13H8V11H11V8H13V11H16V13Z"/>
              </svg>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-2xl font-black text-orange-600">{workspaceAnalytics.most_used_device || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Grafico Andamento Click */}
      {dailyData.length > 0 && (
        <WorkspaceClicksTrendChart 
          data={dailyData} 
          filterType={currentFilter}
        />
      )}

      {/* Top Link */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mr-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800">Top 10 Link Performanti</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Link
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Titolo
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Click Totali
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Click Unici
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Creato
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topLinks.map((link, index) => (
                <tr key={link.short_code} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white font-bold text-xs">{index + 1}</span>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-blue-600 font-mono">{link.short_code}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{link.original_url}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{link.title || 'Senza titolo'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                      {link.click_count.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                      {link.unique_click_count.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-medium">
                    {new Date(link.created_at).toLocaleDateString('it-IT')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dati Geografici */}
      {geographicData.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800">Distribuzione Geografica</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {geographicData.map((geo, index) => (
              <div key={geo.country} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-sm transition-all duration-200">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-xs">{index + 1}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{geo.country}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{geo.clicks.toLocaleString()}</div>
                  <div className="text-xs text-gray-500 font-medium">{geo.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabelle di dettaglio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Browser */}
        {browserData.length > 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Browser Utilizzati</h3>
            </div>
            <div className="space-y-4">
              {browserData.map((browser, index) => (
                <div key={browser.browser_name} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-xs">{index + 1}</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-700">{browser.browser_name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-600">{browser.clicks.toLocaleString()}</div>
                    <div className="text-sm text-gray-500 font-medium">{browser.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dispositivi */}
        {deviceData.length > 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Dispositivi Utilizzati</h3>
            </div>
            <div className="space-y-4">
              {deviceData.map((device, index) => (
                <div key={device.device_type} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-xs">{index + 1}</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-700">{device.device_type}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-600">{device.clicks.toLocaleString()}</div>
                    <div className="text-sm text-gray-500 font-medium">{device.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Referrer */}
        {referrerData.length > 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 lg:col-span-2">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Sorgenti di Traffico</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {referrerData.map((referrer, index) => (
                <div key={referrer.referrer} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-xs">{index + 1}</span>
                    </div>
                    <span className="text-base font-semibold text-gray-700 truncate max-w-xs">{referrer.referrer}</span>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-lg font-bold text-teal-600">{referrer.clicks.toLocaleString()}</div>
                    <div className="text-sm text-gray-500 font-medium">{referrer.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Statistiche Periodo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800">Oggi</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">Click</span>
              <span className="text-lg font-bold text-blue-600">{workspaceAnalytics.clicks_today.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">Click Unici</span>
              <span className="text-lg font-bold text-blue-600">{workspaceAnalytics.unique_clicks_today.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">Link Creati</span>
              <span className="text-lg font-bold text-blue-600">{workspaceAnalytics.links_created_today}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800">Questa Settimana</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">Click</span>
              <span className="text-lg font-bold text-green-600">{workspaceAnalytics.clicks_this_week.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">Click Unici</span>
              <span className="text-lg font-bold text-green-600">{workspaceAnalytics.unique_clicks_this_week.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">Link Creati</span>
              <span className="text-lg font-bold text-green-600">{workspaceAnalytics.links_created_this_week}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800">Questo Mese</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">Click</span>
              <span className="text-lg font-bold text-purple-600">{workspaceAnalytics.clicks_this_month.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">Click Unici</span>
              <span className="text-lg font-bold text-purple-600">{workspaceAnalytics.unique_clicks_this_month.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">Link Creati</span>
              <span className="text-lg font-bold text-purple-600">{workspaceAnalytics.links_created_this_month}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiche Dettagliate */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-2xl shadow-lg border border-gray-200">
        <div className="flex items-center mb-8">
          <div className="p-3 bg-gradient-to-r from-gray-600 to-gray-800 rounded-xl mr-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Riepilogo Dettagliato</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              Diversità Audience
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-base text-gray-600 font-medium">Paesi unici</span>
                <span className="text-xl font-bold text-blue-600">{workspaceAnalytics.unique_countries}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-base text-gray-600 font-medium">Referrer unici</span>
                <span className="text-xl font-bold text-blue-600">{workspaceAnalytics.unique_referrers}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-base text-gray-600 font-medium">Dispositivi unici</span>
                <span className="text-xl font-bold text-blue-600">{workspaceAnalytics.unique_devices}</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Top Referrer
            </h4>
            <div className="p-4 bg-white rounded-lg">
              <p className="text-lg font-semibold text-gray-800">{workspaceAnalytics.top_referrer || 'Nessun referrer dominante'}</p>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
              Creazione Link
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-base text-gray-600 font-medium">Oggi</span>
                <span className="text-xl font-bold text-purple-600">{workspaceAnalytics.links_created_today}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-base text-gray-600 font-medium">Questa settimana</span>
                <span className="text-xl font-bold text-purple-600">{workspaceAnalytics.links_created_this_week}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-base text-gray-600 font-medium">Questo mese</span>
                <span className="text-xl font-bold text-purple-600">{workspaceAnalytics.links_created_this_month}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
