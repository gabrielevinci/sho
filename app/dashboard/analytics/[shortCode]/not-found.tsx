import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="text-center">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Link non trovato</h1>
        <p className="text-lg text-gray-600 mb-8 max-w-md">
          Il link che stai cercando non esiste o non hai i permessi per visualizzarne le statistiche.
        </p>
        <Link 
          href="/dashboard"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Torna alla Dashboard
        </Link>
      </div>
    </div>
  );
}
