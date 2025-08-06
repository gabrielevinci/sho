'use client';

import { getCachedLinkStats, setCachedLinkStats } from '../lib/data-preloader';

/**
 * Hook per precaricamento intelligente delle statistiche dei link
 * Monitora i link visibili e precarica le loro statistiche
 */
export function useStatsPreloader() {
  const preloadStatsForLink = async (shortCode: string, workspaceId: string, userId: string) => {
    // Controlla se abbiamo già le statistiche in cache
    const cached = getCachedLinkStats(workspaceId, userId, shortCode);
    if (cached) {
      console.log('📊 Statistiche già in cache per:', shortCode);
      return cached;
    }

    try {
      console.log('🚀 Precaricamento statistiche per:', shortCode);
      const response = await fetch(`/api/stats/${shortCode}?mode=all`);
      
      if (response.ok) {
        const stats = await response.json();
        setCachedLinkStats(workspaceId, userId, shortCode, stats);
        console.log('✅ Statistiche precaricate per:', shortCode);
        return stats;
      }
    } catch (error) {
      console.warn('⚠️ Errore precaricamento stats per', shortCode, ':', error);
    }
    
    return null;
  };

  const preloadStatsForVisibleLinks = async (links: any[], workspaceId: string, userId: string) => {
    if (!workspaceId || !userId || !links.length) return;

    // Precarica le statistiche per i primi 5 link più recenti
    const topLinks = links.slice(0, 5);
    
    console.log(`🎯 Precaricamento statistiche per ${topLinks.length} link più recenti...`);
    
    const preloadPromises = topLinks.map(link => 
      preloadStatsForLink(link.short_code, workspaceId, userId)
    );
    
    try {
      await Promise.all(preloadPromises);
      console.log('✅ Precaricamento completato per tutti i link visibili');
    } catch (error) {
      console.warn('⚠️ Alcuni precaricamenti sono falliti:', error);
    }
  };

  return {
    preloadStatsForLink,
    preloadStatsForVisibleLinks
  };
}
