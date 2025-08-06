import { Suspense } from 'react';
import StatsPageClient from './stats-client';

// Funzione per recuperare i dati lato server
async function getInitialStats(shortCode: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/stats/${shortCode}?filter=sempre`, {
      cache: 'no-store' // Sempre dati freschi
    });
    
    if (!response.ok) {
      throw new Error('Errore durante il caricamento delle statistiche');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Errore caricamento stats lato server:', error);
    return null;
  }
}

export default async function LinkStatsPage({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  
  // Pre-carica i dati lato server
  const initialStats = await getInitialStats(shortCode);

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Caricamento statistiche...</p>
        </div>
      </div>
    }>
      <StatsPageClient 
        shortCode={shortCode} 
        initialStats={initialStats}
      />
    </Suspense>
  );
}
