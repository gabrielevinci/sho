'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import Portal from './Portal';

interface DeleteFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  folderName: string;
  isDefault?: boolean;
}

export default function DeleteFolderModal({
  isOpen,
  onClose,
  onConfirm,
  folderName,
  isDefault = false
}: DeleteFolderModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
      onClose();
    }
  }, [onConfirm, onClose]);

  // Gestione tasti
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !isDeleting && !isDefault) {
        handleConfirm();
      } else if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isDeleting, isDefault, handleConfirm]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[9999]">
        <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4 shadow-xl relative">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isDefault ? 'Azione non consentita' : 'Elimina cartella'}
            </h3>
          </div>
        </div>

        <div className="mb-6">
          {isDefault ? (
            <p className="text-gray-600">
              La cartella <strong>&quot;{folderName}&quot;</strong> non può essere eliminata perché è la cartella predefinita del workspace.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-600">
                Sei sicuro di voler eliminare la cartella <strong>&quot;{folderName}&quot;</strong>?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Questa azione:</strong>
                </p>
                <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                  <li>• Eliminerà la cartella e tutte le sue sottocartelle</li>
                  <li>• Sposterà tutti i link contenuti nella cartella &quot;Tutti i link&quot;</li>
                  <li>• Non può essere annullata</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            {isDefault ? 'Chiudi' : 'Annulla'}
          </button>
          {!isDefault && (
            <button
              onClick={handleConfirm}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Eliminando...</span>
                </>
              ) : (
                <>
                  <TrashIcon className="h-4 w-4" />
                  <span>Elimina</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
      </div>
    </Portal>
  );
}
