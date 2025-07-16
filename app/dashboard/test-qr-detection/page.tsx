'use client';

import { useState } from 'react';

interface TestResult {
  qrDetection: {
    isQRCode: boolean;
    method: string;
    confidence: string;
  };
  trafficSource: string;
  stats: {
    userAgent: string;
    isMobile: boolean;
    isDirect: boolean;
    hasSecFetch: boolean;
  };
}

export default function TestQRDetection() {
  const [testUserAgent, setTestUserAgent] = useState('');
  const [testReferrer, setTestReferrer] = useState('');
  const [testUrl, setTestUrl] = useState('https://short.ly/abc123');
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-qr-detection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testUserAgent,
          testReferrer,
          testUrl
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.results);
      }
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const presetTests = [
    {
      name: 'QR Scanner App',
      userAgent: 'QR Code Scanner App 1.0',
      referrer: '',
      url: 'https://short.ly/abc123'
    },
    {
      name: 'Mobile Safari (iPhone)',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      referrer: '',
      url: 'https://short.ly/abc123'
    },
    {
      name: 'QR Code with Parameter',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      referrer: '',
      url: 'https://short.ly/abc123?qr=1'
    },
    {
      name: 'Regular Browser',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      referrer: 'https://google.com',
      url: 'https://short.ly/abc123'
    },
    {
      name: 'Barcode Scanner',
      userAgent: 'Barcode Scanner Pro 2.0',
      referrer: '',
      url: 'https://short.ly/abc123'
    }
  ];

  const runPresetTest = (preset: typeof presetTests[0]) => {
    setTestUserAgent(preset.userAgent);
    setTestReferrer(preset.referrer);
    setTestUrl(preset.url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test QR Code Detection</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Test Parameters</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Test URL</label>
              <input
                type="text"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="https://short.ly/abc123"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">User Agent</label>
              <input
                type="text"
                value={testUserAgent}
                onChange={(e) => setTestUserAgent(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Enter user agent string"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Referrer</label>
              <input
                type="text"
                value={testReferrer}
                onChange={(e) => setTestReferrer(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Leave empty for direct access"
              />
            </div>
            
            <button
              onClick={runTest}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Run Test'}
            </button>
          </div>
          
          {/* Preset Tests */}
          <div className="mt-6">
            <h3 className="text-md font-medium mb-3">Preset Tests</h3>
            <div className="space-y-2">
              {presetTests.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => runPresetTest(preset)}
                  className="w-full text-left p-2 border rounded hover:bg-gray-50 text-sm"
                >
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-gray-500 truncate">{preset.userAgent}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Test Results</h2>
          
          {result ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-green-600 mb-2">✅ QR Detection Result</h3>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <div><strong>Is QR Code:</strong> {result.qrDetection.isQRCode ? 'YES' : 'NO'}</div>
                  <div><strong>Detection Method:</strong> {result.qrDetection.method}</div>
                  <div><strong>Confidence:</strong> {result.qrDetection.confidence}</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-blue-600 mb-2">🔗 Traffic Source</h3>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>{result.trafficSource}</strong>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-purple-600 mb-2">📊 Detection Stats</h3>
                <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                  <div><strong>Is Mobile:</strong> {result.stats.isMobile ? 'YES' : 'NO'}</div>
                  <div><strong>Is Direct:</strong> {result.stats.isDirect ? 'YES' : 'NO'}</div>
                  <div><strong>Has Sec-Fetch:</strong> {result.stats.hasSecFetch ? 'YES' : 'NO'}</div>
                  <div><strong>User Agent:</strong> <span className="break-all">{result.stats.userAgent}</span></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              Run a test to see results here
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">Come testare il rilevamento QR:</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• <strong>Metodo esplicito:</strong> Aggiungi `?qr=1` all'URL</li>
          <li>• <strong>App QR Scanner:</strong> User agent contenenti "QR", "Scanner", "Barcode"</li>
          <li>• <strong>Mobile diretto:</strong> Browser mobile senza referrer e senza sec-fetch-site</li>
          <li>• <strong>Confidenza alta:</strong> Rilevamento esplicito o app QR note</li>
          <li>• <strong>Confidenza media/bassa:</strong> Rilevamento euristico basato su comportamento</li>
        </ul>
      </div>
    </div>
  );
}
