'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Calendar } from 'lucide-react';
import LinkActions from '../../components/LinkActions';

type LinkAnalytics = {
  short_code: string;
  original_url: string;
  title: string | null;
  description: string | null;
  click_count: number;
  created_at: Date;
};

interface LinkHeaderProps {
  linkData: LinkAnalytics;
  shortCode: string;
}

export default function LinkHeader({ linkData, shortCode }: LinkHeaderProps) {
  const [shortUrl, setShortUrl] = useState('');

  // Otteniamo l'URL solo lato client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShortUrl(`${window.location.origin}/${shortCode}`);
    }
  }, [shortCode]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              📊 Statistiche Link
            </h1>
            <LinkActions
              shortCode={shortCode}
              originalUrl={linkData.original_url}
              title={linkData.title}
              description={linkData.description}
              onUpdate={() => window.location.reload()}
            />
          </div>

          {/* Contenuto del link */}
          <div className="space-y-4">
            {/* Titolo */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {linkData.title || 'Link senza titolo'}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Link shortato:</span>
                <a 
                  href={shortUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                >
                  <span>{shortUrl}</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* URL */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Reindirizza a:</span>
              <a 
                href={linkData.original_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 truncate max-w-md"
              >
                <span className="truncate">{linkData.original_url}</span>
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
              </a>
            </div>

            {/* Descrizione */}
            {linkData.description && (
              <p className="text-gray-600 text-sm leading-relaxed">{linkData.description}</p>
            )}

            {/* Data di creazione */}
            <div className="flex items-center space-x-1 text-xs text-gray-500 pt-2 border-t border-gray-100">
              <Calendar className="h-4 w-4" />
              <span>Creato il {new Date(linkData.created_at).toLocaleDateString('it-IT', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
