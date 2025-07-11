'use client';

import { useState } from 'react';
import { FolderIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { useClickOutside } from '../hooks/useClickOutside';

interface ViewModeToggleProps {
  enableMultipleFolders: boolean;
  showMultipleFoldersColumn: boolean;
  onToggleMultipleFolders: (enabled: boolean) => void;
  onToggleColumn: (show: boolean) => void;
}

export default function ViewModeToggle({
  enableMultipleFolders,
  showMultipleFoldersColumn,
  onToggleMultipleFolders,
  onToggleColumn
}: ViewModeToggleProps) {
  const [showOptions, setShowOptions] = useState(false);

  // Click esterno per chiudere il dropdown
  const dropdownRef = useClickOutside<HTMLDivElement>(() => {
    setShowOptions(false);
  }, showOptions);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        title="Opzioni visualizzazione"
      >
        <AdjustmentsHorizontalIcon className="h-4 w-4" />
        <span>Vista</span>
      </button>

      {showOptions && (
        <div className="absolute right-0 z-10 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
          <div className="px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Opzioni di Visualizzazione</h3>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Toggle per abilitare cartelle multiple */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FolderIcon className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Cartelle Multiple
                  </div>
                  <div className="text-xs text-gray-500">
                    Permetti ai link di stare in più cartelle
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  onToggleMultipleFolders(!enableMultipleFolders);
                  if (!enableMultipleFolders) {
                    onToggleColumn(false); // Nascondi colonna se disabilitiamo la funzionalità
                  }
                }}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${enableMultipleFolders ? 'bg-blue-600' : 'bg-gray-200'}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                    transition duration-200 ease-in-out
                    ${enableMultipleFolders ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>

            {/* Toggle per mostrare colonna cartelle */}
            {enableMultipleFolders && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <div className="w-3 h-3 bg-gray-300 rounded"></div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Mostra Colonna Cartelle
                    </div>
                    <div className="text-xs text-gray-500">
                      Visualizza le cartelle nella tabella
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onToggleColumn(!showMultipleFoldersColumn)}
                  className={`
                    relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                    transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${showMultipleFoldersColumn ? 'bg-blue-600' : 'bg-gray-200'}
                  `}
                >
                  <span
                    className={`
                      pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                      transition duration-200 ease-in-out
                      ${showMultipleFoldersColumn ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  />
                </button>
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              {enableMultipleFolders 
                ? "I link possono appartenere a più cartelle contemporaneamente" 
                : "Modalità tradizionale: un link per cartella"
              }
            </div>
          </div>
        </div>
      )}

      {/* Overlay per chiudere il menu - Non più necessario con useClickOutside */}
      {showOptions && (
        <div className="sr-only">
          {/* Overlay rimosso perché gestito da useClickOutside */}
        </div>
      )}
    </div>
  );
}
