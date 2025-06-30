'use client';

import { SITE_URL } from '@/app/lib/config';
import { useState } from 'react';

// Definiamo il tipo per un singolo link, come arriva dal DB
export type LinkFromDB = {
  short_code: string;
  original_url: string;
  created_at: Date;
};

// Definiamo le props che il nostro componente riceverà
interface LinksListProps {
  links: LinkFromDB[];
}

export default function LinksList({ links }: LinksListProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (shortCode: string) => {
    const fullUrl = `${SITE_URL}/${shortCode}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(shortCode);
    setTimeout(() => setCopiedCode(null), 2000); // Resetta lo stato dopo 2 secondi
  };

  if (links.length === 0) {
    return (
      <div className="mt-4 p-6 bg-white rounded-lg shadow-md text-center text-gray-500">
        <p>Non hai ancora creato nessun link in questo workspace.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Link Shortato</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Originale</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creato</th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Copia</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {links.map((link) => {
            const fullShortUrl = `${SITE_URL}/${link.short_code}`;
            return (
              <tr key={link.short_code}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <a href={fullShortUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">
                    {fullShortUrl.replace('https://', '').replace('http://', '')}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-700 truncate block max-w-xs">{link.original_url}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(link.created_at).toLocaleDateString('it-IT')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleCopy(link.short_code)} className="text-gray-400 hover:text-gray-600">
                    {copiedCode === link.short_code ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
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