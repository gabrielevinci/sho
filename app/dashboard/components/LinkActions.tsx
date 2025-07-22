'use client';

import { useState, useEffect } from 'react';
import { Copy, Edit, Trash2, QrCode, BarChart3, FolderOpen, RotateCcw } from 'lucide-react';
import { deleteLink } from '../actions';
import { useRouter } from 'next/navigation';
import QRCodeModal from './QRCodeModal';
import ConfirmationModal from './ConfirmationModal';
import MultiFolderSelector from './MultiFolderSelector';

interface LinkActionsProps {
  shortCode: string;
  linkId?: string;  // Aggiungiamo il linkId come prop opzionale
  showInline?: boolean; // Per mostrare i pulsanti in linea nella dashboard
  onUpdate?: () => void; // Callback per aggiornare i dati dopo le modifiche
  onToast?: (message: string, type: 'success' | 'error') => void; // Callback per toast messages
  onClearSelection?: () => void; // Callback per cancellare la selezione
  hideStatsButton?: boolean; // Per nascondere il pulsante delle statistiche
  hideFolderButton?: boolean; // Per nascondere il pulsante gestione cartelle
}

export default function LinkActions({ 
  shortCode, 
  linkId: propLinkId,  // Rinominiamo in propLinkId per evitare conflitti con lo stato
  showInline = false,
  onUpdate,
  onToast,
  onClearSelection,
  hideStatsButton = false,
  hideFolderButton = false
}: LinkActionsProps) {
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmResetClicks, setShowConfirmResetClicks] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [linkFolders, setLinkFolders] = useState<Array<{id: string; name: string; parent_folder_id: string | null}>>([]);
  const [availableFolders, setAvailableFolders] = useState<Array<any>>([]);
  const [linkId, setLinkId] = useState<string>(propLinkId || "");  // Inizializza con propLinkId se disponibile

  const router = useRouter();

  // Funzione per caricare i dati delle cartelle
  const loadFolderData = async () => {
    try {
      let numericLinkId = linkId;
      
      // Se non abbiamo già l'ID del link (passato come prop), lo cerchiamo
      if (!numericLinkId) {
        try {
          // Tenta di ottenere l'ID del link dalla URL delle statistiche
          const currentPath = window.location.pathname;
          const isInStats = currentPath.includes('/stats/');
          
          if (isInStats) {
            // Nella pagina delle statistiche, dovremmo avere l'ID nella pagina
            // Cerca l'elemento che contiene l'ID del link usando un data attribute o ID elemento
            const linkIdElement = document.querySelector('[data-link-id]');
            if (linkIdElement) {
              numericLinkId = linkIdElement.getAttribute('data-link-id') || "";
            }
          }
          
          // Se ancora non abbiamo l'ID, possiamo gestire diversamente - per ora continuiamo con l'API
          if (!numericLinkId) {
            throw new Error('ID link non trovato nel DOM');
          }
        } catch (domError) {
          // Se fallisce il recupero dal DOM, ricorriamo al vecchio metodo
          // Questo blocco potrebbe fallire se l'API non supporta la ricerca per shortCode
          const linkResponse = await fetch(`/api/links?shortCode=${shortCode}`);
          if (!linkResponse.ok) {
            // Se l'API fallisce, usiamo un metodo alternativo
            onToast?.('Impossibile recuperare l\'ID del link', 'error');
            setShowFolderModal(false);
            return;
          }
          
          const linkData = await linkResponse.json();
          if (!linkData.links || linkData.links.length === 0) {
            onToast?.('Link non trovato', 'error');
            setShowFolderModal(false);
            return;
          }
          
          numericLinkId = linkData.links[0].id;
        }
      }
      
      // Salva l'ID per i riferimenti futuri
      setLinkId(numericLinkId);
      
      // Carica le cartelle associate al link usando l'ID numerico
      const linkFoldersResponse = await fetch(`/api/link-folder-associations?linkId=${numericLinkId}`);
      if (linkFoldersResponse.ok) {
        const data = await linkFoldersResponse.json();
        setLinkFolders(data.associations?.map((assoc: any) => ({
          id: assoc.folder_id,
          name: assoc.folder_name,
          parent_folder_id: assoc.parent_folder_id
        })) || []);
      }

      // Carica tutte le cartelle disponibili
      const foldersResponse = await fetch('/api/folders');
      if (foldersResponse.ok) {
        const data = await foldersResponse.json();
        setAvailableFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Errore durante il caricamento delle cartelle:', error);
      onToast?.('Errore durante il caricamento delle cartelle', 'error');
      setShowFolderModal(false);
    }
  };

  // Funzione per gestire l'assegnazione delle cartelle
  const handleSaveFolderAssociations = async (linkId: string, selectedFolderIds: string[]) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/link-folder-associations?linkId=${linkId}`);
      const data = await response.json();
      const currentFolderIds: string[] = data.associations?.map((assoc: { folder_id: string }) => assoc.folder_id) || [];

      const foldersToAdd = selectedFolderIds.filter(id => !currentFolderIds.includes(id));
      const foldersToRemove = currentFolderIds.filter(id => !selectedFolderIds.includes(id));

      // Rimuovi associazioni esistenti
      if (foldersToRemove.length > 0) {
        await Promise.all(
          foldersToRemove.map((folderId: string) =>
            fetch(`/api/link-folder-associations?linkId=${linkId}&folderId=${folderId}`, {
              method: 'DELETE',
            })
          )
        );
      }

      // Aggiungi nuove associazioni
      if (foldersToAdd.length > 0) {
        await Promise.all(
          foldersToAdd.map(folderId =>
            fetch('/api/link-folder-associations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                linkId,
                folderId,
              }),
            })
          )
        );
      }

      onToast?.('Cartelle aggiornate con successo', 'success');
      
      // Aggiorna i dati
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Errore durante l\'aggiornamento delle cartelle:', error);
      onToast?.('Errore durante l\'aggiornamento delle cartelle', 'error');
    } finally {
      setLoading(false);
      setShowFolderModal(false);
    }
  };

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

  // Funzione per azzerare i click
  const handleResetClicks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/links/${shortCode}/reset-clicks`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'azzeramento dei click');
      }

      onToast?.('Click azzerati con successo', 'success');
      
      // Forza sempre il refresh dei dati dopo l'azzeramento
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Errore durante l\'azzeramento:', error);
      onToast?.('Errore durante l\'azzeramento dei click', 'error');
    } finally {
      setLoading(false);
      setShowConfirmResetClicks(false);
    }
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
      
      // Controlla se siamo nella pagina delle statistiche
      const currentPath = window.location.pathname;
      const isFromStats = currentPath.includes('/stats/');
      
      if (isFromStats) {
        // Se siamo nelle statistiche, vai sempre alla dashboard
        router.push('/dashboard');
      } else if (onUpdate) {
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
        {/* 1. Pulsante Statistiche - solo se non nascosto */}
        {!hideStatsButton && (
          <button
            onClick={() => router.push(`/dashboard/stats/${shortCode}`)}
            disabled={loading}
            className={`${buttonBaseClass} border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50`}
            title="Visualizza statistiche"
          >
            <BarChart3 className={showInline ? "h-3 w-3" : "h-4 w-4"} />
          </button>
        )}

        {/* 2. Pulsante Copia Link */}
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

        {/* 3. Pulsante Modifica */}
        <button
          onClick={() => {
            const currentPath = window.location.pathname;
            const isFromStats = currentPath.includes('/stats/');
            const editUrl = `/dashboard/edit/${shortCode}${isFromStats ? '?from=stats' : ''}`;
            router.push(editUrl);
          }}
          disabled={loading}
          className={`${buttonBaseClass} border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50`}
          title="Modifica link"
        >
          <Edit className={showInline ? "h-3 w-3" : "h-4 w-4"} />
        </button>

        {/* 4. Pulsante QR Code */}
        <button
          onClick={handleQRCode}
          disabled={loading}
          className={`${buttonBaseClass} border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50`}
          title="Genera QR Code"
        >
          <QrCode className={showInline ? "h-3 w-3" : "h-4 w-4"} />
        </button>

        {/* 5. Pulsante Gestione Cartelle - solo se non nascosto */}
        {!hideFolderButton && (
          <button
            onClick={() => {
              setShowFolderModal(true);
              loadFolderData();
            }}
            disabled={loading}
            className={`${buttonBaseClass} border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50`}
            title="Gestione cartelle"
          >
            <FolderOpen className={showInline ? "h-3 w-3" : "h-4 w-4"} />
          </button>
        )}

        {/* 6. Pulsante Azzera Click */}
        <button
          onClick={() => setShowConfirmResetClicks(true)}
          disabled={loading}
          className={`${buttonBaseClass} border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 disabled:opacity-50`}
          title="Azzera click"
        >
          <RotateCcw className={showInline ? "h-3 w-3" : "h-4 w-4"} />
        </button>

        {/* 7. Pulsante Elimina (ROSSO) */}
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

      {/* Modal di conferma azzeramento click */}
      <ConfirmationModal
        isOpen={showConfirmResetClicks}
        onClose={() => setShowConfirmResetClicks(false)}
        onConfirm={handleResetClicks}
        title="Azzera Click"
        message="Sei sicuro di voler azzerare tutti i click di questo link? Tutti i dati analitici verranno eliminati."
        confirmText="Azzera"
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

      {/* Modal Gestione Cartelle */}
      {showFolderModal && linkId && (
        <MultiFolderSelector
          isOpen={showFolderModal}
          onClose={() => setShowFolderModal(false)}
          linkId={linkId}  // Usa l'ID numerico invece dello shortCode
          linkTitle={shortCode}
          currentFolders={linkFolders}
          availableFolders={availableFolders}
          onSave={handleSaveFolderAssociations}
          onToast={onToast}
        />
      )}
      {showFolderModal && !linkId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Errore</h3>
            <p className="mb-4">Impossibile caricare i dati delle cartelle. ID del link non disponibile.</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowFolderModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
