'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useCachedData } from './use-cached-data';
import { getCachedLinkStats, setCachedLinkStats } from '../lib/data-preloader';

/**
 * Hook per gestire la cache delle statistiche dei link
 * 
 * Questo hook implementa un sistema di cache intelligente che:
 * 1. Controlla prima le statistiche precaricate per caricamento istantaneo
 * 2. Carica tutti i dati delle statistiche una volta sola
 * 3. Filtra localmente i dati per i filtri predefiniti (istantaneo)
 * 4. Richiede dati aggiuntivi solo per date personalizzate
 * 
 * @example
 * ```tsx
 * function StatsPage() {
 *   const shortCode = 'abc123';
 *   const {
 *     isLoading,
 *     error,
 *     getImmediateStats,
 *     getStatsForFilter,
 *     invalidateCache
 *   } = useStatsCache(shortCode);
 * 
 *   // Per filtri predefiniti (istantaneo)
 *   const stats7d = getImmediateStats('7d');
 * 
 *   // Per date personalizzate (async)
 *   const customStats = await getStatsForFilter('custom', '2024-01-01', '2024-01-31');
 * 
 *   // Per invalidare cache dopo aggiornamenti
 *   invalidateCache();
 * }
 * ```
 */

export type FilterType = 'sempre' | '24h' | '7d' | '30d' | '90d' | '365d' | 'custom';

export type AllStatsData = {
  link: {
    id: string;
    shortCode: string;
    originalUrl: string;
    title: string | null;
    description: string | null;
    createdAt: string;
  };
  allStats: {
    click_totali_sempre: number;
    click_totali_24h: number;
    click_totali_7d: number;
    click_totali_30d: number;
    click_totali_90d: number;
    click_totali_365d: number;
    click_unici_sempre: number;
    click_unici_24h: number;
    click_unici_7d: number;
    click_unici_30d: number;
    click_unici_90d: number;
    click_unici_365d: number;
    referrer_sempre: number;
    referrer_24h: number;
    referrer_7d: number;
    referrer_30d: number;
    referrer_90d: number;
    referrer_365d: number;
    country_sempre: number;
    country_24h: number;
    country_7d: number;
    country_30d: number;
    country_90d: number;
    country_365d: number;
    city_sempre: number;
    city_24h: number;
    city_7d: number;
    city_30d: number;
    city_90d: number;
    city_365d: number;
    browser_sempre: number;
    browser_24h: number;
    browser_7d: number;
    browser_30d: number;
    browser_90d: number;
    browser_365d: number;
    lingua_sempre: number;
    lingua_24h: number;
    lingua_7d: number;
    lingua_30d: number;
    lingua_90d: number;
    lingua_365d: number;
    dispositivo_sempre: number;
    dispositivo_24h: number;
    dispositivo_7d: number;
    dispositivo_30d: number;
    dispositivo_90d: number;
    dispositivo_365d: number;
    sistema_operativo_sempre: number;
    sistema_operativo_24h: number;
    sistema_operativo_7d: number;
    sistema_operativo_30d: number;
    sistema_operativo_90d: number;
    sistema_operativo_365d: number;
  };
};

export type FilteredStats = {
  clickTotali: number;
  clickUnici: number;
  referrerCount: number;
  countryCount: number;
  cityCount: number;
  browserCount: number;
  linguaCount: number;
  dispositivoCount: number;
  sistemaOperativoCount: number;
};

export type LinkStats = {
  link: AllStatsData['link'];
  stats: FilteredStats;
};

// Cache locale per date personalizzate
const customDateCache = new Map<string, FilteredStats>();

/**
 * Hook per gestire la cache delle statistiche
 * Carica tutti i dati una volta sola e filtra localmente
 */
