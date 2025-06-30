import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Link as LinkIcon, BarChart } from 'lucide-react';

/*
 * HomePage: La porta d'ingresso dell'applicazione.
 *
 * Questo è un Server Component asincrono. La sua responsabilità primaria è
 * determinare se l'utente ha una sessione attiva.
 * - Se la sessione è attiva, reindirizza immediatamente alla /dashboard.
 * - Altrimenti, renderizza una landing page pulita e informativa.
 *
 * Questa logica previene che un utente loggato veda la pagina di marketing
 * e migliora l'esperienza utente.
 */
export default async function HomePage() {
  const session = await getSession();

  // Reindirizzamento lato server per utenti già autenticati.
  if (session.isLoggedIn) {
    redirect('/dashboard');
  }

  // Se l'utente non è loggato, renderizziamo la landing page.
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-4 sm:p-6">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tighter text-gray-900">
            sho
          </h1>
          <Link 
            href="/login" 
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Accedi
          </Link>
        </div>
      </header>

      {/* Sezione Principale (Hero) */}
      <main className="flex-grow flex items-center">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tighter text-gray-900 leading-tight">
            Dai più valore ai tuoi link.
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
            Crea link brevi, memorabili e tracciabili. Controlla ogni click e ottimizza le tue campagne con una piattaforma potente e minimale.
          </p>
          <div className="mt-8 flex justify-center">
            <Link 
              href="/register" 
              className="inline-flex items-center justify-center px-8 py-4 bg-gray-900 text-white font-semibold rounded-lg shadow-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-transform transform hover:scale-105"
            >
              <span>Inizia Gratuitamente</span>
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Sezione Features */}
      <section className="w-full py-12 md:py-24 bg-white">
        <div className="container mx-auto grid gap-12 px-4 md:px-6 lg:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <LinkIcon className="h-10 w-10 text-gray-900 mb-4" />
            <h3 className="text-xl font-bold">Link Shortening</h3>
            <p className="text-gray-600 mt-2">
              Trasforma URL lunghi e complessi in link brevi e facili da condividere.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <BarChart className="h-10 w-10 text-gray-900 mb-4" />
            <h3 className="text-xl font-bold">Analisi dei Click</h3>
            <p className="text-gray-600 mt-2">
              (Prossimamente) Ottieni statistiche dettagliate su chi clicca i tuoi link.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <svg className="h-10 w-10 text-gray-900 mb-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 2.5a2.5 2.5 0 0 1 3 3L11 13H8v-3l7.5-7.5Z"/><path d="m15 5 3 3"/><path d="M22 13.5V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4.5"/></svg>
            <h3 className="text-xl font-bold">Domini Personalizzati</h3>
            <p className="text-gray-600 mt-2">
              (Prossimamente) Collega il tuo dominio per brandizzare i tuoi link.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-6 bg-gray-100">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} sho. Tutti i diritti riservati.</p>
        </div>
      </footer>
    </div>
  );
}