'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { preloadData } from './use-cached-data';

interface DataPreloaderProps {
  workspaceId: string;
  currentPath: string;
}

/**
 * Componente per pre-caricare i dati quando l'utente naviga
 * Aiuta a ridurre i tempi di caricamento prevedendo le prossime pagine
 */
export function DataPreloader({ workspaceId, currentPath }: DataPreloaderProps) {
  useEffect(() => {
    // Pre-carica i dati della dashboard se siamo nelle analytics
    if (currentPath.includes('/analytics/')) {
      const preloadDashboardData = async () => {
        try {
          // Pre-carica i link del workspace con supporto cartelle multiple
          await preloadData(
            `/api/links-with-folders?workspaceId=${workspaceId}`,
            () => fetch(`/api/links-with-folders?workspaceId=${workspaceId}`).then(res => res.json()),
            5 * 60 * 1000 // TTL di 5 minuti
          );

          // Pre-carica le cartelle del workspace
          await preloadData(
            `/api/folders?workspaceId=${workspaceId}`,
            () => fetch(`/api/folders?workspaceId=${workspaceId}`).then(res => res.json()),
            10 * 60 * 1000 // TTL di 10 minuti
          );

          console.log('[Preloader] Dashboard data preloaded for workspace:', workspaceId);
        } catch (error) {
          console.error('[Preloader] Failed to preload dashboard data:', error);
        }
      };

      // Ritarda il preload per non interferire con il caricamento corrente
      const timeout = setTimeout(preloadDashboardData, 1000);
      return () => clearTimeout(timeout);
    }

    // Pre-carica le analytics se siamo nella dashboard e ci sono link
    if (currentPath.includes('/dashboard') && !currentPath.includes('/analytics/')) {
      // Questo potrebbe essere implementato per pre-caricare le analytics più visualizzate
      // Per ora, lo lasciamo per future ottimizzazioni
    }
  }, [workspaceId, currentPath]);

  // Questo componente non renderizza nulla
  return null;
}

/**
 * Hook per gestire la navigazione intelligente con preload
 */
export function useSmartNavigation() {
  const router = useRouter();

  const navigateWithPreload = async (path: string, preloadData?: () => Promise<void>) => {
    // Avvia il preload in parallelo alla navigazione
    if (preloadData) {
      preloadData().catch(error => {
        console.error('[Smart Navigation] Preload failed:', error);
      });
    }

    // Naviga immediatamente
    router.push(path);
  };

  return { navigateWithPreload, router };
}