export function useStatsCache(shortCode: string, workspaceId?: string, userId?: string) {
  const [customDateStats, setCustomDateStats] = useState<Map<string, FilteredStats>>(new Map());
  const [loadingCustomDate, setLoadingCustomDate] = useState(false);
  const [customDateError, setCustomDateError] = useState<string | null>(null);
  const [preloadedData, setPreloadedData] = useState<AllStatsData | null>(null);
  const [isUsingPreloaded, setIsUsingPreloaded] = useState(false);

  // Controlla se abbiamo statistiche precaricate
  useEffect(() => {
    if (workspaceId && userId && shortCode && !preloadedData) {
      const cached = getCachedLinkStats(workspaceId, userId, shortCode);
      if (cached) {
        console.log('⚡ Statistiche caricate dalla cache precaricata per', shortCode);
        setPreloadedData(cached);
        setIsUsingPreloaded(true);
      }
    }
  }, [shortCode, workspaceId, userId, preloadedData]);

  // Fetch dei dati completi usando il sistema di cache esistente
  const {
    data: allStatsData,
    error: statsError,
    isLoading: statsLoading,
    mutate: revalidateStats
  } = useCachedData<AllStatsData>(
    shortCode ? `stats-all-${shortCode}` : null,
    async () => {
      const response = await fetch(`/api/stats/${shortCode}?mode=all`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Errore HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Salva nella cache precaricata per future visite
      if (workspaceId && userId) {
        setCachedLinkStats(workspaceId, userId, shortCode, data);
      }
      
      return data;
    },
    {
      cacheType: 'analytics',
      ttl: 5 * 60 * 1000, // 5 minuti di cache
      revalidateOnFocus: false,
      dedupingInterval: 60 * 1000, // 1 minuto per dedupe
      suspense: false // Disabilitiamo suspense per evitare problemi di hydration
    }
  );

  // Usa i dati precaricati se disponibili, altrimenti quelli dalla cache normale
  const effectiveStatsData = preloadedData || allStatsData;
  const effectiveLoading = isUsingPreloaded ? false : statsLoading;

  // Funzione per estrarre le statistiche filtrate dai dati completi
  const getFilteredStats = useCallback((filter: FilterType): FilteredStats | null => {
    if (!effectiveStatsData) return null;

    const suffixMap: { [key: string]: string } = {
      'sempre': '_sempre',
      '24h': '_24h',
      '7d': '_7d',
      '30d': '_30d',
      '90d': '_90d',
      '365d': '_365d'
    };

    const suffix = suffixMap[filter];
    if (!suffix) return null;

    const stats = effectiveStatsData.allStats;

    return {
      clickTotali: stats[`click_totali${suffix}` as keyof typeof stats] as number,
      clickUnici: stats[`click_unici${suffix}` as keyof typeof stats] as number,
      referrerCount: stats[`referrer${suffix}` as keyof typeof stats] as number,
      countryCount: stats[`country${suffix}` as keyof typeof stats] as number,
      cityCount: stats[`city${suffix}` as keyof typeof stats] as number,
      browserCount: stats[`browser${suffix}` as keyof typeof stats] as number,
      linguaCount: stats[`lingua${suffix}` as keyof typeof stats] as number,
      dispositivoCount: stats[`dispositivo${suffix}` as keyof typeof stats] as number,
      sistemaOperativoCount: stats[`sistema_operativo${suffix}` as keyof typeof stats] as number,
    };
  }, [effectiveStatsData]);

  // Funzione per ottenere statistiche per date personalizzate
  const getCustomDateStats = useCallback(async (startDate: string, endDate: string): Promise<FilteredStats> => {
    const cacheKey = `${shortCode}-${startDate}-${endDate}`;
    
    // Controlla cache locale prima
    if (customDateStats.has(cacheKey)) {
      return customDateStats.get(cacheKey)!;
    }

    // Controlla cache globale
    if (customDateCache.has(cacheKey)) {
      const cached = customDateCache.get(cacheKey)!;
      setCustomDateStats(prev => new Map(prev).set(cacheKey, cached));
      return cached;
    }

    setLoadingCustomDate(true);
    setCustomDateError(null);

    try {
      const response = await fetch(`/api/stats/${shortCode}?filter=custom&startDate=${startDate}&endDate=${endDate}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Errore HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const stats = data.stats as FilteredStats;

      // Salva in entrambe le cache
      customDateCache.set(cacheKey, stats);
      setCustomDateStats(prev => new Map(prev).set(cacheKey, stats));

      return stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore durante il caricamento delle statistiche personalizzate';
      setCustomDateError(errorMessage);
      throw error;
    } finally {
      setLoadingCustomDate(false);
    }
  }, [shortCode, customDateStats]);

  // Funzione principale per ottenere statistiche per un filtro
  const getStatsForFilter = useCallback(async (
    filter: FilterType, 
    startDate?: string, 
    endDate?: string
  ): Promise<LinkStats | null> => {
    if (!effectiveStatsData) return null;

    let stats: FilteredStats | null = null;

    if (filter === 'custom' && startDate && endDate) {
      stats = await getCustomDateStats(startDate, endDate);
    } else {
      stats = getFilteredStats(filter);
    }

    if (!stats) return null;

    return {
      link: effectiveStatsData.link,
      stats
    };
  }, [effectiveStatsData, getFilteredStats, getCustomDateStats]);

  // Funzione per invalidare la cache
  const invalidateCache = useCallback(() => {
    revalidateStats();
    setCustomDateStats(new Map());
    customDateCache.clear();
    // Resetta anche i dati precaricati
    setPreloadedData(null);
    setIsUsingPreloaded(false);
  }, [revalidateStats]);

  // Funzione per ottenere statistiche immediate per filtri predefiniti (senza async)
  const getImmediateStats = useCallback((filter: FilterType): LinkStats | null => {
    if (!effectiveStatsData || filter === 'custom') return null;
    
    const stats = getFilteredStats(filter);
    if (!stats) return null;

    return {
      link: effectiveStatsData.link,
      stats
    };
  }, [effectiveStatsData, getFilteredStats]);

  // Funzione di debug per visualizzare lo stato della cache
  const debugCache = useCallback(() => {
    if (typeof window !== 'undefined') {
      console.group('🔍 Stats Cache Debug');
      console.log('📊 Effective Stats Data:', effectiveStatsData);
      console.log('🚀 Using Preloaded:', isUsingPreloaded);
      console.log('📊 All Stats Data:', allStatsData);
      console.log('🎯 Preloaded Data:', preloadedData);
      console.log('📅 Custom Date Cache:', Object.fromEntries(customDateCache));
      console.log('🔄 Local Custom Stats:', Object.fromEntries(customDateStats));
      console.log('⏳ Loading State:', { 
        isStatsLoading: effectiveLoading, 
        isCustomDateLoading: loadingCustomDate 
      });
      console.log('❌ Error State:', { statsError, customDateError });
      console.groupEnd();
    }
  }, [effectiveStatsData, isUsingPreloaded, allStatsData, preloadedData, customDateStats, effectiveLoading, loadingCustomDate, statsError, customDateError]);

  return {
    // Dati e stato
    isLoading: effectiveLoading,
    error: statsError || customDateError,
    isCustomDateLoading: loadingCustomDate,
    
    // Funzioni principali
    getStatsForFilter,
    getImmediateStats,
    invalidateCache,
    
    // Debug (solo in development)
    debugCache: process.env.NODE_ENV === 'development' ? debugCache : () => {},
    
    // Dati grezzi (per debug o usi avanzati)
    allStatsData: effectiveStatsData
  };
}
