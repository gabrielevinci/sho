'use client';

import { SITE_URL } from '@/app/lib/config';
import { useState } from 'react';

// Aggiorniamo il tipo per includere il contatore di click
export type LinkFromDB = {
  short_code: string;
  original_url: string;
  created_at: Date;
  title: string | null;
  description: string | null;
  click_count: number;
};

interface LinksListProps {
  links: LinkFromDB[];
}

export default function LinksList({ links }: LinksListProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (shortCode: string) => {
    const fullUrl = `${SITE_URL}/${shortCode}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(shortCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (links.length === 0) {
    return (
      <div className="mt-4 p-6 bg-white rounded-lg shadow-md text-center text-gray-500">
        <p>Non hai ancora creato nessun link in questo workspace.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titolo / Destinazione</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Link Shortato</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Click</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creato</th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Azioni</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {links.map((link) => {
            const fullShortUrl = `${SITE_URL}/${link.short_code}`;
            return (
              <tr key={link.short_code}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900 truncate max-w-xs">{link.title || 'Nessun Titolo'}</div>
                  <a href={link.original_url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700 truncate block max-w-xs">{link.original_url}</a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <a href={fullShortUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">{fullShortUrl.replace(/^https?:\/\//, '')}</a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-bold text-center">{link.click_count}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(link.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleCopy(link.short_code)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    {copiedCode === link.short_code ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" /><path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h6a2 2 0 00-2-2H5z" /></svg>
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}