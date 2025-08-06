/**
 * Preloader per i dati critici della dashboard
 * Questo modulo gestisce il precaricamento dei dati essenziali per migliorare le performance
 */

interface PreloadedData {
  folders?: any[];
  links?: any[];
  workspace?: any;
  linkStats?: Map<string, any>; // Cache per le statistiche dei link
  timestamp: number;
}

// Cache in-memory per i dati precaricati
const preloadCache = new Map<string, PreloadedData>();

// Durata cache: 5 minuti (aumentata per le statistiche)
const CACHE_DURATION = 300000;

/**
 * Salva la cache anche nel sessionStorage per persistenza durante la sessione
 */
function saveToSessionStorage(key: string, data: PreloadedData) {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`preload_${key}`, JSON.stringify({
        ...data,
        linkStats: data.linkStats ? Object.fromEntries(data.linkStats) : undefined
      }));
    } catch (error) {
      console.warn('Errore nel salvare la cache in sessionStorage:', error);
    }
  }
}

/**
 * Carica la cache dal sessionStorage
 */
function loadFromSessionStorage(key: string): PreloadedData | null {
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(`preload_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          linkStats: parsed.linkStats ? new Map(Object.entries(parsed.linkStats)) : new Map()
        };
      }
    } catch (error) {
      console.warn('Errore nel caricare la cache da sessionStorage:', error);
    }
  }
  return null;
}

/**
 * Verifica se i dati in cache sono ancora validi
 */
function isCacheValid(data: PreloadedData): boolean {
  return Date.now() - data.timestamp < CACHE_DURATION;
}

/**
 * Precarica i dati della dashboard per un workspace specifico
 */
export async function preloadDashboardData(workspaceId: string, userId: string) {
  if (!workspaceId || !userId) return null;
  
  // IMPORTANTE: Il precaricamento funziona solo lato client
  if (typeof window === 'undefined') {
    console.log('⚠️ Precaricamento ignorato lato server');
    return null;
  }
  
  const cacheKey = `${userId}-${workspaceId}`;
  const cachedData = preloadCache.get(cacheKey);
  
  // Se abbiamo dati validi in cache, ritornali
  if (cachedData && isCacheValid(cachedData)) {
    console.log('📦 Dati dashboard caricati dalla cache');
    return cachedData;
  }
  
  try {
    console.log('🚀 Precaricamento dati dashboard...');
    
    // Carica folders e links in parallelo
    const [foldersResponse, linksResponse] = await Promise.all([
      fetch(`/api/folders?workspaceId=${workspaceId}`),
      fetch(`/api/links-with-folders?workspaceId=${workspaceId}`)
    ]);
    
    if (!foldersResponse.ok || !linksResponse.ok) {
      throw new Error('Errore nel caricamento dei dati');
    }
    
    const [foldersData, linksData] = await Promise.all([
      foldersResponse.json(),
      linksResponse.json()
    ]);
    
    const preloadedData: PreloadedData = {
      folders: foldersData.folders || [],
      links: linksData.links || [],
      linkStats: new Map(), // Inizializza cache statistiche vuota
      timestamp: Date.now()
    };
    
    // Precarica le statistiche per i primi 10 link più recenti
    // Questo renderà istantaneo l'accesso alle statistiche dei link più utilizzati
    const topLinks = (linksData.links || []).slice(0, 10);
    if (topLinks.length > 0) {
      console.log(`📊 Precaricamento statistiche per ${topLinks.length} link...`);
      
      const statsPromises = topLinks.map(async (link: any) => {
        try {
          const statsResponse = await fetch(`/api/stats/${link.short_code}?mode=all`);
          if (statsResponse.ok) {
            const stats = await statsResponse.json();
            preloadedData.linkStats!.set(link.short_code, stats);
            return link.short_code;
          }
        } catch (error) {
          console.warn(`⚠️ Errore precaricamento stats per ${link.short_code}:`, error);
        }
        return null;
      });
      
      const preloadedStats = await Promise.all(statsPromises);
      const successfulPreloads = preloadedStats.filter(Boolean).length;
      console.log(`✅ Precaricate statistiche per ${successfulPreloads}/${topLinks.length} link`);
    }
    
    // Salva in cache
    preloadCache.set(cacheKey, preloadedData);
    
    // Salva anche in sessionStorage per persistenza
    saveToSessionStorage(cacheKey, preloadedData);
    
    console.log(`✅ Precaricati ${preloadedData.folders?.length || 0} cartelle e ${preloadedData.links?.length || 0} link`);
    
    return preloadedData;
  } catch (error) {
    console.error('❌ Errore durante il precaricamento:', error);
    return null;
  }
}

/**
 * Pulisce la cache per un utente specifico
 */
export function clearUserCache(userId: string) {
  const keysToDelete = Array.from(preloadCache.keys()).filter(key => key.startsWith(userId));
  keysToDelete.forEach(key => {
    preloadCache.delete(key);
    
    // Pulisci anche sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(`preload_${key}`);
    }
  });
  console.log(`🧹 Cache pulita per utente ${userId}`);
}

/**
 * Pulisce tutta la cache
 */
export function clearAllCache() {
  preloadCache.clear();
  
  // Pulisci anche sessionStorage
  if (typeof window !== 'undefined') {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('preload_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  }
  
  console.log('🧹 Cache completamente pulita');
}

/**
 * Ottiene i dati dalla cache senza fare richieste di rete
 */
export function getCachedData(workspaceId: string, userId: string): PreloadedData | null {
  const cacheKey = `${userId}-${workspaceId}`;
  let cachedData = preloadCache.get(cacheKey);
  
  // Se non è in memoria, prova a caricare da sessionStorage
  if (!cachedData) {
    const sessionData = loadFromSessionStorage(cacheKey);
    if (sessionData && isCacheValid(sessionData)) {
      cachedData = sessionData;
      preloadCache.set(cacheKey, cachedData);
    }
  }
  
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData;
  }
  
  return null;
}

/**
 * Ottiene le statistiche precaricate per un link specifico
 */
export function getCachedLinkStats(workspaceId: string, userId: string, shortCode: string): any | null {
  const cachedData = getCachedData(workspaceId, userId);
  if (cachedData?.linkStats) {
    return cachedData.linkStats.get(shortCode) || null;
  }
  return null;
}

/**
 * Aggiunge o aggiorna le statistiche di un link nella cache
 */
export function setCachedLinkStats(workspaceId: string, userId: string, shortCode: string, stats: any) {
  const cacheKey = `${userId}-${workspaceId}`;
  let cachedData = preloadCache.get(cacheKey);
  
  if (!cachedData) {
    // Se non abbiamo ancora dati cached, crea una entry base
    cachedData = {
      linkStats: new Map(),
      timestamp: Date.now()
    };
  }
  
  if (!cachedData.linkStats) {
    cachedData.linkStats = new Map();
  }
  
  cachedData.linkStats.set(shortCode, stats);
  preloadCache.set(cacheKey, cachedData);
  
  // Salva anche in sessionStorage
  saveToSessionStorage(cacheKey, cachedData);
}
