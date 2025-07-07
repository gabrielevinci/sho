import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getLinkByShortCode } from '@/app/dashboard/actions';
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

interface EditLinkPageProps {
  params: Promise<{
    shortCode: string;
  }>;
}

export default async function EditLinkPage({ params }: EditLinkPageProps) {
  const { shortCode } = await params;
  
  try {
    const linkData = await getLinkByShortCode(shortCode);
    
    if (!linkData) {
      redirect('/dashboard');
    }

    // Cast del tipo per garantire compatibilità
    const typedLinkData = linkData as LinkData;

    return (
      <div className="flex flex-col items-center min-h-screen bg-gray-50 py-12">
        <div className="w-full max-w-4xl p-4 md:p-8 space-y-8">
          
          <header>
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              ← Torna alla Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">
              Modifica Link
            </h1>
            <p className="text-gray-600 mt-2">
              Modifica i dettagli del tuo link shortato
            </p>
          </header>

          <main className="p-8 bg-white rounded-lg shadow-md">
            <EditLinkForm linkData={typedLinkData} />
          </main>
          
        </div>
      </div>
    );
  } catch (error) {
    console.error('Errore durante il caricamento del link:', error);
    redirect('/dashboard');
  }
}
