'use client';

// Fixed: resolved unused import issue for deployment
import { SITE_URL } from '@/app/lib/config';
import LinkActions from './components/LinkActions';

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
  onUpdateLinks: () => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

export default function LinksList({ links, onUpdateLinks, onToast }: LinksListProps) {
  if (links.length === 0) {
    return (
      <div className="mt-4 p-6 bg-white rounded-3xl shadow-md text-center text-gray-500">
        <p>Non hai ancora creato nessun link in questo workspace.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-md overflow-hidden dashboard-container">
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200 dashboard-table">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titolo</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Data Creazione</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shorted</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Originale</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {links.map((link) => {
              const fullShortUrl = `${SITE_URL}/${link.short_code}`;
              const displayUrl = fullShortUrl.replace(/^https?:\/\//, '');
              const truncatedTitle = link.title && link.title.length > 30 ? `${link.title.substring(0, 30)}...` : link.title;
              const truncatedOriginalUrl = link.original_url.length > 40 ? `${link.original_url.substring(0, 40)}...` : link.original_url;
              
              return (
                <tr key={link.short_code}>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-gray-900 link-title" title={link.title || 'Nessun Titolo'}>
                      {truncatedTitle || 'Nessun Titolo'}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {new Date(link.created_at).toLocaleDateString('it-IT', { 
                        weekday: 'short',
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <a 
                      href={fullShortUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:text-blue-800 font-medium url-display text-sm whitespace-nowrap overflow-hidden text-ellipsis inline-block max-w-[200px]"
                      title={fullShortUrl}
                    >
                      {displayUrl}
                    </a>
                  </td>
                  <td className="px-4 py-4">
                    <a 
                      href={link.original_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-gray-600 hover:text-gray-800 url-display text-sm whitespace-nowrap overflow-hidden text-ellipsis inline-block max-w-[200px]"
                      title={link.original_url}
                    >
                      {truncatedOriginalUrl}
                    </a>
                  </td>
                  <td className="px-4 py-4">
                    <div className="action-buttons">
                      <LinkActions
                        shortCode={link.short_code}
                        showInline={true}
                        onUpdate={onUpdateLinks}
                        onToast={onToast}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}