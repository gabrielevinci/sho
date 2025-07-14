'use client';

import useSWR from 'swr';
import { useCallback, useRef } from 'react';

interface CacheConfig {
  revalidateOnFocus?: boolean;
  revalidateOnMount?: boolean;
  refreshInterval?: number;
  dedupingInterval?: number;
  suspense?: boolean;
}

interface CachedDataHook<T> {
  data: T | undefined;
  error: unknown;
  isLoading: boolean;
  mutate: (data?: T | Promise<T> | ((current: T | undefined) => T | Promise<T> | undefined), opts?: boolean | { revalidate?: boolean; populateCache?: boolean }) => Promise<T | undefined>;
  revalidate: () => Promise<T | undefined>;
  isValidating: boolean;
}

// Cache globale per persistere i dati tra navigazioni
const globalCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

// TTL predefiniti per diversi tipi di dati (in millisecondi)
const DEFAULT_TTLS = {
  links: 5 * 60 * 1000,        // 5 minuti per i link
  folders: 10 * 60 * 1000,     // 10 minuti per le cartelle
  analytics: 2 * 60 * 1000,    // 2 minuti per le analytics
  workspaces: 30 * 60 * 1000,  // 30 minuti per i workspace
} as const;

/**
 * Hook personalizzato per la gestione intelligente della cache
 * Utilizza SWR con una cache globale persistente per evitare richieste duplicate
 */
export function useCachedData<T>(
  key: string | null,
  fetcher?: (key: string) => Promise<T>,
  options: CacheConfig & { 
    ttl?: number;
    fallbackData?: T;
    cacheType?: keyof typeof DEFAULT_TTLS;
  } = {}
): CachedDataHook<T> {
  const {
    ttl,
    cacheType = 'links',
    fallbackData,
    revalidateOnFocus = false,
    revalidateOnMount = true,
    refreshInterval = 0,
    dedupingInterval = 60000,
    suspense = false,
    ...swrOptions
  } = options;

  const effectiveTtl = ttl ?? DEFAULT_TTLS[cacheType];
  const lastKeyRef = useRef<string | null>(null);

  // Funzione per controllare se i dati in cache sono ancora validi
  const getCachedData = useCallback((cacheKey: string): T | undefined => {
    const cached = globalCache.get(cacheKey);
    if (!cached) return undefined;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      globalCache.delete(cacheKey);
      return undefined;
    }
    
    return cached.data as T | undefined;
  }, []);

  // Funzione per salvare i dati in cache
  const setCachedData = useCallback((cacheKey: string, data: T) => {
    globalCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: effectiveTtl
    });
  }, [effectiveTtl]);

  // Fetcher personalizzato che usa la cache globale
  const cachedFetcher = useCallback(async (fetchKey: string): Promise<T> => {
    // Controlla prima la cache globale
    const cachedData = getCachedData(fetchKey);
    if (cachedData !== undefined) {
      console.log(`[Cache Hit] Using cached data for: ${fetchKey}`);
      return cachedData;
    }

    // Se non in cache, effettua la richiesta
    if (!fetcher) {
      throw new Error('No fetcher provided and no cached data available');
    }

    console.log(`[Cache Miss] Fetching fresh data for: ${fetchKey}`);
    const freshData = await fetcher(fetchKey);
    
    // Salva in cache i dati freschi
    setCachedData(fetchKey, freshData);
    
    return freshData;
  }, [fetcher, getCachedData, setCachedData]);

  // Determina se utilizzare i dati dalla cache come fallback
  const shouldUseCache = useCallback(() => {
    if (!key) return false;
    
    // Se la chiave è cambiata, usa la cache come fallback
    const keyChanged = lastKeyRef.current !== key;
    lastKeyRef.current = key;
    
    if (keyChanged) {
      const cached = getCachedData(key);
      return cached !== undefined;
    }
    
    return false;
  }, [key, getCachedData]);

  // Configura SWR
  const swrResult = useSWR<T>(
    key,
    cachedFetcher,
    {
      fallbackData: shouldUseCache() && key ? getCachedData(key) ?? fallbackData : fallbackData,
      revalidateOnFocus,
      revalidateOnMount: key ? revalidateOnMount : false,
      refreshInterval,
      dedupingInterval,
      suspense,
      // Configurazioni aggiuntive per migliorare la performance
      compare: (a: T | undefined, b: T | undefined) => {
        // Confronto personalizzato per evitare re-render inutili
        return JSON.stringify(a) === JSON.stringify(b);
      },
      onSuccess: (data: T) => {
        if (key) {
          setCachedData(key, data);
        }
      },
      onError: (error: unknown) => {
        console.error(`[Cache Error] Failed to fetch data for: ${key}`, error);
      },
      ...swrOptions
    }
  );

  // Wrapped mutate function per aggiornare anche la cache globale
  const mutate = useCallback(
    async (data?: T | Promise<T> | ((current: T | undefined) => T | Promise<T> | undefined), opts?: boolean | { revalidate?: boolean; populateCache?: boolean }) => {
      const result = await swrResult.mutate(data, opts);
      
      // Aggiorna anche la cache globale se disponibile
      if (key && result !== undefined) {
        setCachedData(key, result);
      }
      
      return result;
    },
    [swrResult, key, setCachedData]
  );

  return {
    data: swrResult.data,
    error: swrResult.error,
    isLoading: swrResult.isLoading,
    mutate,
    revalidate: swrResult.mutate,
    isValidating: swrResult.isValidating,
  };
}

