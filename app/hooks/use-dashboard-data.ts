'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseDashboardDataProps {
  workspaceId: string;
  onError: (message: string) => void;
}

export function useDashboardData({ workspaceId, onError }: UseDashboardDataProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Annulla le richieste precedenti quando il componente viene unmountato
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchWithRetry = useCallback(async (
    url: string, 
    retries: number = 3, 
    delay: number = 1000
  ): Promise<Response> => {
    for (let i = 0; i < retries; i++) {
      try {
        // Annulla la richiesta precedente se esiste
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Crea un nuovo AbortController
        abortControllerRef.current = new AbortController();

        const response = await fetch(url, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Se la richiesta è stata annullata, non riprovare
          throw error;
        }
        
        if (i === retries - 1) {
          throw error;
        }
        
        // Attendi prima di riprovare
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retries reached');
  }, []);

  const refreshData = useCallback(async (dataType: 'links' | 'folders' | 'both') => {
    if (!workspaceId || isLoading) return null;

    setIsLoading(true);
    try {
      const promises = [];

      if (dataType === 'links' || dataType === 'both') {
        promises.push(
          fetchWithRetry(`/api/links-with-folders?workspaceId=${workspaceId}`)
        );
      }

      if (dataType === 'folders' || dataType === 'both') {
        promises.push(
          fetchWithRetry(`/api/folders?workspaceId=${workspaceId}`)
        );
      }

      const responses = await Promise.all(promises);
      const data = await Promise.all(responses.map(response => response.json()));

      setLastRefresh(Date.now());

      // Ritorna i dati in base al tipo richiesto
      if (dataType === 'links') {
        return { links: data[0]?.links || [] };
      } else if (dataType === 'folders') {
        return { folders: data[0]?.folders || [] };
      } else {
        return {
          links: data[0]?.links || [],
          folders: data[1]?.folders || []
        };
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Se la richiesta è stata annullata, non mostrare errore
        return null;
      }
      
      console.error(`❌ Errore durante il refresh dei dati (${dataType}):`, error);
      onError(`Errore durante il caricamento dei dati`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, isLoading, fetchWithRetry, onError]);

  return {
    isLoading,
    lastRefresh,
    refreshData
  };
}
