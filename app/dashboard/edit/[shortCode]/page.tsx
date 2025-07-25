import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getLinkByShortCode, getLinkFolders } from '@/app/dashboard/actions';
import EditLinkForm from './edit-link-form';

interface LinkData {
  short_code: string;
  original_url: string;
  title: string | null;
  description: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  created_at: string | Date;
}

interface LinkFolder {
  id: string;
  name: string;
  parent_folder_id: string | null;
}

interface EditLinkPageProps {
  params: Promise<{
    shortCode: string;
  }>;
  searchParams: Promise<{
    from?: string;
  }>;
}

export default async function EditLinkPage({ params, searchParams }: EditLinkPageProps) {
  const { shortCode } = await params;
  const { from } = await searchParams;
  
  try {
    const [linkData, linkFolders] = await Promise.all([
      getLinkByShortCode(shortCode),
      getLinkFolders(shortCode)
    ]);
    
    if (!linkData) {
      redirect('/dashboard');
    }

    // Cast del tipo per garantire compatibilità
    const typedLinkData = linkData as LinkData;
    const typedLinkFolders = linkFolders as LinkFolder[];
    
    // Determina il link di ritorno basato sul parametro 'from'
    const backUrl = from === 'stats' ? `/dashboard/stats/${shortCode}` : '/dashboard';
    const backText = from === 'stats' ? '← Torna alle Statistiche' : '← Torna alla Dashboard';

    return (
      <div className="flex flex-col items-center min-h-screen bg-gray-50 py-12">
        <div className="w-full max-w-4xl p-4 md:p-8 space-y-8">
          
          <header>
            <Link href={backUrl} className="text-blue-600 hover:underline">
              {backText}
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">
              Modifica Link
            </h1>
            <p className="text-gray-600 mt-2">
              Modifica i dettagli del tuo link shortato
            </p>
          </header>

          <main className="p-8 bg-white rounded-3xl shadow-md">
            <EditLinkForm linkData={typedLinkData} linkFolders={typedLinkFolders} returnTo={from} />
          </main>
          
        </div>
      </div>
    );
  } catch (error) {
    console.error('Errore durante il caricamento del link:', error);
    redirect('/dashboard');
  }
}