/**
 * Hook specializzato per i link di un workspace
 */
export function useCachedLinks(workspaceId: string | null) {
  return useCachedData(
    workspaceId ? `/api/links-with-folders?workspaceId=${workspaceId}` : null,
    undefined,
    {
      cacheType: 'links',
      revalidateOnFocus: false,
      refreshInterval: 5 * 60 * 1000, // Refresh ogni 5 minuti
    }
  );
}

/**
 * Hook specializzato per le cartelle di un workspace
 */
export function useCachedFolders(workspaceId: string | null) {
  return useCachedData(
    workspaceId ? `/api/folders?workspaceId=${workspaceId}` : null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch folders');
      }
      return res.json();
    },
    {
      cacheType: 'folders',
      revalidateOnFocus: false,
      refreshInterval: 10 * 60 * 1000, // Refresh ogni 10 minuti
    }
  );
}

/**
 * Hook specializzato per le analytics di un link
 */
export function useCachedAnalytics(shortCode: string | null) {
  return useCachedData(
    shortCode ? `/api/analytics/${shortCode}` : null,
    undefined,
    {
      cacheType: 'analytics',
      revalidateOnFocus: true, // Rivalidare quando si torna su analytics
      refreshInterval: 2 * 60 * 1000, // Refresh ogni 2 minuti
    }
  );
}

/**
 * Hook specializzato per i workspace dell'utente
 */
export function useCachedWorkspaces() {
  return useCachedData(
    '/api/workspaces',
    undefined,
    {
      cacheType: 'workspaces',
      revalidateOnFocus: false,
      refreshInterval: 30 * 60 * 1000, // Refresh ogni 30 minuti
    }
  );
}

/**
 * Funzione per invalidare manualmente la cache
 */
export function invalidateCache(pattern?: string) {
  if (pattern) {
    // Invalida tutte le chiavi che matchano il pattern
    for (const [key] of globalCache) {
      if (key.includes(pattern)) {
        globalCache.delete(key);
      }
    }
  } else {
    // Invalida tutta la cache
    globalCache.clear();
  }
}

/**
 * Funzione per pre-caricare i dati in cache
 */
export async function preloadData<T>(key: string, fetcher: () => Promise<T>, ttl?: number) {
  try {
    const data = await fetcher();
    globalCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? DEFAULT_TTLS.links
    });
    console.log(`[Cache Preload] Data preloaded for: ${key}`);
  } catch (error) {
    console.error(`[Cache Preload] Failed to preload data for: ${key}`, error);
  }
}
