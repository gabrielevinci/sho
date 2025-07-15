'use client'; // Poiché questo file CONTIENE un Client Component, possiamo metterlo qui o nel componente stesso.

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

// Definiamo il tipo per un singolo link, per coerenza.
type Link = {
  id: number;
  short_code: string;
  original_url: string;
  created_at: Date;
};

/*
 * CopyButton: Un Client Component per l'interattività.
 *
 * La logica di copia negli appunti e la gestione dello stato (es. mostrare "Copiato!")
 * richiedono l'esecuzione nel browser.
 */
function CopyButton({ urlToCopy }: { urlToCopy: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(urlToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000); // Resetta lo stato dopo 2 secondi
  };

  return (
    <button
      onClick={handleCopy}
      className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-all disabled:text-green-500"
      disabled={isCopied}
      aria-label="Copia link"
    >
      {isCopied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
    </button>
  );
}

/*
 * LinkList: Un Server Component che renderizza la lista.
 *
 * Riceve i dati già fetchati dalla pagina padre. La sua unica
 * responsabilità è la presentazione.
 */
export default function LinkList({ links, baseUrl }: { links: Link[], baseUrl: string }) {
  // Gestione del caso in cui l'utente non ha ancora creato link.
  if (links.length === 0) {
    return (
      <div className="mt-4 p-8 bg-white rounded-3xl shadow-md text-center text-gray-500">
        <p>Non hai ancora creato nessun link.</p>
        <p className="text-sm">Usa il form qui sopra per iniziare!</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300 bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Link Shortato</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Originale</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Creato</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Copia</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {links.map((link) => {
                  const shortUrl = `${baseUrl}/${link.short_code}`;
                  return (
                    <tr key={link.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        <a href={shortUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline whitespace-nowrap overflow-hidden text-ellipsis inline-block max-w-[200px]">
                          {/* Rimuoviamo il protocollo per pulizia visiva */}
                          {shortUrl.replace(/^https?:\/\//, '')}
                        </a>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        <span className="whitespace-nowrap overflow-hidden text-ellipsis inline-block max-w-[200px]" title={link.original_url}>
                          {link.original_url}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(link.created_at).toLocaleDateString('it-IT')}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <CopyButton urlToCopy={shortUrl} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}