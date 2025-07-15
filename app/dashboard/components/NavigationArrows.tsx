'use client';

import { ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface NavigationArrowsProps {
  navigationHistory: string[];
  navigationIndex: number;
  onNavigationChange: (history: string[], index: number) => void;
  onFolderSelect: (folderId: string | null, isNavigating?: boolean) => void;
  selectedFolderId: string | null;
  defaultFolderId: string | null;
  folders: Array<{
    id: string;
    name: string;
    parent_folder_id: string | null;
  }>;
}

export default function NavigationArrows({
  navigationHistory,
  navigationIndex,
  onNavigationChange,
  onFolderSelect,
  selectedFolderId,
  defaultFolderId,
  folders
}: NavigationArrowsProps) {
  
  // Funzione per andare indietro nella cronologia
  const goBack = () => {
    if (navigationIndex > 0) {
      const newIndex = navigationIndex - 1;
      const targetFolderId = navigationHistory[newIndex] || null;
      console.log('⬅️ Vai indietro:', {
        from: navigationIndex,
        to: newIndex,
        targetFolderId,
        historyLength: navigationHistory.length
      });
      
      // Prima cambiamo l'indice nella cronologia
      onNavigationChange(navigationHistory, newIndex);
      
      // Poi cambiamo la cartella selezionata
      setTimeout(() => {
        onFolderSelect(targetFolderId === '' ? null : targetFolderId, true);
      }, 0);
    }
  };

  // Funzione per andare avanti nella cronologia
  const goForward = () => {
    if (navigationIndex < navigationHistory.length - 1) {
      const newIndex = navigationIndex + 1;
      const targetFolderId = navigationHistory[newIndex] || null;
      console.log('➡️ Vai avanti:', {
        from: navigationIndex,
        to: newIndex,
        targetFolderId,
        historyLength: navigationHistory.length
      });
      
      // Prima cambiamo l'indice nella cronologia
      onNavigationChange(navigationHistory, newIndex);
      
      // Poi cambiamo la cartella selezionata
      setTimeout(() => {
        onFolderSelect(targetFolderId === '' ? null : targetFolderId, true);
      }, 0);
    }
  };

  // Funzione per andare al livello superiore della cartella
  const goUp = () => {
    if (!selectedFolderId || selectedFolderId === defaultFolderId) {
      return; // Già al livello più alto
    }

    const currentFolder = folders.find(f => f.id === selectedFolderId);
    if (currentFolder?.parent_folder_id) {
      // Vai alla cartella genitore
      onFolderSelect(currentFolder.parent_folder_id, false);
    } else {
      // Vai alla cartella "Tutti i link" (livello principale)
      onFolderSelect(defaultFolderId, false);
    }
  };

  // Determina se i pulsanti sono abilitati
  const canGoBack = navigationIndex > 0;
  const canGoForward = navigationIndex < navigationHistory.length - 1;
  const canGoUp = selectedFolderId !== defaultFolderId && selectedFolderId !== null;

  // Trova il nome della cartella genitore per il tooltip
  const getUpTooltip = () => {
    if (!canGoUp) return 'Già al livello principale';
    
    const currentFolder = folders.find(f => f.id === selectedFolderId);
    if (currentFolder?.parent_folder_id) {
      const parentFolder = folders.find(f => f.id === currentFolder.parent_folder_id);
      return `Vai a "${parentFolder?.name || 'Cartella genitore'}"`;
    } else {
      return 'Vai a "Tutti i link"';
    }
  };

  // Trova il nome della cartella per i tooltip di navigazione
  const getNavigationTooltip = (index: number, direction: 'back' | 'forward') => {
    if (!canGoBack && direction === 'back') return 'Nessuna pagina precedente';
    if (!canGoForward && direction === 'forward') return 'Nessuna pagina successiva';
    
    const targetIndex = direction === 'back' ? navigationIndex - 1 : navigationIndex + 1;
    if (targetIndex < 0 || targetIndex >= navigationHistory.length) {
      return direction === 'back' ? 'Nessuna pagina precedente' : 'Nessuna pagina successiva';
    }
    
    const targetFolderId = navigationHistory[targetIndex];
    
    if (!targetFolderId || targetFolderId === '') {
      return direction === 'back' ? 'Torna a "Tutti i link"' : 'Vai a "Tutti i link"';
    }
    
    if (targetFolderId === defaultFolderId) {
      return direction === 'back' ? 'Torna a "Tutti i link"' : 'Vai a "Tutti i link"';
    }
    
    const targetFolder = folders.find(f => f.id === targetFolderId);
    const folderName = targetFolder?.name || 'Cartella sconosciuta';
    
    return direction === 'back' ? `Torna a "${folderName}"` : `Vai a "${folderName}"`;
  };

  return (
    <div className="flex items-center bg-white rounded border border-gray-200 overflow-hidden">
      {/* Freccia Indietro */}
      <button
        onClick={goBack}
        disabled={!canGoBack}
        className={`p-1.5 transition-all duration-150 border-r border-gray-200 ${
          canGoBack
            ? 'text-blue-600 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100'
            : 'text-gray-300 cursor-not-allowed'
        }`}
        title={getNavigationTooltip(navigationIndex, 'back')}
      >
        <ChevronLeftIcon className="w-3 h-3" />
      </button>

      {/* Freccia Su (livello superiore) */}
      <button
        onClick={goUp}
        disabled={!canGoUp}
        className={`p-1.5 transition-all duration-150 border-r border-gray-200 ${
          canGoUp
            ? 'text-blue-600 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100'
            : 'text-gray-300 cursor-not-allowed'
        }`}
        title={getUpTooltip()}
      >
        <ChevronUpIcon className="w-3 h-3" />
      </button>

      {/* Freccia Avanti */}
      <button
        onClick={goForward}
        disabled={!canGoForward}
        className={`p-1.5 transition-all duration-150 ${
          canGoForward
            ? 'text-blue-600 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100'
            : 'text-gray-300 cursor-not-allowed'
        }`}
        title={getNavigationTooltip(navigationIndex, 'forward')}
      >
        <ChevronRightIcon className="w-3 h-3" />
      </button>
    </div>
  );
}
