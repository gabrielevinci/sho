'use client';

import { useState } from 'react';

export default function StatsTestPage() {
  const [shortCode, setShortCode] = useState('');
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-01-31');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testStatsAPI = async () => {
    if (!shortCode.trim()) {
      setError('Inserisci uno short code');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const url = `/api/stats/${shortCode}?filter=custom&startDate=${startDate}&endDate=${endDate}&test=true`;
      console.log('Testing URL:', url);
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      setResponse(data);
      console.log('API Response:', data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Test API Statistiche</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Date Personalizzate</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Short Code
              </label>
              <input
                type="text"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value)}
                placeholder="es: CIIhbJv"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Inizio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Fine
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <button
            onClick={testStatsAPI}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Caricamento...' : 'Testa API'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Errore</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {response && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-semibold mb-4">Risposta API</h3>
            
            {response.stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800">Click Totali</h4>
                  <p className="text-2xl font-bold text-blue-900">{response.stats.clickTotali}</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800">Click Unici</h4>
                  <p className="text-2xl font-bold text-green-900">{response.stats.clickUnici}</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800">Sorgenti di Traffico</h4>
                  <p className="text-2xl font-bold text-purple-900">{response.stats.referrerCount}</p>
                </div>
              </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Risposta Completa (JSON)</h4>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-96">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
