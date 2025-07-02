import { getSession } from '@/app/lib/session';
import { redirect, notFound } from 'next/navigation';
import { sql } from '@vercel/postgres';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Calendar, MousePointer, Globe, Monitor, Smartphone, BarChart3 } from 'lucide-react';

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

// Funzione per ottenere i dati del link
async function getLinkData(userId: string, workspaceId: string, shortCode: string): Promise<LinkAnalytics | null> {
  try {
    const { rows } = await sql<LinkAnalytics>`
      SELECT short_code, original_url, title, description, click_count, created_at
      FROM links
      WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
      LIMIT 1
    `;
    return rows[0] || null;
  } catch (error) {
    console.error("Failed to fetch link data:", error);
    return null;
  }
}

// Funzione per ottenere le statistiche di base del link
async function getClickAnalytics(userId: string, workspaceId: string, shortCode: string): Promise<ClickAnalytics> {
  try {
    const { rows } = await sql<ClickAnalytics>`
      WITH link_data AS (
        SELECT id FROM links 
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId} AND short_code = ${shortCode}
      ),
      click_stats AS (
        SELECT 
          COUNT(*) as total_clicks,
          COUNT(DISTINCT country) as unique_countries,
          COUNT(CASE WHEN clicked_at::date = CURRENT_DATE THEN 1 END) as clicks_today,
          COUNT(CASE WHEN clicked_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as clicks_this_week,
          COUNT(CASE WHEN clicked_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as clicks_this_month
        FROM clicks c
        JOIN link_data ld ON c.link_id = ld.id
      ),
      top_stats AS (
        SELECT 
          (SELECT referrer FROM clicks c JOIN link_data ld ON c.link_id = ld.id 
           WHERE referrer != 'Direct' GROUP BY referrer ORDER BY COUNT(*) DESC LIMIT 1) as top_referrer,
          (SELECT browser_name FROM clicks c JOIN link_data ld ON c.link_id = ld.id 
           GROUP BY browser_name ORDER BY COUNT(*) DESC LIMIT 1) as most_used_browser,
          (SELECT device_type FROM clicks c JOIN link_data ld ON c.link_id = ld.id 
           GROUP BY device_type ORDER BY COUNT(*) DESC LIMIT 1) as most_used_device
      )
      SELECT 
        cs.total_clicks,
        cs.unique_countries,
        ts.top_referrer,
        ts.most_used_browser,
        ts.most_used_device,
        cs.clicks_today,
        cs.clicks_this_week,
        cs.clicks_this_month
      FROM click_stats cs, top_stats ts
    `;
    return rows[0] || {
      total_clicks: 0,
      unique_countries: 0,
      top_referrer: null,
      most_used_browser: null,
      most_used_device: null,
      clicks_today: 0,
      clicks_this_week: 0,
      clicks_this_month: 0
    };
  } catch (error) {
    console.error("Failed to fetch click analytics:", error);
    return {
      total_clicks: 0,
      unique_countries: 0,
      top_referrer: null,
      most_used_browser: null,
      most_used_device: null,
      clicks_today: 0,
      clicks_this_week: 0,
      clicks_this_month: 0
    };
  }
}

// Funzione per ottenere i dati geografici
async function getGeographicData(userId: string, workspaceId: string, shortCode: string): Promise<GeographicData[]> {
  try {
    const { rows } = await sql<GeographicData>`
      SELECT country, COUNT(*) as clicks
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
      GROUP BY country
      ORDER BY clicks DESC
      LIMIT 10
    `;
    return rows;
  } catch (error) {
    console.error("Failed to fetch geographic data:", error);
    return [];
  }
}

// Funzione per ottenere i dati dei dispositivi
async function getDeviceData(userId: string, workspaceId: string, shortCode: string): Promise<DeviceData[]> {
  try {
    const { rows } = await sql<DeviceData>`
      SELECT device_type, COUNT(*) as clicks
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
      GROUP BY device_type
      ORDER BY clicks DESC
    `;
    return rows;
  } catch (error) {
    console.error("Failed to fetch device data:", error);
    return [];
  }
}

// Funzione per ottenere i dati dei browser
async function getBrowserData(userId: string, workspaceId: string, shortCode: string): Promise<BrowserData[]> {
  try {
    const { rows } = await sql<BrowserData>`
      SELECT browser_name, COUNT(*) as clicks
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
      GROUP BY browser_name
      ORDER BY clicks DESC
      LIMIT 10
    `;
    return rows;
  } catch (error) {
    console.error("Failed to fetch browser data:", error);
    return [];
  }
}

