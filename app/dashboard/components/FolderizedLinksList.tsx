'use client';

import { useState } from 'react';
import LinkRow from './LinkRow';
import { LinkFromDB } from './LinkRow';

interface FolderizedLinksListProps {
  links: LinkFromDB[];
  selectedFolderId: string | null;
  defaultFolderId: string | null;
  onUpdateLinks: () => void;
  onDeleteLink: (shortCode: string) => void;
  onUpdateLink?: (shortCode: string, updates: Partial<LinkFromDB>) => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

export default function FolderizedLinksList({ 
  links, 
  selectedFolderId, 
  defaultFolderId,
  onUpdateLinks,
  onDeleteLink,
  onUpdateLink,
  onToast
}: FolderizedLinksListProps) {
  const [draggedLink, setDraggedLink] = useState<LinkFromDB | null>(null);

  // Filtra i link in base alla cartella selezionata
  const filteredLinks = links.filter(link => {
    // Se è selezionata la cartella "Tutti i link", mostra tutti i link
    if (selectedFolderId === defaultFolderId) {
      return true;
    }
    // Altrimenti mostra solo i link della cartella specifica
    return link.folder_id === selectedFolderId;
  });

  // Gestione del drag and drop
  const handleDragStart = (e: React.DragEvent, link: LinkFromDB) => {
    setDraggedLink(link);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', link.id);
  };

  const handleDragEnd = () => {
    setDraggedLink(null);
  };

  const handleMoveToFolder = async (linkId: string, folderId: string | null) => {
    try {
      const response = await fetch('/api/links/move', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkId,
          folderId
        }),
      });

      if (response.ok) {
        onUpdateLinks();
      } else {
        console.error('Errore durante lo spostamento del link');
      }
    } catch (error) {
      console.error('Errore durante lo spostamento del link:', error);
    }
  };

  // Utilizzata implicitamente dal sistema di drag and drop
  void handleMoveToFolder;

  if (filteredLinks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md h-full flex items-center justify-center">
        <div className="text-center py-12">
          <div className="text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun link trovato</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedFolderId === defaultFolderId 
                ? "Non hai ancora creato nessun link." 
                : "Questa cartella è vuota."
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            {selectedFolderId === defaultFolderId ? 'Tutti i link' : 'Link in cartella'}
          </h3>
          <span className="text-sm text-gray-500">
            {filteredLinks.length} link{filteredLinks.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                Titolo
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Click
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                Link Breve
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                URL Originale
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-80">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLinks.map((link) => (
              <LinkRow
                key={link.id}
                link={link}
                onDelete={onDeleteLink}
                onUpdateLink={onUpdateLink}
                isDragging={draggedLink?.id === link.id}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onToast={onToast}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
