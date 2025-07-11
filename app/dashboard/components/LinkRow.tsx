'use client';

import { useState, useEffect } from 'react';
import { LinkIcon, CalendarIcon, ChartBarIcon, PencilIcon, TrashIcon, ClipboardIcon, QrCodeIcon, ArrowPathIcon, FolderIcon } from '@heroicons/react/24/outline';
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
  unique_click_count: number; // Add unique click count field
  folder_id: string | null; // Manteniamo per compatibilità
  // Nuove proprietà per cartelle multiple
  folders?: Array<{
    id: string;
    name: string;
    parent_folder_id: string | null;
  }>;
}

interface LinkRowProps {
  link: LinkFromDB;
  onDelete: (shortCode: string) => void;
  onUpdateLink?: (shortCode: string, updates: Partial<LinkFromDB>) => void;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, link: LinkFromDB) => void;
  onDragEnd: () => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
  // Nuove props per la selezione multipla
  isSelected?: boolean;
  onSelect?: (linkId: string, event: React.MouseEvent) => void;
  selectionMode?: boolean;
  onClearSelection?: () => void; // Callback per cancellare la selezione
  // Props per la gestione delle cartelle multiple
  onManageFolders?: (link: LinkFromDB) => void;
  showMultipleFolders?: boolean;
}

