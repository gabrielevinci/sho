/**
 * Preloader per i dati critici della dashboard
 * Questo modulo gestisce il precaricamento dei dati essenziali per migliorare le performance
 */

interface PreloadedData {
  folders?: any[];
  links?: any[];
  workspace?: any;
  timestamp: number;
}

// Cache in-memory per i dati precaricati
const preloadCache = new Map<string, PreloadedData>();

// Durata cache: 30 secondi
const CACHE_DURATION = 30000;

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
      timestamp: Date.now()
    };
    
    // Salva in cache
    preloadCache.set(cacheKey, preloadedData);
    
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
  keysToDelete.forEach(key => preloadCache.delete(key));
  console.log(`🧹 Cache pulita per utente ${userId}`);
}

/**
 * Pulisce tutta la cache
 */
export function clearAllCache() {
  preloadCache.clear();
  console.log('🧹 Cache completamente pulita');
}

/**
 * Ottiene i dati dalla cache senza fare richieste di rete
 */
export function getCachedData(workspaceId: string, userId: string): PreloadedData | null {
  const cacheKey = `${userId}-${workspaceId}`;
  const cachedData = preloadCache.get(cacheKey);
  
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData;
  }
  
  return null;
}
