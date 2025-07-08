'use client';

import { useState, useEffect } from 'react';
import { LinkIcon, CalendarIcon, ChartBarIcon, PencilIcon, TrashIcon, ClipboardIcon, QrCodeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import ConfirmationModal from './ConfirmationModal';
import QRCodeModal from './QRCodeModal';

export interface LinkFromDB {
  id: string;
  short_code: string;
  original_url: string;
  created_at: Date;
  title: string | null;
  description: string | null;
  click_count: number;
  folder_id: string | null;
}

interface LinkRowProps {
  link: LinkFromDB;
  onDelete: (shortCode: string) => void;
  onUpdateLink?: (shortCode: string, updates: Partial<LinkFromDB>) => void;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, link: LinkFromDB) => void;
  onDragEnd: () => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

export default function LinkRow({ 
  link, 
  onDelete, 
  onUpdateLink,
  isDragging,
  onDragStart,
  onDragEnd,
  onToast
}: LinkRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [shortUrl, setShortUrl] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Costruisce l'URL breve quando il componente è montato
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShortUrl(`${window.location.origin}/${link.short_code}`);
    }
  }, [link.short_code]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(link.short_code);
      setShowDeleteModal(false);
      onToast?.('Link eliminato con successo', 'success');
    } catch (error) {
      console.error('Errore durante l\'eliminazione:', error);
      onToast?.('Errore durante l\'eliminazione del link', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetClicks = async () => {
    setIsResetting(true);
    try {
      const response = await fetch(`/api/links/reset-clicks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortCode: link.short_code
        }),
      });

      if (response.ok) {
        setShowResetModal(false);
        onToast?.('Click azzerati con successo', 'success');
        // Aggiorna il link localmente invece di ricaricare la pagina
        if (onUpdateLink) {
          onUpdateLink(link.short_code, { click_count: 0 });
        }
      } else {
        throw new Error('Errore durante l\'azzeramento dei click');
      }
    } catch (error) {
      console.error('Errore durante l\'azzeramento dei click:', error);
      onToast?.('Errore durante l\'azzeramento dei click', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast?.('Link copiato negli appunti', 'success');
    } catch (err) {
      console.error('Errore durante la copia:', err);
      onToast?.('Errore durante la copia', 'error');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <tr
      className={`bg-white hover:bg-gray-50 transition-colors duration-150 border-b border-gray-200 ${
        isDragging ? 'opacity-50 bg-blue-50' : ''
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, link)}
      onDragEnd={onDragEnd}
    >
      {/* Titolo */}
      <td className="px-6 py-4 w-64">
        <div className="flex flex-col">
          {link.title ? (
            <div className="text-sm font-semibold text-gray-900 truncate">
              {link.title}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">
              Nessun titolo
            </div>
          )}
        </div>
      </td>

      {/* Click count */}
      <td className="px-6 py-4 whitespace-nowrap text-center w-24">
        <div className="flex items-center justify-center space-x-1">
          <ChartBarIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700">{link.click_count}</span>
        </div>
      </td>

      {/* Data creazione */}
      <td className="px-6 py-4 whitespace-nowrap w-44">
        <div className="flex items-center space-x-1">
          <CalendarIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700">{formatDate(link.created_at)}</span>
        </div>
      </td>

      {/* Link breve */}
      <td className="px-6 py-4 w-48">
        <div className="flex items-center space-x-2">
          <LinkIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <button
            onClick={() => copyToClipboard(shortUrl)}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm truncate"
            title="Clicca per copiare"
          >
            {shortUrl}
          </button>
        </div>
      </td>

      {/* URL originale */}
      <td className="px-6 py-4 max-w-xs">
        <button
          onClick={() => copyToClipboard(link.original_url)}
          className="text-gray-600 hover:text-gray-800 text-sm truncate block w-full text-left"
          title="URL originale - Clicca per copiare"
        >
          {link.original_url}
        </button>
      </td>

      {/* Azioni */}
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium w-80">
        <div className="flex items-center justify-end space-x-1">
          {/* Statistiche */}
          <Link
            href={`/dashboard/analytics/${link.short_code}`}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Visualizza Analytics"
          >
            <ChartBarIcon className="h-4 w-4" />
          </Link>
          
          {/* Copia link */}
          <button
            onClick={() => copyToClipboard(shortUrl)}
            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Copia Link Breve"
          >
            <ClipboardIcon className="h-4 w-4" />
          </button>
          
          {/* Modifica */}
          <Link
            href={`/dashboard/edit/${link.short_code}`}
            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Modifica Link"
          >
            <PencilIcon className="h-4 w-4" />
          </Link>
          
          {/* QR Code */}
          <button
            onClick={() => setShowQRModal(true)}
            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Genera QR Code"
          >
            <QrCodeIcon className="h-4 w-4" />
          </button>
          
          {/* Ripristina dati */}
          <button
            onClick={() => setShowResetModal(true)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Azzera Click"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
          
          {/* Elimina */}
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={isDeleting}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Elimina Link"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
      
      {/* Modals */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Elimina Link"
        message={`Sei sicuro di voler eliminare il link "${link.title || link.short_code}"? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        type="delete"
        isLoading={isDeleting}
      />
      
      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetClicks}
        title="Azzera Click"
        message={`Sei sicuro di voler azzerare i click per il link "${link.title || link.short_code}"? Questa azione non può essere annullata.`}
        confirmText="Azzera"
        type="reset"
        isLoading={isResetting}
      />
      
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        url={shortUrl}
        title={link.title || link.short_code}
        onToast={onToast}
      />
    </tr>
  );
}