// Funzione per ottenere i dati dei referrer
async function getReferrerData(userId: string, workspaceId: string, shortCode: string): Promise<ReferrerData[]> {
  try {
    const { rows } = await sql<ReferrerData>`
      SELECT referrer, COUNT(*) as clicks
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId} AND l.short_code = ${shortCode}
      GROUP BY referrer
      ORDER BY clicks DESC
      LIMIT 10
    `;
    return rows;
  } catch (error) {
    console.error("Failed to fetch referrer data:", error);
    return [];
  }
}

export default async function AnalyticsPage({ 
  params 
}: { 
  params: Promise<{ shortCode: string }> 
}) {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
    redirect('/login');
  }

  const { shortCode } = await params;
  
  // Otteniamo tutti i dati in parallelo per ottimizzare le performance
  const [linkData, clickAnalytics, geographicData, deviceData, browserData, referrerData] = await Promise.all([
    getLinkData(session.userId, session.workspaceId, shortCode),
    getClickAnalytics(session.userId, session.workspaceId, shortCode),
    getGeographicData(session.userId, session.workspaceId, shortCode),
    getDeviceData(session.userId, session.workspaceId, shortCode),
    getBrowserData(session.userId, session.workspaceId, shortCode),
    getReferrerData(session.userId, session.workspaceId, shortCode)
  ]);

  if (!linkData) {
    notFound();
  }

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

        {/* Intestazione del link */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Statistiche Link
                </h1>
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-gray-800">
                  {linkData.title || 'Link senza titolo'}
                </h2>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <code className="bg-gray-100 px-2 py-1 rounded text-blue-600 font-medium">
                    /{shortCode}
                  </code>
                  <span>→</span>
                  <a 
                    href={linkData.original_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 truncate max-w-md"
                  >
                    <span className="truncate">{linkData.original_url}</span>
                    <ExternalLink className="h-4 w-4 flex-shrink-0" />
                  </a>
                </div>
                {linkData.description && (
                  <p className="text-gray-600 text-sm">{linkData.description}</p>
                )}
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>Creato il {new Date(linkData.created_at).toLocaleDateString('it-IT', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                  })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiche principali */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <MousePointer className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Click Totali</p>
                <p className="text-2xl font-semibold text-gray-900">{clickAnalytics.total_clicks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Paesi Unici</p>
                <p className="text-2xl font-semibold text-gray-900">{clickAnalytics.unique_countries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Oggi</p>
                <p className="text-2xl font-semibold text-gray-900">{clickAnalytics.clicks_today}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Questa Settimana</p>
                <p className="text-2xl font-semibold text-gray-900">{clickAnalytics.clicks_this_week}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grafici e tabelle dettagliate */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Statistiche geografiche */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Globe className="h-5 w-5 mr-2 text-green-600" />
              Click per Paese
            </h3>
            {geographicData.length > 0 ? (
              <div className="space-y-3">
                {geographicData.map((country, index) => (
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
                            width: `${(country.clicks / (clickAnalytics.total_clicks || 1)) * 100}%` 
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
            {deviceData.length > 0 ? (
              <div className="space-y-3">
                {deviceData.map((device) => (
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
                            width: `${(device.clicks / (clickAnalytics.total_clicks || 1)) * 100}%` 
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
            {browserData.length > 0 ? (
              <div className="space-y-3">
                {browserData.map((browser, index) => (
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
                            width: `${(browser.clicks / (clickAnalytics.total_clicks || 1)) * 100}%` 
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
            {referrerData.length > 0 ? (
              <div className="space-y-3">
                {referrerData.map((referrer, index) => (
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
                            width: `${(referrer.clicks / (clickAnalytics.total_clicks || 1)) * 100}%` 
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
              <div className="text-3xl font-bold text-gray-900">{clickAnalytics.clicks_today}</div>
              <div className="text-sm text-gray-500 mt-1">Oggi</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{clickAnalytics.clicks_this_week}</div>
              <div className="text-sm text-gray-500 mt-1">Ultimi 7 giorni</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{clickAnalytics.clicks_this_month}</div>
              <div className="text-sm text-gray-500 mt-1">Ultimi 30 giorni</div>
            </div>
          </div>
        </div>

        {/* Informazioni aggiuntive */}
        {(clickAnalytics.top_referrer || clickAnalytics.most_used_browser || clickAnalytics.most_used_device) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiche Principali</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {clickAnalytics.top_referrer && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Sorgente Principale</div>
                  <div className="text-lg font-semibold text-gray-900 truncate">
                    {clickAnalytics.top_referrer === 'Direct' ? 'Diretto' : clickAnalytics.top_referrer}
                  </div>
                </div>
              )}
              {clickAnalytics.most_used_browser && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Browser Principale</div>
                  <div className="text-lg font-semibold text-gray-900">{clickAnalytics.most_used_browser}</div>
                </div>
              )}
              {clickAnalytics.most_used_device && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Dispositivo Principale</div>
                  <div className="text-lg font-semibold text-gray-900 capitalize">{clickAnalytics.most_used_device}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
