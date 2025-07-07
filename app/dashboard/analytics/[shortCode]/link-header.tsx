'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Calendar, Copy, Edit, Trash2, RotateCcw, Save, X } from 'lucide-react';
import { deleteLink, resetLinkStats, updateLink } from './actions';
import { useRouter } from 'next/navigation';

type LinkAnalytics = {
  short_code: string;
  original_url: string;
  title: string | null;
  description: string | null;
  click_count: number;
  created_at: Date;
};

interface LinkHeaderProps {
  linkData: LinkAnalytics;
  shortCode: string;
}

export default function LinkHeader({ linkData, shortCode }: LinkHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState({
    title: linkData.title || '',
    description: linkData.description || '',
    original_url: linkData.original_url,
    new_short_code: shortCode
  });
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [shortUrl, setShortUrl] = useState('');
  
  const router = useRouter();

  // Otteniamo l'URL solo lato client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShortUrl(`${window.location.origin}/${shortCode}`);
    }
  }, [shortCode]);

  // Aggiorna l'URL quando cambia il short code in modalità editing
  useEffect(() => {
    if (typeof window !== 'undefined' && isEditing) {
      setShortUrl(`${window.location.origin}/${editData.new_short_code}`);
    }
  }, [editData.new_short_code, isEditing]);

  // Funzione per copiare il link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Errore durante la copia:', error);
    }
  };

  // Funzione per salvare le modifiche
  const handleSave = async () => {
    // Validazione del short code
    if (editData.new_short_code.trim() === '') {
      alert('Il codice breve non può essere vuoto');
      return;
    }
    
    if (!/^[a-zA-Z0-9]+$/.test(editData.new_short_code)) {
      alert('Il codice breve può contenere solo lettere e numeri');
      return;
    }
    
    setLoading(true);
    try {
      const result = await updateLink(shortCode, editData);
      setIsEditing(false);
      
      // Se è stato cambiato il short code, reindirizza alla nuova pagina
      if (result.newShortCode && result.newShortCode !== shortCode) {
        router.push(`/dashboard/analytics/${result.newShortCode}`);
      } else {
        window.location.reload(); // Ricarica la pagina per aggiornare i dati
      }
    } catch (error) {
      console.error('Errore durante il salvataggio:', error);
      alert(error instanceof Error ? error.message : 'Errore durante il salvataggio delle modifiche');
    } finally {
      setLoading(false);
    }
  };

  // Funzione per eliminare il link
  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteLink(shortCode);
      router.push('/dashboard');
    } catch (error) {
      console.error('Errore durante l\'eliminazione:', error);
      alert('Errore durante l\'eliminazione del link');
      setLoading(false);
    }
  };

  // Funzione per resettare le statistiche
  const handleResetStats = async () => {
    setLoading(true);
    try {
      await resetLinkStats(shortCode);
      window.location.reload(); // Ricarica la pagina per aggiornare i dati
    } catch (error) {
      console.error('Errore durante il reset:', error);
      alert('Errore durante il reset delle statistiche');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              📊 Statistiche Link
            </h1>
            <div className="flex items-center space-x-2">
              {/* Pulsante Copia Link */}
              <button
                onClick={handleCopyLink}
                disabled={loading}
                className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium transition-colors ${
                  copySuccess 
                    ? 'bg-green-50 text-green-700 border-green-300' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } disabled:opacity-50`}
                title="Copia link"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copySuccess ? 'Copiato!' : 'Copia'}
              </button>

              {/* Pulsante Reset Statistiche */}
              <button
                onClick={() => setShowConfirmReset(true)}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-orange-300 rounded-md text-sm font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                title="Reset statistiche"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </button>

              {/* Pulsante Modifica */}
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  title="Modifica link"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifica
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 border border-green-300 rounded-md text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Salvataggio...' : 'Salva'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditData({
                        title: linkData.title || '',
                        description: linkData.description || '',
                        original_url: linkData.original_url,
                        new_short_code: shortCode
                      });
                    }}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Annulla
                  </button>
                </div>
              )}

              {/* Pulsante Elimina */}
              <button
                onClick={() => setShowConfirmDelete(true)}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                title="Elimina link"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </button>
            </div>
          </div>

          {/* Contenuto del link */}
          <div className="space-y-3">
            {/* Titolo */}
            {isEditing ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titolo
                </label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Inserisci un titolo per il link"
                />
              </div>
            ) : (
              <h2 className="text-lg font-semibold text-gray-800">
                {linkData.title || 'Link senza titolo'}
              </h2>
            )}

            {/* Short URL */}
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-600">Link shortato:</span>
              <a 
                href={shortUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
              >
                <span>{shortUrl}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            {/* Short Code */}
            {isEditing ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Codice breve (dopo il &quot;/&quot;)
                </label>
                <input
                  type="text"
                  value={editData.new_short_code}
                  onChange={(e) => setEditData({ ...editData, new_short_code: e.target.value.replace(/[^a-zA-Z0-9]/g, '') })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Inserisci il codice breve"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Solo lettere e numeri, senza spazi o caratteri speciali
                </p>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Codice breve:</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-blue-600 font-medium">
                  /{shortCode}
                </code>
              </div>
            )}

            {/* URL */}
            {isEditing ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL di destinazione
                </label>
                <input
                  type="url"
                  value={editData.original_url}
                  onChange={(e) => setEditData({ ...editData, original_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://esempio.com"
                />
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Reindirizza a:</span>
                <a 
                  href={linkData.original_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 truncate max-w-md"
                >
                  <span className="truncate">{linkData.original_url}</span>
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                </a>
              </div>
            )}

            {/* Descrizione */}
            {isEditing ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione
                </label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Inserisci una descrizione per il link"
                />
              </div>
            ) : (
              linkData.description && (
                <p className="text-gray-600 text-sm">{linkData.description}</p>
              )
            )}

            {/* Data di creazione */}
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Creato il {new Date(linkData.created_at).toLocaleDateString('it-IT', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal di conferma eliminazione */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Conferma eliminazione
            </h3>
            <p className="text-gray-600 mb-6">
              Sei sicuro di voler eliminare questo link? Questa azione non può essere annullata.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal di conferma reset statistiche */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Conferma reset statistiche
            </h3>
            <p className="text-gray-600 mb-6">
              Sei sicuro di voler resettare tutte le statistiche di questo link? Tutti i dati dei click verranno eliminati permanentemente.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmReset(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleResetStats}
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? 'Reset...' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
