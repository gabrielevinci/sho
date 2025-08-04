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
import NumberFormat from '@/app/components/NumberFormat';
import NoSSR from '@/app/components/NoSSR';
import { useStatsCache, type FilterType, type LinkStats } from '@/app/hooks/use-stats-cache';
import StatsChart from './components/StatsChart';
import CombinedCharts from './components/CombinedCharts';

export default function LinkStatsPage() {
  const params = useParams();
  const router = useRouter();
  const shortCode = params.shortCode as string;
  
  const [linkStats, setLinkStats] = useState<LinkStats | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('sempre');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isApplyingFilter, setIsApplyingFilter] = useState(false);
  const [chartRefreshTrigger, setChartRefreshTrigger] = useState<number>(0); // Nuovo stato per controllare il refresh del grafico

  // Utilizziamo il nuovo hook per la cache delle statistiche
  const {
    isLoading,
    error,
    isCustomDateLoading,
    getStatsForFilter,
    getImmediateStats,
    invalidateCache,
    debugCache
  } = useStatsCache(shortCode);

  const filters: { value: FilterType; label: string }[] = [
    { value: 'sempre', label: 'Sempre' },
    { value: '24h', label: '24 ore' },
    { value: '7d', label: 'Ultimi 7 giorni' },
    { value: '30d', label: 'Ultimi 30 giorni' },
    { value: '90d', label: 'Ultimi 90 giorni' },
    { value: '365d', label: 'Ultimi 365 giorni' },
    { value: 'custom', label: 'Date personalizzate' }
  ];

  // Applica il filtro usando la cache
  const applyFilter = useCallback(async (filter: FilterType, startDate?: string, endDate?: string) => {
    try {
      setIsApplyingFilter(true);
      
      if (filter === 'custom' && startDate && endDate) {
        // Per date personalizzate, potrebbe essere necessaria una richiesta al server
        const stats = await getStatsForFilter(filter, startDate, endDate);
        if (stats) {
          setLinkStats(stats);
        }
      } else {
        // Per filtri predefiniti, usa i dati dalla cache (immediato)
        const stats = getImmediateStats(filter);
        if (stats) {
          setLinkStats(stats);
        } else {
          // Fallback se i dati non sono ancora caricati
          const statsAsync = await getStatsForFilter(filter);
          if (statsAsync) {
            setLinkStats(statsAsync);
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore durante il caricamento delle statistiche';
      showToast(errorMessage, 'error');
    } finally {
      setIsApplyingFilter(false);
    }
  }, [getStatsForFilter, getImmediateStats]);

  // Carica le statistiche iniziali
  useEffect(() => {
    if (!isLoading && !error) {
      // Applica il filtro predefinito quando i dati sono pronti
      applyFilter(activeFilter);
      // Triggera il caricamento iniziale del grafico
      setChartRefreshTrigger(prev => prev + 1);
    }
  }, [isLoading, error, applyFilter, activeFilter]);

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    if (filter !== 'custom') {
      applyFilter(filter);
      // Triggera il refresh del grafico per filtri non personalizzati
      setChartRefreshTrigger(prev => prev + 1);
    }
  };

  const handleCustomDateFilter = () => {
    if (customStartDate && customEndDate) {
      applyFilter('custom', customStartDate, customEndDate);
      // Triggera il refresh del grafico quando viene cliccato "Applica"
      setChartRefreshTrigger(prev => prev + 1);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateFromActions = () => {
    invalidateCache(); // Ricarica le statistiche dopo un'azione e applica il filtro corrente
    setTimeout(() => {
      applyFilter(activeFilter, customStartDate, customEndDate);
    }, 100);
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

  // Componente Skeleton per il loading
  const SkeletonLoader = () => (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-gray-200 rounded-full w-10 h-10 animate-pulse"></div>
            <div>
              <div className="h-8 bg-gray-200 rounded w-48 animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Info Card Skeleton */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="space-y-5">
            <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Filter Skeleton */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse mb-4"></div>
          <div className="flex flex-wrap gap-2">
            {[1,2,3,4,5,6,7].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded-full w-20 animate-pulse"></div>
            ))}
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-gray-200">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
                <div className="p-3 bg-gray-100 rounded-full w-11 h-11 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (isLoading || isApplyingFilter) {
    return <SkeletonLoader />;
  }

  if (error || !linkStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-sm max-w-md">
          <div className="text-red-500 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-800 font-medium mb-2">Impossibile caricare le statistiche</p>
          {error && (
            <p className="text-gray-600 text-sm mb-4 bg-red-50 p-3 rounded border border-red-200">
              {typeof error === 'string' ? error : 'Errore sconosciuto'}
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <button 
              onClick={() => {
                invalidateCache();
                applyFilter(activeFilter, customStartDate, customEndDate);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm transition-all text-sm"
            >
              Riprova
            </button>
            <button 
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 shadow-sm transition-all text-sm"
            >
              Torna alla Dashboard
            </button>
          </div>
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
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <BarChart3 className="h-6 w-6 mr-2 text-blue-600" />
                Statistiche Link
              </h1>
              <p className="text-gray-600 text-sm">
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
                  <h2 className="text-xl font-bold text-gray-900">{link.title}</h2>
                  <div className="h-1 w-20 bg-blue-500 mt-2"></div>
                </div>
              )}
              
              <div className="space-y-5">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">URL Shortato</span>
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
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Link Originale</span>
                  <button
                    onClick={handleCopyOriginalLink}
                    className="text-gray-800 hover:text-gray-900 break-all text-left w-full cursor-pointer text-sm hover:underline"
                    title="Clicca per copiare il link originale"
                  >
                    {link.originalUrl}
                  </button>
                </div>

                {link.description && (
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Descrizione</span>
                    <p className="text-gray-800 text-sm">{link.description}</p>
                  </div>
                )}

                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Data di Creazione</span>
                  <p className="text-gray-800 text-sm">
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
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={debugCache}
                    className="mt-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded border border-yellow-300 hover:bg-yellow-200 transition-colors"
                    title="Debug Cache (solo in development)"
                  >
                    🔍 Debug Cache
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Blocco 2: Filtri Temporali */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Periodo di Analisi</h2>
            {(isCustomDateLoading || isApplyingFilter) && (
              <div className="flex items-center text-sm text-gray-500 mt-2 sm:mt-0">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2"></div>
                Caricamento statistiche...
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value)}
                disabled={isApplyingFilter || isCustomDateLoading}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeFilter === filter.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {activeFilter === 'custom' && (
            <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg mt-4">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">Data Inizio</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">Data Fine</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>
              <button
                onClick={handleCustomDateFilter}
                disabled={!customStartDate || !customEndDate || isCustomDateLoading || isApplyingFilter}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm shadow-sm transition-all"
              >
                {isCustomDateLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Caricamento...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Applica
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Blocco 3: Card Statistiche */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card Click Totali */}
          <div className="bg-white rounded-lg shadow-sm p-6 transition-all duration-300 hover:shadow-md border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Click Totali</p>
                <p className="text-2xl font-bold text-gray-900">
                  <NoSSR fallback="---">
                    <NumberFormat value={stats.clickTotali} />
                  </NoSSR>
                </p>
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
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Click Unici</p>
                <p className="text-2xl font-bold text-gray-900">
                  <NoSSR fallback="---">
                    <NumberFormat value={stats.clickUnici} />
                  </NoSSR>
                </p>
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
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Referrer Unici</p>
                <p className="text-2xl font-bold text-gray-900">
                  <NoSSR fallback="---">
                    <NumberFormat value={stats.referrerCount} />
                  </NoSSR>
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Card Paesi */}
          <div className="bg-white rounded-lg shadow-sm p-6 transition-all duration-300 hover:shadow-md border-l-4 border-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Paesi</p>
                <p className="text-2xl font-bold text-gray-900">
                  <NoSSR fallback="---">
                    <NumberFormat value={stats.countryCount} />
                  </NoSSR>
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-full">
                <svg className="h-5 w-5 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card Città */}
          <div className="bg-white rounded-lg shadow-sm p-6 transition-all duration-300 hover:shadow-md border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Città</p>
                <p className="text-2xl font-bold text-gray-900">
                  <NoSSR fallback="---">
                    <NumberFormat value={stats.cityCount} />
                  </NoSSR>
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-full">
                <svg className="h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card Browser */}
          <div className="bg-white rounded-lg shadow-sm p-6 transition-all duration-300 hover:shadow-md border-l-4 border-teal-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Browser</p>
                <p className="text-2xl font-bold text-gray-900">
                  <NoSSR fallback="---">
                    <NumberFormat value={stats.browserCount} />
                  </NoSSR>
                </p>
              </div>
              <div className="p-3 bg-teal-100 rounded-full">
                <svg className="h-5 w-5 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M7.5 3h9m-9 3h9m-9 3h9m3-9v18m-3-3h.01M6 3v18m3-3h.01M6 6h.01M6 9h.01M6 12h.01M6 15h.01M6 18h.01M21 3v18m-3-3H21m-5.25-3H21M21 9h-5.25M21 6H21m-5.25 15H21" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card Lingua */}
          <div className="bg-white rounded-lg shadow-sm p-6 transition-all duration-300 hover:shadow-md border-l-4 border-pink-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Lingua</p>
                <p className="text-2xl font-bold text-gray-900">
                  <NoSSR fallback="---">
                    <NumberFormat value={stats.linguaCount} />
                  </NoSSR>
                </p>
              </div>
              <div className="p-3 bg-pink-100 rounded-full">
                <svg className="h-5 w-5 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card Dispositivi */}
          <div className="bg-white rounded-lg shadow-sm p-6 transition-all duration-300 hover:shadow-md border-l-4 border-teal-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Dispositivi</p>
                <p className="text-2xl font-bold text-gray-900">
                  <NoSSR fallback="---">
                    <NumberFormat value={stats.dispositivoCount} />
                  </NoSSR>
                </p>
              </div>
              <div className="p-3 bg-teal-100 rounded-full">
                <svg className="h-5 w-5 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card Sistemi Operativi */}
          <div className="bg-white rounded-lg shadow-sm p-6 transition-all duration-300 hover:shadow-md border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Sistemi Operativi</p>
                <p className="text-2xl font-bold text-gray-900">
                  <NoSSR fallback="---">
                    <NumberFormat value={stats.sistemaOperativoCount} />
                  </NoSSR>
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <svg className="h-5 w-5 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Blocco 4: Grafico delle Statistiche */}
        <StatsChart
          shortCode={shortCode}
          filter={activeFilter === 'sempre' ? 'all' : activeFilter}
          startDate={activeFilter === 'custom' ? customStartDate : undefined}
          endDate={activeFilter === 'custom' ? customEndDate : undefined}
          triggerRefresh={chartRefreshTrigger}
        />

        {/* Blocco 5: Grafici Combinati (Mensili e Settimanali) */}
        <CombinedCharts
          shortCode={shortCode}
          triggerRefresh={chartRefreshTrigger}
        />
      </div>
    </div>
  );
}
