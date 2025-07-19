'use client';

import { useState, useCallback, useEffect } from 'react';
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
  // Dati per il periodo filtrato
  filtered_period_name: string;
  filtered_period_clicks: number;
  filtered_period_unique_clicks: number;
  filtered_period_links_created: number;
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
  deviceData: initialDeviceData,
  browserData: initialBrowserData,
  referrerData: initialReferrerData,
  dailyData: initialDailyData
}: Props) {
  // Funzione per assicurarsi che i dati abbiano tutti i campi necessari
  const normalizeWorkspaceAnalytics = (data: Partial<WorkspaceAnalytics> | null | undefined): WorkspaceAnalytics => {
    return {
      total_links: Number(data?.total_links) || 0,
      total_clicks: Number(data?.total_clicks) || 0,
      unique_clicks: Number(data?.unique_clicks) || 0,
      unique_countries: Number(data?.unique_countries) || 0,
      unique_referrers: Number(data?.unique_referrers) || 0,
      unique_devices: Number(data?.unique_devices) || 0,
      top_referrer: data?.top_referrer || null,
      most_used_browser: data?.most_used_browser || null,
      most_used_device: data?.most_used_device || null,
      clicks_today: Number(data?.clicks_today) || 0,
      clicks_this_week: Number(data?.clicks_this_week) || 0,
      clicks_this_month: Number(data?.clicks_this_month) || 0,
      unique_clicks_today: Number(data?.unique_clicks_today) || 0,
      unique_clicks_this_week: Number(data?.unique_clicks_this_week) || 0,
      unique_clicks_this_month: Number(data?.unique_clicks_this_month) || 0,
      avg_clicks_per_link: Number(data?.avg_clicks_per_link) || 0,
      most_clicked_link: data?.most_clicked_link || null,
      most_clicked_link_count: Number(data?.most_clicked_link_count) || 0,
      links_created_today: Number(data?.links_created_today) || 0,
      links_created_this_week: Number(data?.links_created_this_week) || 0,
      links_created_this_month: Number(data?.links_created_this_month) || 0,
      // Dati per il periodo filtrato
      filtered_period_name: data?.filtered_period_name || 'Periodo selezionato',
      filtered_period_clicks: Number(data?.filtered_period_clicks) || 0,
      filtered_period_unique_clicks: Number(data?.filtered_period_unique_clicks) || 0,
      filtered_period_links_created: Number(data?.filtered_period_links_created) || 0,
    };
  };

  // Stati per i dati che possono essere filtrati
  const [workspaceAnalytics, setWorkspaceAnalytics] = useState(() => 
    normalizeWorkspaceAnalytics(initialWorkspaceAnalytics)
  );
  const [topLinks, setTopLinks] = useState(initialTopLinks);
  const [geographicData, setGeographicData] = useState(initialGeographicData);
  const [deviceData, setDeviceData] = useState(initialDeviceData);
  const [browserData, setBrowserData] = useState(initialBrowserData);
  const [referrerData, setReferrerData] = useState(initialReferrerData);
  const [dailyData, setDailyData] = useState(initialDailyData);
  
  // Stati per i filtri
  const [currentFilter, setCurrentFilter] = useState<DateFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Funzione helper per calcolare l'intervallo di date in base al filtro
  const getDateRangeFromFilter = useCallback((filter: DateFilter, customRange?: DateRange): { startDate: string; endDate: string } => {
    const now = new Date();
    const italianNow = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
    
    switch (filter) {
      case 'today':
        const todayStart = new Date(italianNow);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(italianNow);
        todayEnd.setHours(23, 59, 59, 999);
        return { 
          startDate: todayStart.toISOString().replace('Z', '+02:00'),
          endDate: todayEnd.toISOString().replace('Z', '+02:00')
        };
      case 'week':
        const endDate = new Date(italianNow);
        endDate.setHours(23, 59, 59, 999);
        const weekAgo = new Date(italianNow.getTime() - 6 * 24 * 60 * 60 * 1000);
        weekAgo.setHours(0, 0, 0, 0);
        return { 
          startDate: weekAgo.toISOString().replace('Z', '+02:00'), 
          endDate: endDate.toISOString().replace('Z', '+02:00') 
        };
      case 'month':
        const endDateMonth = new Date(italianNow);
        endDateMonth.setHours(23, 59, 59, 999);
        const monthAgo = new Date(italianNow.getTime() - 29 * 24 * 60 * 60 * 1000);
        monthAgo.setHours(0, 0, 0, 0);
        return { 
          startDate: monthAgo.toISOString().replace('Z', '+02:00'), 
          endDate: endDateMonth.toISOString().replace('Z', '+02:00') 
        };
      case '3months':
        const endDate3M = new Date(italianNow);
        endDate3M.setHours(23, 59, 59, 999);
        const threeMonthsAgo = new Date(italianNow.getTime() - 89 * 24 * 60 * 60 * 1000);
        threeMonthsAgo.setHours(0, 0, 0, 0);
        return { 
          startDate: threeMonthsAgo.toISOString().replace('Z', '+02:00'), 
          endDate: endDate3M.toISOString().replace('Z', '+02:00') 
        };
      case 'year':
        const endDateYear = new Date(italianNow);
        endDateYear.setHours(23, 59, 59, 999);
        const yearAgo = new Date(italianNow.getTime() - 364 * 24 * 60 * 60 * 1000);
        yearAgo.setHours(0, 0, 0, 0);
        return { 
          startDate: yearAgo.toISOString().replace('Z', '+02:00'), 
          endDate: endDateYear.toISOString().replace('Z', '+02:00') 
        };
      case 'custom':
        if (customRange?.startDate && customRange?.endDate) {
          const startDate = new Date(customRange.startDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(customRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          return {
            startDate: startDate.toISOString().replace('Z', '+02:00'),
            endDate: endDate.toISOString().replace('Z', '+02:00')
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
    setIsLoading(true);
    try {
      let params: URLSearchParams;
      let periodName = '';
      
      if (filter === 'all') {
        params = new URLSearchParams();
        periodName = 'Tutti i dati';
      } else {
        const { startDate, endDate } = getDateRangeFromFilter(filter, customRange);
        params = new URLSearchParams({
          startDate: startDate,
          endDate: endDate
        });
        
        // Determina il nome del periodo in base al filtro
        switch (filter) {
          case 'today':
            periodName = 'Oggi';
            break;
          case 'week':
            periodName = 'Ultimi 7 giorni';
            break;
          case 'month':
            periodName = 'Ultimi 30 giorni';
            break;
          case '3months':
            periodName = 'Ultimi 90 giorni';
            break;
          case 'year':
            periodName = 'Ultimo anno';
            break;
          case 'custom':
            if (customRange?.startDate && customRange?.endDate) {
              const start = new Date(customRange.startDate).toLocaleDateString('it-IT');
              const end = new Date(customRange.endDate).toLocaleDateString('it-IT');
              periodName = `Dal ${start} al ${end}`;
            } else {
              periodName = 'Periodo personalizzato';
            }
            break;
        }
      }

      const response = await fetch(`/api/analytics/workspace?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei dati');
      }

      const data = await response.json();
      
      // Arricchisci i dati con informazioni sul periodo filtrato
      const rawAnalytics = data.workspaceAnalytics || {};
      const enhancedAnalytics = {
        ...rawAnalytics,
        filtered_period_name: periodName,
        filtered_period_clicks: Number(rawAnalytics.total_clicks) || 0,
        filtered_period_unique_clicks: Number(rawAnalytics.unique_clicks) || 0,
        filtered_period_links_created: Number(rawAnalytics.total_links) || 0,
      };
      
      // Aggiorna gli stati con i nuovi dati normalizzati
      setWorkspaceAnalytics(normalizeWorkspaceAnalytics(enhancedAnalytics));
      setTopLinks(data.topLinks || []);
      setGeographicData(data.geographicData || []);
      setDeviceData(data.deviceData || []);
      setBrowserData(data.browserData || []);
      setReferrerData(data.referrerData || []);
      setDailyData(data.timeSeriesData || []);
      
    } catch (error) {
      console.error('Errore nel caricamento dei dati filtrati:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getDateRangeFromFilter]);

  // Al primo caricamento, carica i dati per il filtro "all"
  useEffect(() => {
    if (isInitialLoad) {
      loadFilteredData('all');
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, loadFilteredData]);

  // Handler per il cambio di filtro
  const handleFilterChange = useCallback((filter: DateFilter, customRange?: DateRange) => {
    setCurrentFilter(filter);
    if (customRange) {
      setDateRange(customRange);
    }
    loadFilteredData(filter, customRange);
  }, [loadFilteredData]);

  return (
    <div className="space-y-8">
      {/* Filtri */}
      <WorkspaceAnalyticsFilters
        currentFilter={currentFilter}
        dateRange={dateRange}
        onFilterChange={handleFilterChange}
      />

      {/* Statistiche Generali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Totale Link</p>
              {isLoading ? (
                <div className="animate-pulse bg-slate-200 h-8 w-16 rounded mt-1"></div>
              ) : (
                <p className="text-2xl font-semibold text-slate-900 mt-1">{workspaceAnalytics.total_links}</p>
              )}
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Click Totali</p>
              {isLoading ? (
                <div className="animate-pulse bg-slate-200 h-8 w-20 rounded mt-1"></div>
              ) : (
                <p className="text-2xl font-semibold text-slate-900 mt-1">{workspaceAnalytics.total_clicks.toLocaleString()}</p>
              )}
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Click Unici</p>
              {isLoading ? (
                <div className="animate-pulse bg-slate-200 h-8 w-20 rounded mt-1"></div>
              ) : (
                <p className="text-2xl font-semibold text-slate-900 mt-1">{workspaceAnalytics.unique_clicks.toLocaleString()}</p>
              )}
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Media Click/Link</p>
              {isLoading ? (
                <div className="animate-pulse bg-slate-200 h-8 w-16 rounded mt-1"></div>
              ) : (
                <p className="text-2xl font-semibold text-slate-900 mt-1">{workspaceAnalytics.avg_clicks_per_link.toFixed(1)}</p>
              )}
            </div>
            <div className="p-2 bg-orange-50 rounded-lg">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Informazioni Principali */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-slate-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Link Più Cliccato</h3>
              <p className="text-sm text-slate-500">Performance migliore</p>
            </div>
          </div>
          {workspaceAnalytics.most_clicked_link ? (
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm font-mono text-slate-700 mb-2 break-all">{workspaceAnalytics.most_clicked_link}</p>
              <p className="text-lg font-semibold text-slate-900">{workspaceAnalytics.most_clicked_link_count.toLocaleString()} click</p>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-slate-500">Nessun click registrato</p>
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-slate-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Browser Più Usato</h3>
              <p className="text-sm text-slate-500">Client preferito</p>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-lg font-semibold text-slate-900">{workspaceAnalytics.most_used_browser || 'N/A'}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-slate-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 012 2h2a2 2 0 002-2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Dispositivo Più Usato</h3>
              <p className="text-sm text-slate-500">Device preferito</p>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-lg font-semibold text-slate-900">{workspaceAnalytics.most_used_device || 'N/A'}</p>
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
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-slate-100 rounded-lg mr-3">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-900">Top 10 Link Performanti</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Link
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Titolo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Click Totali
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Click Unici
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Creato
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topLinks.map((link, index) => (
                <tr key={link.short_code} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-6 h-6 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center mr-3 text-xs font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 font-mono">{link.short_code}</div>
                        <div className="text-xs text-slate-500 truncate max-w-xs">{link.original_url}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{link.title || 'Senza titolo'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">
                      {link.click_count.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                      {link.unique_click_count.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
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
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-slate-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900">Distribuzione Geografica</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {geographicData.map((geo, index) => (
              <div key={geo.country} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center mr-3 text-xs font-medium">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-slate-900">{geo.country}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{geo.clicks.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">{geo.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabelle di dettaglio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Browser */}
        {browserData.length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-slate-100 rounded-lg mr-3">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">Browser Utilizzati</h3>
            </div>
            <div className="space-y-3">
              {browserData.map((browser, index) => (
                <div key={browser.browser_name} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center mr-3 text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-slate-900">{browser.browser_name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">{browser.clicks.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">{browser.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dispositivi */}
        {deviceData.length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-slate-100 rounded-lg mr-3">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">Dispositivi Utilizzati</h3>
            </div>
            <div className="space-y-3">
              {deviceData.map((device, index) => (
                <div key={device.device_type} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center mr-3 text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-slate-900">{device.device_type}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">{device.clicks.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">{device.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Referrer */}
        {referrerData.length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-slate-200 lg:col-span-2">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-slate-100 rounded-lg mr-3">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">Sorgenti di Traffico</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {referrerData.map((referrer, index) => (
                <div key={referrer.referrer} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center mr-3 text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-slate-900 truncate max-w-xs">{referrer.referrer}</span>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm font-semibold text-slate-900">{referrer.clicks.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">{referrer.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Statistiche Periodo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-slate-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900">{workspaceAnalytics.filtered_period_name}</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Click</span>
              <span className="text-sm font-semibold text-slate-900">{workspaceAnalytics.filtered_period_clicks.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Click Unici</span>
              <span className="text-sm font-semibold text-slate-900">{workspaceAnalytics.filtered_period_unique_clicks.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Link</span>
              <span className="text-sm font-semibold text-slate-900">{workspaceAnalytics.filtered_period_links_created}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-slate-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900">Questa Settimana</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Click</span>
              <span className="text-sm font-semibold text-slate-900">{workspaceAnalytics.clicks_this_week.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Click Unici</span>
              <span className="text-sm font-semibold text-slate-900">{workspaceAnalytics.unique_clicks_this_week.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Link Creati</span>
              <span className="text-sm font-semibold text-slate-900">{workspaceAnalytics.links_created_this_week}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-slate-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900">Questo Mese</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Click</span>
              <span className="text-sm font-semibold text-slate-900">{workspaceAnalytics.clicks_this_month.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Click Unici</span>
              <span className="text-sm font-semibold text-slate-900">{workspaceAnalytics.unique_clicks_this_month.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Link Creati</span>
              <span className="text-sm font-semibold text-slate-900">{workspaceAnalytics.links_created_this_month}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