export default function LinkRow({ 
  link, 
  onDelete, 
  onUpdateLink,
  isDragging,
  onDragStart,
  onDragEnd,
  onToast,
  isSelected = false,
  onSelect,
  selectionMode = false,
  onClearSelection,
  onManageFolders,
  showMultipleFolders = false
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
      
      // Cancella la selezione se presente
      if (onClearSelection) {
        onClearSelection();
      }
      
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
      console.log('🔄 Tentativo reset click per:', link.short_code);
      
      const response = await fetch(`/api/links/reset-clicks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortCode: link.short_code
        }),
      });

      console.log('📊 Risposta API reset:', response.status, response.statusText);

      if (response.ok) {
        console.log('✅ Reset completato con successo');
        setShowResetModal(false);
        
        // Cancella la selezione se presente
        if (onClearSelection) {
          onClearSelection();
        }
        
        onToast?.('Click azzerati con successo', 'success');
        
        // Aggiorna il link localmente con click_count e unique_click_count = 0
        if (onUpdateLink) {
          onUpdateLink(link.short_code, { 
            click_count: 0, 
            unique_click_count: 0 
          });
        }
      } else {
        const errorData = await response.text();
        console.error('❌ Errore API reset:', response.status, errorData);
        throw new Error(`Errore ${response.status}: ${errorData}`);
      }
    } catch (error) {
      console.error('❌ Errore durante l\'azzeramento dei click:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      onToast?.(`Errore durante l'azzeramento dei click: ${errorMessage}`, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const copyToClipboard = async (text: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Previene la selezione quando si copia
    }
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

  const handleRowClick = (event: React.MouseEvent) => {
    if (selectionMode && onSelect) {
      event.preventDefault();
      // Se è un click normale (senza modificatori) e non sul checkbox,
      // seleziona solo questo link deselezionando gli altri
      if (!event.ctrlKey && !event.shiftKey) {
        // Crea un evento che non ha Ctrl key ma è riconoscibile
        // per indicare un click diretto sulla riga
        const directRowClickEvent = {
          ...event,
          ctrlKey: false,
          shiftKey: false,
          isRowClick: true // Flag custom per identificare click diretto sulla riga
        } as React.MouseEvent & { isRowClick: boolean };
        
        onSelect(link.id, directRowClickEvent);
      } else {
        // Comportamento standard con modificatori (Ctrl o Shift)
        onSelect(link.id, event);
      }
    }
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Il checkbox deve sempre toggle la selezione, indipendentemente da altre selezioni
    if (onSelect) {
      // Stoppa la propagazione per evitare che attivi anche il click sulla riga
      event.stopPropagation();
      
      // Crea un evento che simula un click con Ctrl per toggle della selezione
      // Questo garantisce che il checkbox possa sempre toggle la selezione indipendentemente
      const toggleClickEvent = { 
        ctrlKey: true, 
        shiftKey: false,
        stopPropagation: () => {},
        preventDefault: () => {}
      } as unknown as React.MouseEvent;
      onSelect(link.id, toggleClickEvent);
    }
  };

  return (
    <tr
      className={`bg-white hover:bg-gray-50 transition-colors duration-150 border-b border-gray-200 ${
        isDragging ? 'opacity-50 bg-blue-50' : ''
      } ${
        isSelected ? 'bg-blue-50 border-blue-200' : ''
      } ${
        selectionMode ? 'cursor-pointer' : ''
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, link)}
      onDragEnd={onDragEnd}
      onClick={handleRowClick}
    >
      {/* Checkbox per selezione multipla */}
      {selectionMode && (
        <td className="px-6 py-4 w-12">
          <div 
            className="flex items-center justify-center p-2 -m-2 rounded hover:bg-gray-100 cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Simula un evento change per mantenere la coerenza
              const fakeEvent = {
                stopPropagation: () => {},
                target: { checked: !isSelected }
              } as React.ChangeEvent<HTMLInputElement>;
              handleCheckboxChange(fakeEvent);
            }}
            title="Seleziona/Deseleziona questo link"
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()} // Evita che il click si propaghi alla riga
              className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer pointer-events-none"
              readOnly // Rendiamo il checkbox read-only perché gestiamo i click tramite il div contenitore
            />
          </div>
        </td>
      )}
      
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

      {/* Cartelle - visualizzazione multipla se abilitata */}
      {showMultipleFolders && (
        <td className="px-6 py-4 w-56">
          <div className="flex flex-col space-y-1">
            {link.folders && link.folders.length > 0 ? (
              <>
                {link.folders.slice(0, 2).map((folder) => (
                  <div key={folder.id} className="flex items-center text-xs">
                    <FolderIcon className="h-3 w-3 text-blue-500 mr-1 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{folder.name}</span>
                  </div>
                ))}
                {link.folders.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{link.folders.length - 2} altre
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onManageFolders?.(link);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 text-left"
                  title="Gestisci cartelle"
                >
                  Gestisci ({link.folders.length})
                </button>
              </>
            ) : (
              <div className="flex items-center text-xs text-gray-500">
                <FolderIcon className="h-3 w-3 mr-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onManageFolders?.(link);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                  title="Aggiungi a cartelle"
                >
                  Aggiungi a cartelle
                </button>
              </div>
            )}
          </div>
        </td>
      )}

      {/* Click count */}
      <td className="px-6 py-4 whitespace-nowrap text-center w-24">
        <div className="flex items-center justify-center space-x-1">
          <ChartBarIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700">{link.click_count}</span>
        </div>
      </td>

      {/* Unique Click count */}
      <td className="px-6 py-4 whitespace-nowrap text-center w-24">
        <div className="flex items-center justify-center space-x-1">
          <ChartBarIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700">{link.unique_click_count || 0}</span>
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
            onClick={(e) => copyToClipboard(shortUrl, e)}
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
          onClick={(e) => copyToClipboard(link.original_url, e)}
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
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(shortUrl, e);
            }}
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
          
          {/* Gestisci Cartelle - solo se la colonna non è visualizzata */}
          {!showMultipleFolders && onManageFolders && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onManageFolders(link);
              }}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Gestisci Cartelle"
            >
              <FolderIcon className="h-4 w-4" />
            </button>
          )}
          
          {/* QR Code */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowQRModal(true);
            }}
            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Genera QR Code"
          >
            <QrCodeIcon className="h-4 w-4" />
          </button>
          
          {/* Ripristina dati */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowResetModal(true);
            }}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Azzera Click"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
          
          {/* Elimina */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteModal(true);
            }}
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
