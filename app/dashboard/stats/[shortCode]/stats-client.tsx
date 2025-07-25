'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  ArrowLeft,
  Calendar
} from 'lucide-react';
import { SITE_URL } from '@/app/lib/config';
import LinkActions from '@/app/dashboard/components/LinkActions';

type LinkStats = {
  link: {
    id: string; // Aggiungiamo l'ID numerico
    shortCode: string;
    originalUrl: string;
    title: string | null;
    description: string | null;
    createdAt: string;
  };
  stats: {
    clickTotali: number;
    clickUnici: number;
    referrerCount: number;
  };
};

type FilterType = 'sempre' | '24h' | '7d' | '30d' | '90d' | '365d' | 'custom';

interface StatsPageClientProps {
  shortCode: string;
  initialStats: LinkStats | null;
}

export default function StatsPageClient({ shortCode, initialStats }: StatsPageClientProps) {
  const router = useRouter();
  
  const [linkStats, setLinkStats] = useState<LinkStats | null>(initialStats);
  const [loading, setLoading] = useState(initialStats === null); // Loading solo se non abbiamo dati iniziali
  const [activeFilter, setActiveFilter] = useState<FilterType>('sempre');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const filters: { value: FilterType; label: string }[] = [
    { value: 'sempre', label: 'Sempre' },
    { value: '24h', label: '24 ore' },
    { value: '7d', label: 'Ultimi 7 giorni' },
    { value: '30d', label: 'Ultimi 30 giorni' },
    { value: '90d', label: 'Ultimi 90 giorni' },
    { value: '365d', label: 'Ultimi 365 giorni' },
    { value: 'custom', label: 'Date personalizzate' }
  ];

  const fetchStats = useCallback(async (filter: FilterType = activeFilter) => {
    try {
      setLoading(true);
      let url = `/api/stats/${shortCode}?filter=${filter}`;
      
      if (filter === 'custom' && customStartDate && customEndDate) {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Errore durante il caricamento delle statistiche');
      }
      
      const data = await response.json();
      setLinkStats(data);
    } catch {
      showToast('Errore durante il caricamento delle statistiche', 'error');
    } finally {
      setLoading(false);
    }
  }, [shortCode, activeFilter, customStartDate, customEndDate]);

  // Carica i dati iniziali se non forniti, altrimenti solo quando cambiano i filtri
  useEffect(() => {
    if (initialStats === null) {
      // Carica i dati iniziali
      fetchStats();
    } else if (activeFilter !== 'sempre') {
      // Ricarica solo se cambiano i filtri
      fetchStats();
    }
  }, [activeFilter]); // Rimuoviamo fetchStats dalle dipendenze per evitare loop

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    if (filter !== 'custom') {
      fetchStats(filter);
    }
  };

  const handleCustomDateFilter = () => {
    if (customStartDate && customEndDate) {
      fetchStats('custom');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateFromActions = () => {
    fetchStats(); // Ricarica le statistiche dopo un'azione
  };

  const handleCopyOriginalLink = async () => {
    try {
      if (linkStats?.link.originalUrl) {
        await navigator.clipboard.writeText(linkStats.link.originalUrl);
        showToast('Link originale copiato negli appunti!', 'success');
      }
    } catch {
      showToast('Errore durante la copia del link originale', 'error');
    }
  };

  // Solo mostra loading se stiamo facendo fetch e non abbiamo dati iniziali
  if (loading && !linkStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Caricamento statistiche...</p>
        </div>
      </div>
    );
  }

  if (!linkStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-sm max-w-md">
          <div className="text-red-500 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-700 mb-4">Impossibile caricare le statistiche per questo link.</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm transition-all"
          >
            Torna alla Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { link, stats } = linkStats;
  const shortUrl = `${SITE_URL}/${shortCode}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          toastMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toastMessage.message}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8" data-link-id={linkStats?.link.id}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Torna alla dashboard"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <BarChart3 className="h-6 w-6 mr-2 text-blue-600" />
                Statistiche Link
              </h1>
              <p className="text-gray-500 text-sm">
                Analisi dettagliata delle performance
              </p>
            </div>
          </div>
        </div>

        {/* Blocco 1: Informazioni del Link */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between">
            <div className="flex-grow space-y-5">
              {/* Titolo del link se presente */}
              {link.title && (
                <div className="mb-2">
                  <h2 className="text-xl font-bold text-gray-800">{link.title}</h2>
                  <div className="h-1 w-20 bg-blue-500 mt-2"></div>
                </div>
              )}
              
              <div className="space-y-5">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">URL Shortato</span>
                  <div className="flex items-center">
                    <a 
                      href={shortUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-mono text-lg mr-3 hover:underline transition-colors"
                    >
                      {shortUrl}
                    </a>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">URL Originale</span>
                  <div className="flex items-center group">
                    <a 
                      href={link.originalUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-700 hover:text-blue-600 break-all text-sm mr-3 transition-colors hover:underline"
                    >
                      {link.originalUrl}
                    </a>
                    <button
                      onClick={handleCopyOriginalLink}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                      title="Copia URL originale"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {link.description && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Descrizione</span>
                    <p className="text-gray-700 text-sm">{link.description}</p>
                  </div>
                )}

                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Data di Creazione</span>
                  <p className="text-gray-700 text-sm">{new Date(link.createdAt).toLocaleDateString('it-IT', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
              </div>
            </div>

            {/* Azioni del Link - a destra */}
            <div className="lg:ml-6 mt-6 lg:mt-0 flex lg:flex-col justify-center lg:justify-start">
              <LinkActions
                shortCode={shortCode}
                linkId={link.id} // Passiamo l'ID numerico
                onUpdate={handleUpdateFromActions}
                onToast={showToast}
                hideStatsButton={true} // Nascondiamo il pulsante delle statistiche
              />
            </div>
          </div>
        </div>

        {/* Blocco 2: Filtri Temporali */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            Periodo di Analisi
          </h3>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value)}
                disabled={loading}
                className={`px-3 py-2 text-sm rounded-md transition-colors disabled:opacity-50 ${
                  activeFilter === filter.value
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Filtro personalizzato */}
          {activeFilter === 'custom' && (
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Inizio</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Fine</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleCustomDateFilter}
                disabled={!customStartDate || !customEndDate || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Applica
              </button>
            </div>
          )}
        </div>

        {/* Blocco 3: Statistiche Generali */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Click Totali</p>
                <p className="text-2xl font-bold text-gray-900">{stats.clickTotali.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.121 2.122" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Click Unici</p>
                <p className="text-2xl font-bold text-gray-900">{stats.clickUnici.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Sorgenti di Traffico</p>
                <p className="text-2xl font-bold text-gray-900">{stats.referrerCount}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Indicatore di caricamento per i filtri */}
        {loading && linkStats && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Aggiornamento statistiche...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
