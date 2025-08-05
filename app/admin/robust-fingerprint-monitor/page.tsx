/**
 * Pagina di monitoraggio del sistema di fingerprinting robusto
 */

'use client';

import { useState, useEffect } from 'react';

interface FingerprintStats {
  robust: {
    total_fingerprints: number;
    avg_confidence: number;
    avg_geo_confidence: number;
    unique_devices: number;
    unique_correlations: number;
    unique_geo_components: number;
    geo_sources_used: string[];
  };
  legacy: {
    total_clicks: number;
    unique_legacy_fingerprints: number;
    unique_countries: number;
    unique_regions: number;
    unique_cities: number;
    unique_ips: number;
  };
  comparison: {
    robustVsLegacyRatio: number;
    avgConfidenceImprovement: number;
  };
}

interface MigrationStatus {
  hasClicksTable: boolean;
  hasRobustTable: boolean;
  robustFingerprintsCount: number;
  recentClicksCount: number;
  systemStatus: string;
}

export default function RobustFingerprintMonitor() {
  const [stats, setStats] = useState<FingerprintStats | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Carica statistiche e stato della migrazione in parallelo
      const [statsResponse, statusResponse] = await Promise.all([
        fetch('/api/debug/robust-fingerprint?action=stats'),
        fetch('/api/admin/migrate-fingerprinting')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setMigrationStatus(statusData.status);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dei dati');
    } finally {
      setIsLoading(false);
    }
  };

  const executeMigration = async () => {
    try {
      setIsMigrating(true);
      setError(null);

      const response = await fetch('/api/admin/migrate-fingerprinting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate' })
      });

      const result = await response.json();

      if (result.success) {
        await loadData(); // Ricarica i dati dopo la migrazione
      } else {
        setError(result.error || 'Migrazione fallita');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la migrazione');
    } finally {
      setIsMigrating(false);
    }
  };

  const testFingerprinting = async () => {
    try {
      const response = await fetch('/api/debug/robust-fingerprint?action=test');
      const result = await response.json();
      
      if (result.success) {
        alert(`Test completato!\n\nConfidence: ${result.fingerprint.confidence}%\nPosizione: ${result.fingerprint.geoInfo.city}, ${result.fingerprint.geoInfo.country}\nFonti: ${result.fingerprint.sources.join(', ')}`);
      } else {
        alert(`Test fallito: ${result.error}`);
      }
    } catch (err) {
      alert(`Errore nel test: ${err instanceof Error ? err.message : 'Errore sconosciuto'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Caricamento statistiche...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Sistema di Fingerprinting Robusto</h1>
        <div className="space-x-2">
          <button 
            onClick={testFingerprinting} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Testa Sistema
          </button>
          <button 
            onClick={loadData} 
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Aggiorna
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Stato del Sistema */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Stato del Sistema</h2>
        {migrationStatus ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {migrationStatus.hasClicksTable ? '✅' : '❌'}
                </div>
                <div className="text-sm text-gray-600">Tabella Clicks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {migrationStatus.hasRobustTable ? '✅' : '❌'}
                </div>
                <div className="text-sm text-gray-600">Tabella Robust</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {migrationStatus.robustFingerprintsCount}
                </div>
                <div className="text-sm text-gray-600">Fingerprint Robusti</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {migrationStatus.recentClicksCount}
                </div>
                <div className="text-sm text-gray-600">Click Recenti (24h)</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                migrationStatus.systemStatus === 'healthy' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {migrationStatus.systemStatus}
              </span>
              
              {migrationStatus.systemStatus !== 'healthy' && (
                <button 
                  onClick={executeMigration} 
                  disabled={isMigrating}
                  className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                >
                  {isMigrating ? 'Migrazione in corso...' : 'Esegui Migrazione'}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500">
            Impossibile ottenere lo stato del sistema
          </div>
        )}
      </div>

      {/* Statistiche Confronto */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Sistema Robusto */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Sistema Robusto</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Fingerprint Totali:</span>
                <span className="font-bold">{stats.robust?.total_fingerprints || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Confidence Media:</span>
                <span className="font-bold">{Math.round(stats.robust?.avg_confidence || 0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Confidence Geografica:</span>
                <span className="font-bold">{Math.round(stats.robust?.avg_geo_confidence || 0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Dispositivi Unici:</span>
                <span className="font-bold">{stats.robust?.unique_devices || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Correlazioni Uniche:</span>
                <span className="font-bold">{stats.robust?.unique_correlations || 0}</span>
              </div>
              {stats.robust?.geo_sources_used && stats.robust.geo_sources_used.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-gray-600 mb-2">Fonti Geografiche:</div>
                  <div className="flex flex-wrap gap-1">
                    {stats.robust.geo_sources_used.map((source, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sistema Legacy */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Sistema Legacy</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Click Totali:</span>
                <span className="font-bold">{stats.legacy?.total_clicks || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Fingerprint Unici:</span>
                <span className="font-bold">{stats.legacy?.unique_legacy_fingerprints || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Paesi Unici:</span>
                <span className="font-bold">{stats.legacy?.unique_countries || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Regioni Uniche:</span>
                <span className="font-bold">{stats.legacy?.unique_regions || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Città Uniche:</span>
                <span className="font-bold">{stats.legacy?.unique_cities || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>IP Unici:</span>
                <span className="font-bold">{stats.legacy?.unique_ips || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metriche di Confronto */}
      {stats && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Confronto Prestazioni</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {Math.round((stats.comparison?.robustVsLegacyRatio || 0) * 100)}%
              </div>
              <div className="text-sm text-gray-600">
                Copertura Sistema Robusto
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                +{Math.round(stats.comparison?.avgConfidenceImprovement || 0)}%
              </div>
              <div className="text-sm text-gray-600">
                Miglioramento Confidence
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
