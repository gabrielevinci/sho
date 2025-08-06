import { Suspense } from 'react';
import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import StatsPageClient from './stats-client';

// Funzione per recuperare i dati del link lato server e verificare autorizzazione
async function getLinkData(shortCode: string, userId: string) {
  try {
    const { rows } = await sql`
      SELECT 
        id,
        short_code,
        original_url,
        title,
        description,
        created_at,
        user_id
      FROM links 
      WHERE short_code = ${shortCode} AND user_id = ${userId}
    `;
    
    if (rows.length === 0) {
      return null;
    }
    
    return {
      id: String(rows[0].id),
      shortCode: String(rows[0].short_code),
      originalUrl: String(rows[0].original_url),
      title: rows[0].title ? String(rows[0].title) : null,
      description: rows[0].description ? String(rows[0].description) : null,
      createdAt: String(rows[0].created_at)
    };
  } catch (error) {
    console.error('Errore caricamento link lato server:', error);
    return null;
  }
}

// Loading component ottimizzato
const StatsLoading = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="container mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="w-32 h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="w-96 h-8 bg-gray-200 rounded animate-pulse"></div>
      </div>
      
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
            <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
      
      {/* Chart skeleton */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="w-48 h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="w-full h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  </div>
);

interface StatsPageProps {
  params: Promise<{
    shortCode: string;
  }>;
}

export default async function LinkStatsPage({ params }: StatsPageProps) {
  // Verifica autenticazione
  const session = await getSession();
  if (!session?.userId || !session.isLoggedIn) {
    redirect('/login');
  }

  const { shortCode } = await params;
  
  // Pre-carica solo i dati del link per verificare autorizzazione
  const linkData = await getLinkData(shortCode, session.userId);
  
  if (!linkData) {
    redirect('/dashboard'); // Link non trovato o non autorizzato
  }

  // Inizializza le stats come null - verranno caricate dal client
  const initialStats = null;

  return (
    <Suspense fallback={<StatsLoading />}>
      <StatsPageClient 
        shortCode={shortCode} 
        initialStats={initialStats}
      />
    </Suspense>
  );
}
