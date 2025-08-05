/**
 * Sistema di cache intelligente per le informazioni geografiche
 * Evita chiamate API ripetute e migliora la consistenza
 */

import { ImprovedClickData } from './improved-click-tracking';

interface CacheEntry {
  data: ImprovedClickData;
  timestamp: number;
  expiresAt: number;
  hitCount: number;
}

class GeoCache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 1000 * 60 * 60 * 24; // 24 ore
  private readonly maxEntries = 1000;
  private readonly cleanupInterval = 1000 * 60 * 60; // 1 ora

  constructor() {
    // Pulizia automatica ogni ora
    if (typeof globalThis !== 'undefined') {
      setInterval(() => this.cleanup(), this.cleanupInterval);
    }
  }

  /**
   * Genera chiave di cache per un IP
   */
  private generateKey(ip: string): string {
    // Per IP privati/localhost, usa una chiave generica
    if (this.isPrivateIP(ip)) {
      return 'private-ip';
    }
    
    // Per IP pubblici, usa hash per privacy ma mantieni univocità
    return `ip-${ip.substring(0, 8)}`;
  }

  /**
   * Verifica se un IP è privato
   */
  private isPrivateIP(ip: string): boolean {
    return ip === 'localhost' || 
           ip.startsWith('192.168.') || 
           ip.startsWith('10.') || 
           ip.startsWith('172.') ||
           ip === '127.0.0.1';
  }

  /**
   * Ottiene dati dalla cache se disponibili e validi
   */
  get(ip: string): ImprovedClickData | null {
    const key = this.generateKey(ip);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Verifica se scaduto
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    // Incrementa hit count
    entry.hitCount++;
    
    console.log(`💾 Cache HIT per IP ${ip.substring(0, 8)}... (${entry.hitCount} hits)`);
    
    // Restituisci una copia dei dati con timestamp aggiornato
    return {
      ...entry.data,
      sources: [...entry.data.sources, 'cache']
    };
  }

  /**
   * Salva dati nella cache
   */
  set(ip: string, data: ImprovedClickData, customTTL?: number): void {
    // Non cachare dati con confidence troppo bassa
    if (data.confidence < 50) {
      console.log(`🚫 Non caching dati con confidence bassa (${data.confidence}%) per IP ${ip.substring(0, 8)}...`);
      return;
    }

    const key = this.generateKey(ip);
    const ttl = customTTL || this.defaultTTL;
    const now = Date.now();
    
    // Se la cache è piena, rimuovi l'entry più vecchia
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }
    
    const entry: CacheEntry = {
      data: { ...data }, // Copia i dati
      timestamp: now,
      expiresAt: now + ttl,
      hitCount: 0
    };
    
    this.cache.set(key, entry);
    
    console.log(`💾 Cached geo data per IP ${ip.substring(0, 8)}... (confidence: ${data.confidence}%, TTL: ${Math.round(ttl / 1000 / 60)} min)`);
  }

  /**
   * Rimuove l'entry più vecchia dalla cache
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  /**
   * Pulisce entry scadute dalla cache
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: rimossi ${cleaned} entries scaduti`);
    }
  }

  /**
   * Statistiche della cache
   */
  getStats(): {
    size: number;
    hitRate: number;
    topEntries: Array<{ key: string; hits: number; age: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    const totalHits = entries.reduce((sum, [, entry]) => sum + entry.hitCount, 0);
    const totalRequests = entries.length + totalHits; // Approssimazione
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    
    const topEntries = entries
      .map(([key, entry]) => ({
        key: key.substring(0, 12) + '...',
        hits: entry.hitCount,
        age: Math.round((now - entry.timestamp) / 1000 / 60) // minuti
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 5);
    
    return {
      size: this.cache.size,
      hitRate: Math.round(hitRate),
      topEntries
    };
  }

  /**
   * Pulisce completamente la cache
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️ Cache completamente pulita');
  }
}

// Istanza singleton della cache
export const geoCache = new GeoCache();

/**
 * Wrapper per la raccolta geo con cache integrata
 */
export async function getCachedGeoInfo(
  ip: string, 
  geoCollector: () => Promise<ImprovedClickData>
): Promise<ImprovedClickData> {
  // Prova prima dalla cache
  const cached = geoCache.get(ip);
  if (cached) {
    return cached;
  }
  
  // Se non in cache, raccogli i dati
  const data = await geoCollector();
  
  // Salva in cache se i dati sono di qualità sufficiente
  if (data.confidence >= 50) {
    // TTL variabile basato sulla confidence
    const ttl = data.confidence >= 80 ? 
      1000 * 60 * 60 * 24 * 7 : // 7 giorni per alta confidence
      1000 * 60 * 60 * 24;       // 1 giorno per media confidence
    
    geoCache.set(ip, data, ttl);
  }
  
  return data;
}
