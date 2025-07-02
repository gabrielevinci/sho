'use client';

import { useState } from 'react';
import { ArrowLeft, ExternalLink, Calendar, Globe, Monitor, Smartphone, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import ClicksTrendChart from './clicks-trend-chart';
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
  unique_countries: number;
  top_referrer: string | null;
  most_used_browser: string | null;
  most_used_device: string | null;
  clicks_today: number;
  clicks_this_week: number;
  clicks_this_month: number;
};

type GeographicData = {
  country: string;
  clicks: number;
};

type DeviceData = {
  device_type: string;
  clicks: number;
};

type BrowserData = {
  browser_name: string;
  clicks: number;
};

type ReferrerData = {
  referrer: string;
  clicks: number;
};

type TimeSeriesData = {
  date: string;
  clicks: number;
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
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  
  switch (filter) {
    case 'today':
      return { startDate: endDate, endDate };
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: weekAgo.toISOString().split('T')[0], endDate };
    case 'month':
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: monthAgo.toISOString().split('T')[0], endDate };
    case '3months':
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { startDate: threeMonthsAgo.toISOString().split('T')[0], endDate };
    case 'year':
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return { startDate: yearAgo.toISOString().split('T')[0], endDate };
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
      
      const response = await fetch(`/api/analytics/${shortCode}?startDate=${startDate}&endDate=${endDate}`);
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

        {/* Grafico andamento temporale */}
        <ClicksTrendChart 
          data={data.timeSeriesData} 
          totalClicks={data.clickAnalytics.total_clicks}
          filterType={currentFilter}
          dateRange={dateRange.startDate && dateRange.endDate ? {
            startDate: dateRange.startDate.toISOString().split('T')[0],
            endDate: dateRange.endDate.toISOString().split('T')[0]
          } : undefined}
        />

        {/* Grafici e tabelle dettagliate */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Statistiche geografiche */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Globe className="h-5 w-5 mr-2 text-green-600" />
              Click per Paese
            </h3>
            {data.geographicData.length > 0 ? (
              <div className="space-y-3">
                {data.geographicData.map((country, index) => (
                  <div key={country.country} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-600 w-4">#{index + 1}</span>
                      <span className="text-sm text-gray-900">{country.country}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ 
                            width: `${(country.clicks / (data.clickAnalytics.total_clicks || 1)) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                        {country.clicks}
                      </span>
                    </div>
                  </div>
                ))}
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
              <div className="space-y-3">
                {data.deviceData.map((device) => (
                  <div key={device.device_type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {device.device_type === 'mobile' ? (
                        <Smartphone className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Monitor className="h-4 w-4 text-blue-600" />
                      )}
                      <span className="text-sm text-gray-900 capitalize">{device.device_type}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ 
                            width: `${(device.clicks / (data.clickAnalytics.total_clicks || 1)) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                        {device.clicks}
                      </span>
                    </div>
                  </div>
                ))}
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
              <div className="space-y-3">
                {data.browserData.map((browser, index) => (
                  <div key={browser.browser_name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-600 w-4">#{index + 1}</span>
                      <span className="text-sm text-gray-900">{browser.browser_name}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 transition-all duration-300"
                          style={{ 
                            width: `${(browser.clicks / (data.clickAnalytics.total_clicks || 1)) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                        {browser.clicks}
                      </span>
                    </div>
                  </div>
                ))}
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
              <div className="space-y-3">
                {data.referrerData.map((referrer, index) => (
                  <div key={referrer.referrer} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-600 w-4">#{index + 1}</span>
                      <span className="text-sm text-gray-900 truncate max-w-32">
                        {referrer.referrer === 'Direct' ? 'Diretto' : referrer.referrer}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500 transition-all duration-300"
                          style={{ 
                            width: `${(referrer.clicks / (data.clickAnalytics.total_clicks || 1)) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                        {referrer.clicks}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nessun dato disponibile</p>
            )}
          </div>
        </div>

        {/* Statistiche temporali */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            Andamento Temporale
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{data.clickAnalytics.clicks_today}</div>
              <div className="text-sm text-gray-500 mt-1">Oggi</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{data.clickAnalytics.clicks_this_week}</div>
              <div className="text-sm text-gray-500 mt-1">Ultimi 7 giorni</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{data.clickAnalytics.clicks_this_month}</div>
              <div className="text-sm text-gray-500 mt-1">Ultimi 30 giorni</div>
            </div>
          </div>
        </div>

        {/* Informazioni aggiuntive */}
        {(data.clickAnalytics.top_referrer || data.clickAnalytics.most_used_browser || data.clickAnalytics.most_used_device) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiche Principali</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.clickAnalytics.top_referrer && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Sorgente Principale</div>
                  <div className="text-lg font-semibold text-gray-900 truncate">
                    {data.clickAnalytics.top_referrer === 'Direct' ? 'Diretto' : data.clickAnalytics.top_referrer}
                  </div>
                </div>
              )}
              {data.clickAnalytics.most_used_browser && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Browser Principale</div>
                  <div className="text-lg font-semibold text-gray-900">{data.clickAnalytics.most_used_browser}</div>
                </div>
              )}
              {data.clickAnalytics.most_used_device && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Dispositivo Principale</div>
                  <div className="text-lg font-semibold text-gray-900 capitalize">{data.clickAnalytics.most_used_device}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
