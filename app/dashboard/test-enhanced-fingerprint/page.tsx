'use client';

import { useState, useEffect } from 'react';

interface FingerprintTest {
  deviceFingerprint: string;
  browserFingerprint: string;
  ipHash: string;
  confidence: number;
  correlationFactors: string[];
  browserType: string;
  deviceCategory: string;
  timestamp: string;
}

export default function TestEnhancedFingerprint() {
  const [testResults, setTestResults] = useState<FingerprintTest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runFingerprintTest = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/test-enhanced-fingerprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      const newTest: FingerprintTest = {
        deviceFingerprint: result.deviceFingerprint,
        browserFingerprint: result.browserFingerprint,
        ipHash: result.ipHash,
        confidence: result.confidence,
        correlationFactors: result.correlationFactors,
        browserType: result.browserType,
        deviceCategory: result.deviceCategory,
        timestamp: new Date().toLocaleTimeString()
      };

      setTestResults(prev => [newTest, ...prev.slice(0, 9)]); // Mantieni solo gli ultimi 10
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">
        🔍 Test Sistema Enhanced Fingerprinting
      </h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">
          Come Testare il Miglioramento
        </h2>
        <div className="space-y-3 text-blue-700">
          <p>
            <strong>1. Browser Normale:</strong> Clicca "Genera Fingerprint" con il tuo browser normale
          </p>
          <p>
            <strong>2. Modalità Incognito:</strong> Apri una finestra incognito e rifai il test
          </p>
          <p>
            <strong>3. Browser Diverso:</strong> Prova con Firefox, Chrome, Edge, etc.
          </p>
          <p>
            <strong>Risultato Atteso:</strong> Il <code>deviceFingerprint</code> dovrebbe essere uguale
            in tutti i casi (stesso dispositivo), mentre il <code>browserFingerprint</code> cambierà.
          </p>
        </div>
      </div>

      <div className="text-center mb-6">
        <button
          onClick={runFingerprintTest}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 px-6 rounded-lg"
        >
          {isLoading ? '🔄 Generazione...' : '🧪 Genera Fingerprint'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">❌ Errore: {error}</p>
        </div>
      )}

      {testResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold mb-4">📊 Risultati Test</h2>
          
          {testResults.map((test, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-lg">Test #{testResults.length - index}</span>
                <span className="text-sm text-gray-500">{test.timestamp}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="mb-2">
                    <span className="font-medium text-green-600">Device Fingerprint:</span>
                    <br />
                    <code className="text-sm bg-green-50 px-2 py-1 rounded">
                      {test.deviceFingerprint}
                    </code>
                  </div>

                  <div className="mb-2">
                    <span className="font-medium text-blue-600">Browser Fingerprint:</span>
                    <br />
                    <code className="text-sm bg-blue-50 px-2 py-1 rounded">
                      {test.browserFingerprint}
                    </code>
                  </div>

                  <div className="mb-2">
                    <span className="font-medium text-gray-600">IP Hash:</span>
                    <br />
                    <code className="text-sm bg-gray-50 px-2 py-1 rounded">
                      {test.ipHash}
                    </code>
                  </div>
                </div>

                <div>
                  <div className="mb-2">
                    <span className="font-medium">Browser:</span>
                    <span className="ml-2 bg-purple-100 px-2 py-1 rounded text-sm">
                      {test.browserType}
                    </span>
                  </div>

                  <div className="mb-2">
                    <span className="font-medium">Device:</span>
                    <span className="ml-2 bg-orange-100 px-2 py-1 rounded text-sm">
                      {test.deviceCategory}
                    </span>
                  </div>

                  <div className="mb-2">
                    <span className="font-medium">Confidenza:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-sm ${
                      test.confidence >= 80 ? 'bg-green-100 text-green-800' :
                      test.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {test.confidence}%
                    </span>
                  </div>

                  <div>
                    <span className="font-medium">Fattori:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {test.correlationFactors.map((factor, i) => (
                        <span
                          key={i}
                          className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {testResults.length >= 2 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">
                🔍 Analisi Correlazione
              </h3>
              <div className="text-yellow-700 space-y-1">
                <p>
                  <strong>Device Fingerprints unici:</strong>{' '}
                  {new Set(testResults.map(t => t.deviceFingerprint)).size}
                </p>
                <p>
                  <strong>Browser Fingerprints unici:</strong>{' '}
                  {new Set(testResults.map(t => t.browserFingerprint)).size}
                </p>
                <p className="text-sm mt-2">
                  {new Set(testResults.map(t => t.deviceFingerprint)).size === 1 ? 
                    '✅ Ottimo! Il sistema riconosce che tutti i test provengono dallo stesso dispositivo fisico.' :
                    '⚠️ I device fingerprint sono diversi. Questo può accadere se cambi IP o timezone.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">📝 Spiegazione Tecnica</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            <strong>Device Fingerprint:</strong> Identifica il dispositivo fisico usando IP, timezone, OS, e geografia. 
            Dovrebbe essere stabile tra browser diversi.
          </p>
          <p>
            <strong>Browser Fingerprint:</strong> Include user agent e headers specifici del browser. 
            Cambia tra Chrome/Firefox e normale/incognito.
          </p>
          <p>
            <strong>Confidenza:</strong> Indica quanto il sistema è sicuro dell'identificazione. 
            Valori alti (80%+) indicano identificazione molto accurata.
          </p>
        </div>
      </div>
    </div>
  );
}
