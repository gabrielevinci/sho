'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  BarChart3, 
  Copy, 
  ArrowLeft,
  Calendar
} from 'lucide-react';
import { SITE_URL } from '@/app/lib/config';
import LinkActions from '@/app/dashboard/components/LinkActions';

type LinkStats = {
  link: {
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
  const [activeFilter, setActiveFilter] = useState<FilterType>('sempre');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
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
    }
  }, [shortCode, activeFilter, customStartDate, customEndDate]);

  useEffect(() => {
    // Carica le statistiche iniziali solo una volta
    if (!linkStats) {
      fetchStats();
    }
  }, [shortCode, fetchStats, linkStats]);

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

  const handleCopyLink = async () => {
    try {
      const shortUrl = `${SITE_URL}/${shortCode}`;
      await navigator.clipboard.writeText(shortUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      showToast('Link copiato negli appunti!', 'success');
    } catch {
      showToast('Errore durante la copia del link', 'error');
    }
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

  if (!linkStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Errore durante il caricamento delle statistiche</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <BarChart3 className="h-6 w-6 mr-2 text-blue-600" />
                Statistiche Link
              </h1>
              <p className="text-gray-600">
                {linkStats?.link.title ? linkStats.link.title : 'Analisi dettagliata delle performance'}
              </p>
            </div>
          </div>
        </div>

        {/* Blocco 1: Informazioni del Link */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informazioni Link</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">URL Shortato</label>
                <a 
                  href={shortUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {shortUrl.replace(/^https?:\/\//, '')}
                </a>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Link Originale</label>
                <button
                  onClick={handleCopyOriginalLink}
                  className="text-gray-700 hover:text-gray-900 break-all text-left w-full cursor-pointer underline decoration-dotted hover:decoration-solid"
                  title="Clicca per copiare il link originale"
                >
                  {link.originalUrl}
                </button>
              </div>

              {link.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Descrizione</label>
                  <p className="text-gray-700">{link.description}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Data di Creazione</label>
                <p className="text-gray-700">
                  {new Date(link.createdAt).toLocaleDateString('it-IT', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Azioni</h3>
              <LinkActions
                shortCode={shortCode}
                showInline={false}
                onUpdate={handleUpdateFromActions}
                onToast={showToast}
                hideStatsButton={true}
              />
            </div>
          </div>
        </div>

        {/* Blocco 2: Filtri Temporali */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Periodo di Analisi</h2>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value)}
                className={`px-4 py-2 rounded-lg font-medium filter-button ${
                  activeFilter === filter.value
                    ? 'filter-button-active bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {activeFilter === 'custom' && (
            <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Inizio</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Fine</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleCustomDateFilter}
                disabled={!customStartDate || !customEndDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Applica
              </button>
            </div>
          )}
        </div>

        {/* Blocco 3: Card Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Click Totali */}
          <div className="stats-card stats-gradient-blue rounded-xl border border-blue-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium mb-1">Click Totali</p>
                <p className="text-3xl font-bold text-blue-900">{stats.clickTotali.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Card Click Unici */}
          <div className="stats-card stats-gradient-green rounded-xl border border-green-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium mb-1">Click Unici</p>
                <p className="text-3xl font-bold text-green-900">{stats.clickUnici.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-200 rounded-lg">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Card Referrer */}
          <div className="stats-card stats-gradient-purple rounded-xl border border-purple-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium mb-1">Referrer Unici</p>
                <p className="text-3xl font-bold text-purple-900">{stats.referrerCount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
