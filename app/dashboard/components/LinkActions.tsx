'use client';

import { useState } from 'react';
import { Copy, Edit, Trash2, RotateCcw, QrCode } from 'lucide-react';
import { deleteLink } from '../analytics/[shortCode]/actions';
import { useRouter } from 'next/navigation';
import Portal from './Portal';
import QRCodeModal from './QRCodeModal';
import { useClickOutside } from '../hooks/useClickOutside';

interface LinkActionsProps {
  shortCode: string;
  showInline?: boolean; // Per mostrare i pulsanti in linea nella dashboard
  onUpdate?: () => void; // Callback per aggiornare i dati dopo le modifiche
  onToast?: (message: string, type: 'success' | 'error') => void; // Callback per toast messages
  onClearSelection?: () => void; // Callback per cancellare la selezione
}

export default function LinkActions({ 
  shortCode, 
  showInline = false,
  onUpdate,
  onToast,
  onClearSelection
}: LinkActionsProps) {
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const router = useRouter();

  // Hook per click-outside dei modali
  const deleteModalRef = useClickOutside<HTMLDivElement>(() => {
    setShowConfirmDelete(false);
  }, showConfirmDelete);

  const resetModalRef = useClickOutside<HTMLDivElement>(() => {
    setShowConfirmReset(false);
  }, showConfirmReset);

  // Funzione per copiare il link
  const handleCopyLink = async () => {
    try {
      const shortUrl = `${window.location.origin}/${shortCode}`;
      await navigator.clipboard.writeText(shortUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      onToast?.('Link copiato negli appunti!', 'success');
    } catch (error) {
      console.error('Errore durante la copia:', error);
      onToast?.('Errore durante la copia del link', 'error');
    }
  };

  // Funzione per aprire il modal QR Code
  const handleQRCode = () => {
    setShowQrModal(true);
  };

  // Funzione per eliminare il link
  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteLink(shortCode);
      
      // Cancella la selezione se presente
      if (onClearSelection) {
        onClearSelection();
      }
      
      if (onUpdate) {
        onUpdate();
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Errore durante l\'eliminazione:', error);
      alert('Errore durante l\'eliminazione del link');
    } finally {
      setLoading(false);
    }
  };

  // Funzione per resettare le statistiche
  const handleResetStats = async () => {
    setLoading(true);
    try {
      console.log('🔄 Tentativo azzera click per:', shortCode);
      
      const response = await fetch('/api/links/reset-clicks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shortCode }),
      });

      console.log('📊 Risposta API:', response.status, response.statusText);

      if (response.ok) {
        console.log('✅ Reset click completato con successo');
        
        // Cancella la selezione se presente
        if (onClearSelection) {
          onClearSelection();
        }

        onToast?.('Click azzerati con successo', 'success');
        if (onUpdate) {
          onUpdate();
        } else {
          // Force refresh per vedere i cambiamenti
          window.location.reload();
        }
      } else {
        const errorData = await response.text();
        console.error('❌ Errore API:', response.status, errorData);
        throw new Error(`Errore ${response.status}: ${errorData}`);
      }
    } catch (error) {
      console.error('❌ Errore durante il reset:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      onToast?.(`Errore durante il reset delle statistiche: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
      setShowConfirmReset(false);
    }
  };

  const buttonBaseClass = showInline 
    ? "inline-flex items-center justify-center w-7 h-7 border rounded-md transition-colors text-xs" 
    : "inline-flex items-center justify-center w-10 h-10 border rounded-md transition-colors";

  return (
    <>
      <div className={`flex items-center ${showInline ? 'space-x-1' : 'space-x-2'} flex-nowrap`}>
        {/* 1. Pulsante Copia Link */}
        <button
          onClick={handleCopyLink}
          disabled={loading}
          className={`${buttonBaseClass} ${
            copySuccess 
              ? 'bg-green-50 text-green-700 border-green-300' 
              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
          } disabled:opacity-50`}
          title="Copia link"
        >
          <Copy className={showInline ? "h-3 w-3" : "h-4 w-4"} />
        </button>

        {/* 2. Pulsante Modifica */}
        <button
          onClick={() => router.push(`/dashboard/edit/${shortCode}`)}
          disabled={loading}
          className={`${buttonBaseClass} border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50`}
          title="Modifica link"
        >
          <Edit className={showInline ? "h-3 w-3" : "h-4 w-4"} />
        </button>

        {        /* 3. Pulsante QR Code */}
        <button
          onClick={handleQRCode}
          disabled={loading}
          className={`${buttonBaseClass} border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50`}
          title="Genera QR Code"
        >
          <QrCode className={showInline ? "h-3 w-3" : "h-4 w-4"} />
        </button>

        {/* 4. Pulsante Reset Statistiche (ROSSO) */}
        <button
          onClick={() => setShowConfirmReset(true)}
          disabled={loading}
          className={`${buttonBaseClass} border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50`}
          title="Reset statistiche"
        >
          <RotateCcw className={showInline ? "h-3 w-3" : "h-4 w-4"} />
        </button>

        {/* 5. Pulsante Elimina (ROSSO) */}
        <button
          onClick={() => setShowConfirmDelete(true)}
          disabled={loading}
          className={`${buttonBaseClass} border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50`}
          title="Elimina link"
        >
          <Trash2 className={showInline ? "h-3 w-3" : "h-4 w-4"} />
        </button>
      </div>

      {/* Modal di conferma eliminazione */}
      {showConfirmDelete && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[9999]">
            <div ref={deleteModalRef} className="bg-white rounded-3xl p-6 max-w-md w-full mx-4 relative backdrop-blur-sm border border-white/20">
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
        </Portal>
      )}

      {/* Modal di conferma reset statistiche */}
      {showConfirmReset && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[9999]">
            <div ref={resetModalRef} className="bg-white rounded-3xl p-6 max-w-md w-full mx-4 relative backdrop-blur-sm border border-white/20">
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
        </Portal>
      )}

      {      /* Modal QR Code */}
      {showQrModal && (
        <QRCodeModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          url={`${typeof window !== 'undefined' ? window.location.origin : ''}/${shortCode}`}
          title={`QR Code per ${shortCode}`}
          onToast={onToast}
        />
      )}
    </>
  );
}
