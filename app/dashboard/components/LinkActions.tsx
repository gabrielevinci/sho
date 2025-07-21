'use client';

import { useState } from 'react';
import { Copy, Edit, Trash2, QrCode } from 'lucide-react';
import { deleteLink } from '../actions';
import { useRouter } from 'next/navigation';
import QRCodeModal from './QRCodeModal';
import ConfirmationModal from './ConfirmationModal';

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
  const [showQrModal, setShowQrModal] = useState(false);

  const router = useRouter();

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
      
      // Non mostriamo il toast qui perché viene già mostrato dal dashboard
      
      if (onUpdate) {
        onUpdate();
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Errore durante l\'eliminazione:', error);
      onToast?.('Errore durante l\'eliminazione del link', 'error');
    } finally {
      setLoading(false);
      setShowConfirmDelete(false);
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

        {/* 4. Pulsante Elimina (ROSSO) */}
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
      <ConfirmationModal
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Elimina Link"
        message="Sei sicuro di voler eliminare questo link? Questa azione non può essere annullata."
        confirmText="Elimina"
        type="delete"
        isLoading={loading}
      />

      {/* Modal QR Code */}
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
