'use client';

import { useState } from 'react';
import { collectAdvancedFingerprint, AdvancedFingerprint } from '../../../lib/advanced-fingerprint';

export default function FingerprintTestPage() {
  const [fingerprint, setFingerprint] = useState<AdvancedFingerprint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const collectFingerprint = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const fp = await collectAdvancedFingerprint();
      setFingerprint(fp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la raccolta del fingerprint');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Sì' : 'No';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'Nessuno';
    if (typeof value === 'object') return JSON.stringify(value);
    if (key.includes('fingerprint') && typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return String(value);
  };

  const getFieldDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      userAgent: 'Stringa user agent del browser',
      language: 'Lingua principale del browser',
      languages: 'Tutte le lingue supportate',
      platform: 'Piattaforma del sistema operativo',
      cookieEnabled: 'Supporto per i cookie',
      doNotTrack: 'Impostazione Do Not Track',
      screenWidth: 'Larghezza dello schermo in pixel',
      screenHeight: 'Altezza dello schermo in pixel',
      screenColorDepth: 'Profondità colore dello schermo',
      devicePixelRatio: 'Rapporto pixel del dispositivo',
      viewportWidth: 'Larghezza area visibile',
      viewportHeight: 'Altezza area visibile',
      timezone: 'Fuso orario del dispositivo',
      timezoneOffset: 'Offset fuso orario in minuti',
      hardwareConcurrency: 'Numero di core CPU logici',
      maxTouchPoints: 'Punti di tocco massimi supportati',
      audioFingerprint: 'Fingerprint basato su AudioContext',
      canvasFingerprint: 'Fingerprint basato su Canvas 2D',
      webglVendor: 'Produttore della GPU WebGL',
      webglRenderer: 'Renderer della GPU WebGL',
      webglFingerprint: 'Fingerprint basato su WebGL',
      availableFonts: 'Font installati e rilevabili',
      plugins: 'Plugin del browser installati',
      localStorage: 'Supporto per localStorage',
      sessionStorage: 'Supporto per sessionStorage',
      indexedDB: 'Supporto per IndexedDB',
      webSQL: 'Supporto per WebSQL (deprecato)',
      connectionType: 'Tipo di connessione di rete',
      connectionSpeed: 'Velocità della connessione',
      batteryLevel: 'Livello batteria (se disponibile)',
      batteryCharging: 'Stato ricarica batteria',
      mediaDevices: 'Dispositivi media disponibili',
      performanceFingerprint: 'Fingerprint basato su performance',
      cssFeatures: 'Funzionalità CSS supportate',
      jsFeatures: 'Funzionalità JavaScript supportate',
      fingerprintHash: 'Hash finale univoco del fingerprint'
    };
    return descriptions[key] || 'Parametro del fingerprint';
  };

  const getFieldCategory = (key: string): string => {
    if (['userAgent', 'language', 'languages', 'platform', 'cookieEnabled', 'doNotTrack'].includes(key)) {
      return 'Browser';
    }
    if (['screenWidth', 'screenHeight', 'screenColorDepth', 'devicePixelRatio', 'viewportWidth', 'viewportHeight'].includes(key)) {
      return 'Display';
    }
    if (['timezone', 'timezoneOffset'].includes(key)) {
      return 'Geolocalizzazione';
    }
    if (['hardwareConcurrency', 'maxTouchPoints', 'batteryLevel', 'batteryCharging'].includes(key)) {
      return 'Hardware';
    }
    if (['audioFingerprint', 'canvasFingerprint', 'webglVendor', 'webglRenderer', 'webglFingerprint'].includes(key)) {
      return 'Fingerprint Avanzato';
    }
    if (['availableFonts', 'plugins'].includes(key)) {
      return 'Software';
    }
    if (['localStorage', 'sessionStorage', 'indexedDB', 'webSQL'].includes(key)) {
      return 'Storage';
    }
    if (['connectionType', 'connectionSpeed'].includes(key)) {
      return 'Rete';
    }
    if (['mediaDevices', 'performanceFingerprint', 'cssFeatures', 'jsFeatures'].includes(key)) {
      return 'Capacità';
    }
    return 'Altro';
  };

  const groupedData = fingerprint ? Object.entries(fingerprint).reduce((acc, [key, value]) => {
    const category = getFieldCategory(key);
    if (!acc[category]) acc[category] = [];
    acc[category].push({ key, value });
    return acc;
  }, {} as Record<string, Array<{ key: string; value: unknown }>>) : {};

  const categoryColors = {
    'Browser': 'from-blue-500 to-blue-600',
    'Display': 'from-green-500 to-green-600',
    'Geolocalizzazione': 'from-purple-500 to-purple-600',
    'Hardware': 'from-orange-500 to-orange-600',
    'Fingerprint Avanzato': 'from-red-500 to-red-600',
    'Software': 'from-indigo-500 to-indigo-600',
    'Storage': 'from-pink-500 to-pink-600',
    'Rete': 'from-teal-500 to-teal-600',
    'Capacità': 'from-yellow-500 to-yellow-600',
    'Altro': 'from-gray-500 to-gray-600'
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔍 Test Fingerprinting Avanzato
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Questo strumento raccoglie oltre 40 parametri unici dal tuo browser per creare un fingerprint dettagliato
          </p>
          
          <button
            onClick={collectFingerprint}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Raccolta in corso...
              </div>
            ) : (
              '🚀 Raccogli Fingerprint'
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Errore</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {fingerprint && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
              <h2 className="text-2xl font-bold mb-4">🎯 Fingerprint Generato</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{Object.keys(fingerprint).length}</div>
                  <div className="text-sm opacity-80">Parametri Raccolti</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{fingerprint.fingerprintHash.length}</div>
                  <div className="text-sm opacity-80">Caratteri Hash</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{Object.keys(groupedData).length}</div>
                  <div className="text-sm opacity-80">Categorie</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">🔒</div>
                  <div className="text-sm opacity-80">Unico</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white bg-opacity-20 rounded-lg">
                <div className="text-sm opacity-80 mb-1">Hash Fingerprint:</div>
                <div className="font-mono text-lg font-bold">{fingerprint.fingerprintHash}</div>
              </div>
            </div>

            {/* Detailed Data */}
            <div className="grid gap-6">
              {Object.entries(groupedData).map(([category, fields]) => (
                <div key={category} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className={`bg-gradient-to-r ${categoryColors[category as keyof typeof categoryColors]} text-white p-4`}>
                    <h3 className="text-xl font-bold">{category}</h3>
                    <p className="text-sm opacity-90">{fields.length} parametri rilevati</p>
                  </div>
                  <div className="p-6">
                    <div className="grid gap-4">
                      {fields.map(({ key, value }) => (
                        <div key={key} className="border-l-4 border-gray-200 pl-4 py-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {getFieldDescription(key)}
                              </p>
                            </div>
                            <div className="ml-4 text-right">
                              <div className="font-mono text-sm bg-gray-100 px-3 py-1 rounded-lg max-w-md break-all">
                                {formatValue(key, value)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Raw JSON */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">📄 Dati Raw (JSON)</h3>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(fingerprint, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {!fingerprint && !loading && (
          <div className="text-center text-gray-500 mt-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-lg">Clicca il pulsante sopra per iniziare la raccolta del fingerprint</p>
          </div>
        )}
      </div>
    </div>
  );
}
