'use client';

import { useState } from 'react';
import { Copy, Edit, Trash2, RotateCcw, QrCode, Download, X, Save } from 'lucide-react';
import { deleteLink, resetLinkStats, updateLink } from '../analytics/[shortCode]/actions';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import Image from 'next/image';

interface LinkActionsProps {
  shortCode: string;
  originalUrl: string;
  title?: string | null;
  description?: string | null;
  showInline?: boolean; // Per mostrare i pulsanti in linea nella dashboard
  onUpdate?: () => void; // Callback per aggiornare i dati dopo le modifiche
}

export default function LinkActions({ 
  shortCode, 
  originalUrl, 
  title, 
  description, 
  showInline = false,
  onUpdate 
}: LinkActionsProps) {
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [generatingQr, setGeneratingQr] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: title || '',
    description: description || '',
    original_url: originalUrl,
    new_short_code: shortCode
  });

  const router = useRouter();

  // Funzione per copiare il link
  const handleCopyLink = async () => {
    try {
      const shortUrl = `${window.location.origin}/${shortCode}`;
      await navigator.clipboard.writeText(shortUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Errore durante la copia:', error);
    }
  };

  // Funzione per generare il QR code
  const generateQRCode = async () => {
    setGeneratingQr(true);
    try {
      const shortUrl = `${window.location.origin}/${shortCode}`;
      const qrUrl = `${shortUrl}?qr=1`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrDataUrl);
      setShowQrModal(true);
    } catch (error) {
      console.error('Errore durante la generazione del QR code:', error);
      alert('Errore durante la generazione del QR code');
    } finally {
      setGeneratingQr(false);
    }
  };

  // Funzione per scaricare il QR code
  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `qr-code-${shortCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Funzione per eliminare il link
  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteLink(shortCode);
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
      await resetLinkStats(shortCode);
      if (onUpdate) {
        onUpdate();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Errore durante il reset:', error);
      alert('Errore durante il reset delle statistiche');
    } finally {
      setLoading(false);
    }
  };

  // Funzione per salvare le modifiche
  const handleSave = async () => {
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
      
      if (result.newShortCode && result.newShortCode !== shortCode) {
        router.push(`/dashboard/analytics/${result.newShortCode}`);
      } else {
        if (onUpdate) {
          onUpdate();
        } else {
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Errore durante il salvataggio:', error);
      alert(error instanceof Error ? error.message : 'Errore durante il salvataggio delle modifiche');
    } finally {
      setLoading(false);
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
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            disabled={loading}
            className={`${buttonBaseClass} border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50`}
            title="Modifica link"
          >
            <Edit className={showInline ? "h-3 w-3" : "h-4 w-4"} />
          </button>
        ) : (
          <>
            <button
              onClick={handleSave}
              disabled={loading}
              className={`${buttonBaseClass} border-green-300 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50`}
              title={loading ? 'Salvataggio...' : 'Salva'}
            >
              <Save className={showInline ? "h-3 w-3" : "h-4 w-4"} />
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditData({
                  title: title || '',
                  description: description || '',
                  original_url: originalUrl,
                  new_short_code: shortCode
                });
              }}
              disabled={loading}
              className={`${buttonBaseClass} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50`}
              title="Annulla"
            >
              <X className={showInline ? "h-3 w-3" : "h-4 w-4"} />
            </button>
          </>
        )}

        {/* 3. Pulsante QR Code */}
        <button
          onClick={generateQRCode}
          disabled={loading || generatingQr}
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

      {/* Modal QR Code */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                QR Code del Link
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Scansiona questo QR code per accedere al link
              </p>
              {qrCodeUrl && (
                <Image 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  width={200}
                  height={200}
                  className="mx-auto border border-gray-200 rounded-lg"
                />
              )}
            </div>
            
            <div className="flex justify-center space-x-3">
              <button
                onClick={downloadQRCode}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Scarica PNG
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal di modifica (solo se showInline è false) */}
      {isEditing && !showInline && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Modifica Link
            </h3>
            
            <div className="space-y-4">
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Codice breve
                </label>
                <input
                  type="text"
                  value={editData.new_short_code}
                  onChange={(e) => setEditData({ ...editData, new_short_code: e.target.value.replace(/[^a-zA-Z0-9]/g, '') })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Inserisci il codice breve"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setIsEditing(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
