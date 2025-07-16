'use client';

import { useState } from 'react';

export default function MigrationPage() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runMigration = async () => {
    setLoading(true);
    setStatus('🚀 Esecuzione migrazione...');
    
    try {
      const response = await fetch('/api/migrate/fingerprint-schema', {
        method: 'POST'
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.status === 'success') {
        setStatus('✅ Migrazione completata con successo!');
      } else {
        setStatus('❌ Errore durante la migrazione');
      }
    } catch (error) {
      setStatus('❌ Errore di connessione');
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const migrateLegacy = async () => {
    setLoading(true);
    setStatus('� Migrazione dati legacy...');
    
    try {
      const response = await fetch('/api/migrate/legacy-clicks', {
        method: 'POST'
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.status === 'success') {
        setStatus(`✅ Migrati ${data.migrated_records} record legacy!`);
      } else {
        setStatus('❌ Errore durante la migrazione legacy');
      }
    } catch (error) {
      setStatus('❌ Errore di connessione');
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    setLoading(true);
    setStatus('🔍 Controllo stato database...');
    
    try {
      const response = await fetch('/api/test/fingerprint-status');
      const data = await response.json();
      setResult(data);
      
      if (data.status === 'success') {
        setStatus('✅ Database operativo');
      } else {
        setStatus('⚠️ Problemi rilevati');
      }
    } catch (error) {
      setStatus('❌ Errore durante il controllo');
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🛠️ Database Migration & Status</h1>
      
      <div className="space-y-6">
        {/* Controls */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Controlli</h2>
          <div className="space-x-4">
            <button
              onClick={runMigration}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Attendere...' : '🚀 Esegui Migrazione'}
            </button>
            
            <button
              onClick={checkStatus}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Attendere...' : '🔍 Controlla Stato'}
            </button>
            
            <button
              onClick={migrateLegacy}
              disabled={loading}
              className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Attendere...' : '🔄 Migra Dati Legacy'}
            </button>
          </div>
        </div>

        {/* Status */}
        {status && (
          <div className="bg-gray-50 border-l-4 border-blue-400 p-4">
            <p className="text-lg font-medium">{status}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Risultato</h2>
            
            {result.status === 'success' && result.tables_created && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-green-600">✅ Tabelle Create:</h3>
                  <ul className="list-disc list-inside ml-4">
                    {result.tables_created.map((table: string) => (
                      <li key={table} className="text-sm">{table}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-green-600">✅ Viste Create:</h3>
                  <ul className="list-disc list-inside ml-4">
                    {result.views_created.map((view: string) => (
                      <li key={view} className="text-sm">{view}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {result.status === 'success' && result.data && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-blue-600">📊 Diagnosi:</h3>
                  <p className="text-lg">{result.data.diagnosis?.recommendation}</p>
                </div>
                
                {result.data.tableCounts && (
                  <div>
                    <h3 className="font-semibold">📋 Conteggio Tabelle:</h3>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {result.data.tableCounts.map((table: any) => (
                        <div key={table.table_name} className="text-center p-2 bg-gray-100 rounded">
                          <div className="font-bold">{table.total_records}</div>
                          <div className="text-xs">{table.table_name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {result.status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <h3 className="font-semibold text-red-600">❌ Errore:</h3>
                <p className="text-sm text-red-700">{result.error}</p>
              </div>
            )}

            {/* Raw JSON for debugging */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-600">🔧 Dettagli Tecnici</summary>
              <pre className="mt-2 bg-gray-100 p-4 rounded text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
      
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-2">📝 Istruzioni</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li><strong>Esegui Migrazione:</strong> Crea/ricrea tutte le tabelle del sistema fingerprinting</li>
          <li><strong>Controlla Stato:</strong> Verifica se il sistema sta raccogliendo dati correttamente</li>
          <li><strong>Test Link:</strong> Crea un link short e cliccalo per testare il sistema</li>
          <li><strong>Analisi:</strong> Usa la dashboard analytics per vedere i risultati</li>
        </ol>
      </div>
    </div>
  );
}
