'use client';

import { useState, useEffect } from 'react';

interface AdvancedFingerprintData {
  link: {
    shortCode: string;
    title: string;
  };
  stats: {
    unique_visitors: number;
    total_visits: number;
    avg_page_load_time: number;
    avg_time_on_page: number;
    total_keystrokes: number;
    unique_countries: number;
    unique_cities: number;
    unique_platforms: number;
    touch_devices: number;
    high_dpi_devices: number;
  };
  fingerprints: Array<{
    fingerprint_hash: string;
    user_agent: string;
    platform: string;
    screen_width: number;
    screen_height: number;
    timezone: string;
    country: string;
    city: string;
    first_seen: string;
    last_seen: string;
    visit_count: number;
    total_time_on_page: number;
    total_keystrokes: number;
    page_load_time: number;
    total_interactions: number;
  }>;
  analytics: {
    topBrowsers: Array<{ user_agent: string; count: number; unique_visitors: number }>;
    topCountries: Array<{ country: string; count: number; unique_visitors: number }>;
    deviceTypes: Array<{ device_category: string; count: number; unique_visitors: number }>;
    screenResolutions: Array<{ resolution: string; count: number; unique_visitors: number }>;
    timezones: Array<{ timezone: string; count: number; unique_visitors: number }>;
    browserFeatures: Array<{ 
      local_storage: boolean; 
      session_storage: boolean; 
      indexed_db: boolean; 
      cookie_enabled: boolean; 
      count: number; 
    }>;
    connectionTypes: Array<{ connection_type: string; count: number; unique_visitors: number }>;
    canvasFingerprints: {
      unique_canvas_fingerprints: number;
      unique_audio_fingerprints: number;
      unique_webgl_fingerprints: number;
    };
  };
}

interface Props {
  shortCode: string;
}

