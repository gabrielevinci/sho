'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

export default function LinkStatsPage() {
  const params = useParams();
  const router = useRouter();
  const shortCode = params.shortCode as string;
  
  const [linkStats, setLinkStats] = useState<LinkStats | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    // Carica le statistiche iniziali solo una volta
    fetchStats();
  }, [shortCode, fetchStats]);

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

  if (loading) {
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
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      {shortUrl.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Link Originale</span>
                  <button
                    onClick={handleCopyOriginalLink}
                    className="text-gray-700 hover:text-gray-900 break-all text-left w-full cursor-pointer text-sm hover:underline"
                    title="Clicca per copiare il link originale"
                  >
                    {link.originalUrl}
                  </button>
                </div>

                {link.description && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Descrizione</span>
                    <p className="text-gray-700 text-sm">{link.description}</p>
                  </div>
                )}

                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Data di Creazione</span>
                  <p className="text-gray-700 text-sm">
                    {new Date(link.createdAt).toLocaleDateString('it-IT', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 lg:mt-0 lg:ml-6 lg:w-auto lg:flex-shrink-0 lg:self-start">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Azioni</h3>
                <LinkActions
                  shortCode={shortCode}
                  linkId={linkStats?.link.id} // Passiamo l'ID numerico del link
                  showInline={false}
                  onUpdate={handleUpdateFromActions}
                  onToast={showToast}
                  hideStatsButton={true}
                  hideFolderButton={true} // Nascondi il pulsante gestione cartelle nelle statistiche
                />
              </div>
            </div>
          </div>
        </div>

        {/* Blocco 2: Filtri Temporali */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Periodo di Analisi</h2>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeFilter === filter.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {activeFilter === 'custom' && (
            <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg mt-4">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Data Inizio</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Data Fine</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                />
              </div>
              <button
                onClick={handleCustomDateFilter}
                disabled={!customStartDate || !customEndDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm shadow-sm transition-all"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Applica
              </button>
            </div>
          )}
        </div>

        {/* Blocco 3: Card Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card Click Totali */}
          <div className="bg-white rounded-lg shadow-sm p-6 transition-all duration-300 hover:shadow-md border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Click Totali</p>
                <p className="text-2xl font-bold text-gray-800">{stats.clickTotali.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Card Click Unici */}
          <div className="bg-white rounded-lg shadow-sm p-6 transition-all duration-300 hover:shadow-md border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Click Unici</p>
                <p className="text-2xl font-bold text-gray-800">{stats.clickUnici.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>

          {/* Card Referrer */}
          <div className="bg-white rounded-lg shadow-sm p-6 transition-all duration-300 hover:shadow-md border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Referrer Unici</p>
                <p className="text-2xl font-bold text-gray-800">{stats.referrerCount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
