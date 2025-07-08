'use client';

import { useState, useEffect } from 'react';
import { LinkIcon, CalendarIcon, ChartBarIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

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

interface LinkCardProps {
  link: LinkFromDB;
  onDelete: (shortCode: string) => void;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, link: LinkFromDB) => void;
  onDragEnd: () => void;
}

export default function LinkCard({ 
  link, 
  onDelete, 
  isDragging,
  onDragStart,
  onDragEnd
}: LinkCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [shortUrl, setShortUrl] = useState('');

  // Costruisce l'URL breve quando il componente è montato
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShortUrl(`${window.location.origin}/${link.short_code}`);
    }
  }, [link.short_code]);

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo link?')) return;
    
    setIsDeleting(true);
    await onDelete(link.short_code);
    setIsDeleting(false);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Potresti aggiungere un toast di successo qui
    } catch (err) {
      console.error('Errore durante la copia:', err);
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
    <div
      className={`bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow duration-200 ${
        isDragging ? 'opacity-50 transform rotate-2' : ''
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, link)}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* URL breve */}
          <div className="flex items-center space-x-2 mb-2">
            <LinkIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <button
              onClick={() => copyToClipboard(shortUrl)}
              className="text-blue-600 hover:text-blue-800 font-medium truncate"
              title="Clicca per copiare"
            >
              {shortUrl}
            </button>
          </div>

          {/* Titolo */}
          {link.title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
              {link.title}
            </h3>
          )}

          {/* Descrizione */}
          {link.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {link.description}
            </p>
          )}

          {/* URL originale */}
          <button
            onClick={() => copyToClipboard(link.original_url)}
            className="text-gray-500 hover:text-gray-700 text-sm mb-3 truncate block w-full text-left"
            title="URL originale - Clicca per copiare"
          >
            → {link.original_url}
          </button>

          {/* Meta informazioni */}
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <CalendarIcon className="h-4 w-4" />
              <span>{formatDate(link.created_at)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <ChartBarIcon className="h-4 w-4" />
              <span>{link.click_count} click{link.click_count !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Azioni */}
        <div className="flex items-center space-x-2 ml-4">
          <Link
            href={`/dashboard/analytics/${link.short_code}`}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Visualizza Analytics"
          >
            <ChartBarIcon className="h-5 w-5" />
          </Link>
          
          <Link
            href={`/dashboard/edit/${link.short_code}`}
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Modifica Link"
          >
            <PencilIcon className="h-5 w-5" />
          </Link>
          
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Elimina Link"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