export default function AdvancedFingerprintAnalytics({ shortCode }: Props) {
  const [data, setData] = useState<AdvancedFingerprintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/analytics/advanced/${shortCode}`);
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shortCode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Caricamento analytics avanzate...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Errore nel caricamento</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-8 text-gray-500">
        Nessun dato disponibile per questo link.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Analytics Avanzate - Fingerprinting</h1>
        <p className="text-lg opacity-90">{data.link.title || data.link.shortCode}</p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{data.stats.unique_visitors}</div>
            <div className="text-sm opacity-80">Visitatori Unici</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{data.stats.total_visits}</div>
            <div className="text-sm opacity-80">Visite Totali</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.round(data.stats.avg_page_load_time || 0)}ms</div>
            <div className="text-sm opacity-80">Caricamento Medio</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.round((data.stats.avg_time_on_page || 0) / 1000)}s</div>
            <div className="text-sm opacity-80">Tempo Medio</div>
          </div>
        </div>
      </div>

      {/* Diversità Fingerprint */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Diversità Fingerprint</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
            <div className="text-3xl font-bold text-green-700">{data.analytics.canvasFingerprints.unique_canvas_fingerprints}</div>
            <div className="text-sm text-green-600 font-medium">Canvas Fingerprint Unici</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <div className="text-3xl font-bold text-blue-700">{data.analytics.canvasFingerprints.unique_audio_fingerprints}</div>
            <div className="text-sm text-blue-600 font-medium">Audio Fingerprint Unici</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
            <div className="text-3xl font-bold text-purple-700">{data.analytics.canvasFingerprints.unique_webgl_fingerprints}</div>
            <div className="text-sm text-purple-600 font-medium">WebGL Fingerprint Unici</div>
          </div>
        </div>
      </div>

      {/* Statistiche Hardware */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Informazioni Hardware</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700">{data.stats.unique_platforms}</div>
            <div className="text-sm text-gray-600">Piattaforme Diverse</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700">{data.stats.touch_devices}</div>
            <div className="text-sm text-gray-600">Dispositivi Touch</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700">{data.stats.high_dpi_devices}</div>
            <div className="text-sm text-gray-600">Schermi High-DPI</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700">{data.stats.unique_countries}</div>
            <div className="text-sm text-gray-600">Paesi Diversi</div>
          </div>
        </div>
      </div>

      {/* Device Types */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Tipi di Dispositivo</h2>
        <div className="space-y-3">
          {data.analytics.deviceTypes.map((device, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="font-semibold text-gray-700">{device.device_category}</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-800">{device.count} visite</div>
                <div className="text-sm text-gray-600">{device.unique_visitors} unici</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Screen Resolutions */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Risoluzioni Schermo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.analytics.screenResolutions.map((resolution, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="font-semibold text-gray-700">{resolution.resolution}</div>
              <div className="text-right">
                <div className="font-bold text-gray-800">{resolution.count}</div>
                <div className="text-sm text-gray-600">{resolution.unique_visitors} unici</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Countries */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Paesi Principali</h2>
        <div className="space-y-3">
          {data.analytics.topCountries.map((country, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-xs">{index + 1}</span>
                </div>
                <span className="font-semibold text-gray-700">{country.country}</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-800">{country.count} visite</div>
                <div className="text-sm text-gray-600">{country.unique_visitors} unici</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timezones */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Fusi Orari</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.analytics.timezones.map((tz, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="font-semibold text-gray-700 truncate">{tz.timezone}</div>
              <div className="text-right ml-4">
                <div className="font-bold text-gray-800">{tz.count}</div>
                <div className="text-sm text-gray-600">{tz.unique_visitors} unici</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connection Types */}
      {data.analytics.connectionTypes.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Tipi di Connessione</h2>
          <div className="space-y-3">
            {data.analytics.connectionTypes.map((conn, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-700">{conn.connection_type}</div>
                <div className="text-right">
                  <div className="font-bold text-gray-800">{conn.count}</div>
                  <div className="text-sm text-gray-600">{conn.unique_visitors} unici</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browser Features */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Supporto Funzionalità Browser</h2>
        <div className="space-y-3">
          {data.analytics.browserFeatures.map((feature, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-700">Configurazione #{index + 1}</span>
                <span className="text-lg font-bold text-gray-800">{feature.count} visitatori</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className={`p-2 rounded ${feature.local_storage ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  LocalStorage: {feature.local_storage ? '✓' : '✗'}
                </div>
                <div className={`p-2 rounded ${feature.session_storage ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  SessionStorage: {feature.session_storage ? '✓' : '✗'}
                </div>
                <div className={`p-2 rounded ${feature.indexed_db ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  IndexedDB: {feature.indexed_db ? '✓' : '✗'}
                </div>
                <div className={`p-2 rounded ${feature.cookie_enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  Cookies: {feature.cookie_enabled ? '✓' : '✗'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dettagli Fingerprint Individuali */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Dettagli Visitatori ({data.fingerprints.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Fingerprint</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Posizione</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Schermo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Visite</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tempo Totale</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Prima/Ultima</th>
              </tr>
            </thead>
            <tbody>
              {data.fingerprints.slice(0, 20).map((fp, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-mono text-sm text-blue-600">{fp.fingerprint_hash}</div>
                    <div className="text-xs text-gray-500 truncate max-w-xs">{fp.user_agent}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-semibold">{fp.country}</div>
                    <div className="text-xs text-gray-500">{fp.city}</div>
                    <div className="text-xs text-gray-500">{fp.timezone}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-semibold">{fp.screen_width}x{fp.screen_height}</div>
                    <div className="text-xs text-gray-500">{fp.platform}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-semibold">{fp.visit_count}</div>
                    <div className="text-xs text-gray-500">{fp.total_interactions} interazioni</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-semibold">{Math.round(fp.total_time_on_page / 1000)}s</div>
                    <div className="text-xs text-gray-500">{fp.total_keystrokes} keypress</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-xs text-gray-500">
                      Prima: {new Date(fp.first_seen).toLocaleDateString('it-IT')}
                    </div>
                    <div className="text-xs text-gray-500">
                      Ultima: {new Date(fp.last_seen).toLocaleDateString('it-IT')}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.fingerprints.length > 20 && (
            <div className="text-center py-4 text-gray-500">
              ... e altri {data.fingerprints.length - 20} visitatori
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
