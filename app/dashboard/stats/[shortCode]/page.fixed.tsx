'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  BarChart3, 
  ArrowLeft,
  Calendar,
  Globe,
  ExternalLink,
  Clock,
  Users,
  Share2,
  Copy,
  QrCode
} from 'lucide-react';
import { SITE_URL } from '@/app/lib/config';
import LinkActions from '@/app/dashboard/components/LinkActions';
import QRCodeModal from '@/app/dashboard/components/QRCodeModal';

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
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('sempre');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento statistiche...</p>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl ${
          toastMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white transform transition-transform duration-300`}>
          {toastMessage.message}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header principale con struttura rettangolare simile all'immagine allegata */}
        <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          {/* Intestazione di navigazione */}
          <div className="flex items-center p-4 border-b border-gray-100 bg-gray-50">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center justify-center h-8 w-8 rounded-md bg-white text-blue-600 hover:bg-blue-100 transition-colors shadow-sm border border-gray-200 mr-3"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Analytics Dashboard
            </h1>
          </div>
          
          {/* Contenuto principale - struttura rettangolare con info a sinistra e azioni a destra */}
          <div className="flex flex-col md:flex-row p-6">
            {/* Colonna sinistra: titolo, link shortato e descrizione */}
            <div className="md:w-1/2 md:pr-6 space-y-4">
              {/* Titolo del link */}
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {link.title || "Link senza titolo"}
                </h2>
              </div>
              
              {/* Link shortato */}
              <div className="group">
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Link shortato
                </label>
                <div className="relative flex items-center p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <a 
                    href={shortUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-medium flex-grow truncate mr-2"
                  >
                    {shortUrl.replace(/^https?:\/\//, '')}
                  </a>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md font-medium text-xs">
                    {shortCode}
                  </span>
                </div>
              </div>
              
              {/* Descrizione se presente */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Descrizione
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">{link.description || "Nessuna descrizione disponibile"}</p>
                </div>
              </div>
            </div>
            
            {/* Colonna destra: pulsanti azioni, link originale e data creazione */}
            <div className="md:w-1/2 md:pl-6 md:border-l border-gray-100 mt-6 md:mt-0 space-y-4">
              {/* Azioni */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-3">
                  Azioni
                </label>
                <div className="flex-shrink-0">
                  <LinkActions
                    shortCode={shortCode}
                    showInline={false}
                    onUpdate={handleUpdateFromActions}
                    onToast={showToast}
                    hideStatsButton={true}
                    hideFoldersButton={false}
                  />
                </div>
              </div>
              
              {/* Link Originale */}
              <div className="group">
                <label className="block text-sm font-medium text-gray-500 mb-2 flex items-center">
                  <ExternalLink className="h-4 w-4 mr-1 text-indigo-500" />
                  Link Originale
                </label>
                <div className="relative p-3 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors flex items-center">
                  <div
                    className="text-gray-700 break-all text-sm flex-grow truncate mr-2"
                    title={link.originalUrl}
                  >
                    {link.originalUrl}
                  </div>
                  <button
                    onClick={handleCopyOriginalLink}
                    className="flex-shrink-0 p-1.5 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                    title="Copia link originale"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Data Creazione */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-gray-600" />
                  Data di Creazione
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 text-sm">
                    {new Date(link.createdAt).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Blocco 2: Filtri Temporali con design migliorato */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" />
              Periodo di Analisi
            </h2>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeFilter === filter.value
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {activeFilter === 'custom' && (
            <div className="flex flex-wrap items-end gap-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
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
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Applica
              </button>
            </div>
          )}
        </div>

        {/* Blocco 3: Card Statistiche con design migliorato */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card Click Totali */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all transform hover:-translate-y-1 overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 opacity-70"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-blue-600 text-sm font-medium">Click Totali</p>
                <div className="p-2.5 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-blue-900">{stats.clickTotali.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-2">Tutti i click registrati per questo link</p>
            </div>
          </div>

          {/* Card Click Unici */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all transform hover:-translate-y-1 overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full -mr-8 -mt-8 opacity-70"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-green-600 text-sm font-medium">Click Unici</p>
                <div className="p-2.5 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-green-900">{stats.clickUnici.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full" 
                    style={{ 
                      width: `${stats.clickTotali > 0 ? Math.round((stats.clickUnici / stats.clickTotali) * 100) : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600 ml-2 font-medium">
                  {stats.clickTotali > 0 
                    ? `${Math.round((stats.clickUnici / stats.clickTotali) * 100)}%` 
                    : '0%'}
                </span>
              </div>
            </div>
          </div>

          {/* Card Referrer */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all transform hover:-translate-y-1 overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-8 -mt-8 opacity-70"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-purple-600 text-sm font-medium">Referrer Unici</p>
                <div className="p-2.5 bg-purple-100 rounded-lg">
                  <Share2 className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-purple-900">{stats.referrerCount.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-2">Sorgenti di traffico per questo link</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal QR Code */}
      {showQrModal && (
        <QRCodeModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          url={`${typeof window !== 'undefined' ? window.location.origin : ''}/${shortCode}`}
          title={`QR Code per ${shortCode}`}
          onToast={showToast}
        />
      )}
    </div>
  );
}
