/**
 * Sistema robusto per la raccolta di informazioni geografiche e IP
 * Gestisce fallback multipli e caching per garantire consistenza
 */

import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

export interface RobustGeoInfo {
  country: string;
  region: string;
  city: string;
  ip: string;
  ipHash: string;
  confidence: number;
  source: string;
  timestamp: number;
}

export interface IPCacheEntry {
  geoInfo: RobustGeoInfo;
  timestamp: number;
  expiresAt: number;
}

// Cache in memoria per le informazioni IP (per evitare chiamate ripetute)
const ipGeoCache = new Map<string, IPCacheEntry>();
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 ore

/**
 * Estrae l'IP più affidabile dalla richiesta
 */
export function extractBestIP(request: NextRequest): { ip: string; confidence: number; source: string } {
  const ipSources = [
    { 
      value: request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim(), 
      confidence: 95, 
      source: 'vercel-forwarded' 
    },
    { 
      value: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(), 
      confidence: 90, 
      source: 'x-forwarded-for' 
    },
    { 
      value: request.headers.get('x-real-ip'), 
      confidence: 85, 
      source: 'x-real-ip' 
    },
    { 
      value: request.headers.get('cf-connecting-ip'), 
      confidence: 88, 
      source: 'cloudflare' 
    },
    { 
      value: request.headers.get('x-client-ip'), 
      confidence: 80, 
      source: 'x-client-ip' 
    },
    { 
      value: request.headers.get('x-forwarded'), 
      confidence: 70, 
      source: 'x-forwarded' 
    },
    { 
      value: request.headers.get('forwarded')?.match(/for=([^;,]+)/)?.[1], 
      confidence: 75, 
      source: 'forwarded-header' 
    }
  ];

  // Trova il primo IP valido con la confidence più alta
  for (const ipSource of ipSources) {
    if (ipSource.value && isValidIP(ipSource.value)) {
      const normalizedIP = normalizeIP(ipSource.value);
      return {
        ip: normalizedIP,
        confidence: ipSource.confidence,
        source: ipSource.source
      };
    }
  }

  // Fallback per sviluppo locale
  return {
    ip: 'localhost',
    confidence: 50,
    source: 'localhost-fallback'
  };
}

/**
 * Verifica se l'IP è valido
 */
function isValidIP(ip: string): boolean {
  if (!ip) return false;
  
  // IPv4 pattern
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 pattern (semplificato)
  const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  // Rimuovi porte se presenti
  const cleanIP = ip.split(':')[0];
  
  return ipv4Pattern.test(cleanIP) || ipv6Pattern.test(ip) || ip === 'localhost';
}

/**
 * Normalizza l'IP per consistenza
 */
function normalizeIP(ip: string): string {
  if (!ip) return 'unknown';
  
  // Gestisci localhost variants
  if (['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) {
    return 'localhost';
  }
  
  // Gestisci IPv6 mapped IPv4
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  
  // Rimuovi porte
  return ip.split(':')[0];
}

/**
 * Estrae informazioni geografiche con sistema di fallback robusto
 */
export async function getRobustGeoLocation(request: NextRequest): Promise<RobustGeoInfo> {
  const timestamp = Date.now();
  const ipInfo = extractBestIP(request);
  const ipHash = createHash('sha256').update(ipInfo.ip).digest('hex').substring(0, 16);
  
  // Controlla cache prima
  const cached = ipGeoCache.get(ipInfo.ip);
  if (cached && cached.expiresAt > timestamp) {
    console.log(`🎯 Using cached geo info for IP: ${ipInfo.ip.substring(0, 8)}...`);
    return {
      ...cached.geoInfo,
      timestamp
    };
  }

  let geoInfo: RobustGeoInfo;

  // LIVELLO 1: Header Vercel (massima priorità in produzione)
  const vercelGeo = extractVercelGeoInfo(request, ipInfo, timestamp);
  if (vercelGeo.confidence >= 90) {
    geoInfo = vercelGeo;
  } else {
    // LIVELLO 2: API esterna per geolocalizzazione IP
    const apiGeo = await fetchExternalGeoInfo(ipInfo.ip, timestamp);
    if (apiGeo.confidence >= 70) {
      geoInfo = apiGeo;
    } else {
      // LIVELLO 3: Fallback intelligente
      geoInfo = getIntelligentFallback(request, ipInfo, timestamp);
    }
  }

  // Cache il risultato se ha confidence sufficiente
  if (geoInfo.confidence >= 60) {
    ipGeoCache.set(ipInfo.ip, {
      geoInfo,
      timestamp,
      expiresAt: timestamp + CACHE_DURATION
    });
  }

  // Log per debugging
  console.log(`🌍 Geo info collected:`, {
    ip: ipInfo.ip.substring(0, 8) + '...',
    country: geoInfo.country,
    region: geoInfo.region,
    city: geoInfo.city,
    confidence: geoInfo.confidence,
    source: geoInfo.source
  });

  return geoInfo;
}

/**
 * Estrae informazioni geo dai header Vercel
 */
function extractVercelGeoInfo(request: NextRequest, ipInfo: { ip: string; confidence: number; source: string }, timestamp: number): RobustGeoInfo {
  const country = request.headers.get('x-vercel-ip-country');
  const region = request.headers.get('x-vercel-ip-country-region');
  const city = request.headers.get('x-vercel-ip-city');
  
  // Se abbiamo tutti i dati Vercel
  if (country && region && city && country !== 'Unknown') {
    return {
      country,
      region,
      city,
      ip: ipInfo.ip,
      ipHash: createHash('sha256').update(ipInfo.ip).digest('hex').substring(0, 16),
      confidence: 95,
      source: 'vercel-headers',
      timestamp
    };
  }

  // Se abbiamo solo alcuni dati Vercel
  if (country && country !== 'Unknown') {
    return {
      country,
      region: region || 'Unknown',
      city: city || 'Unknown',
      ip: ipInfo.ip,
      ipHash: createHash('sha256').update(ipInfo.ip).digest('hex').substring(0, 16),
      confidence: 80,
      source: 'vercel-headers-partial',
      timestamp
    };
  }

  // Nessun dato Vercel valido
  return {
    country: 'Unknown',
    region: 'Unknown',
    city: 'Unknown',
    ip: ipInfo.ip,
    ipHash: createHash('sha256').update(ipInfo.ip).digest('hex').substring(0, 16),
    confidence: 30,
    source: 'vercel-headers-missing',
    timestamp
  };
}

/**
 * Usa API esterna per geolocalizzazione IP
 */
async function fetchExternalGeoInfo(ip: string, timestamp: number): Promise<RobustGeoInfo> {
  if (ip === 'localhost' || ip.startsWith('192.168') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return getLocalDevelopmentGeo(ip, timestamp);
  }

  const ipHash = createHash('sha256').update(ip).digest('hex').substring(0, 16);

  // Lista di API di geolocalizzazione con fallback
  const geoApis = [
    {
      url: `http://ipapi.co/${ip}/json/`,
      parser: (data: any) => ({
        country: data.country_name || data.country,
        region: data.region || data.region_code,
        city: data.city
      }),
      timeout: 3000
    },
    {
      url: `http://ip-api.com/json/${ip}`,
      parser: (data: any) => ({
        country: data.country,
        region: data.regionName || data.region,
        city: data.city
      }),
      timeout: 3000
    },
    {
      url: `https://ipinfo.io/${ip}/json`,
      parser: (data: any) => ({
        country: data.country,
        region: data.region,
        city: data.city
      }),
      timeout: 3000
    }
  ];

  for (const api of geoApis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), api.timeout);

      const response = await fetch(api.url, {
        headers: { 'User-Agent': 'ShorterLink/2.0' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        
        if (data && !data.error && !data.message) {
          const parsed = api.parser(data);
          
          if (parsed.country && parsed.country !== 'Unknown') {
            return {
              country: parsed.country,
              region: parsed.region || 'Unknown',
              city: parsed.city || 'Unknown',
              ip,
              ipHash,
              confidence: 85,
              source: `api-${new URL(api.url).hostname}`,
              timestamp
            };
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Geo API failed for ${new URL(api.url).hostname}:`, error);
      continue;
    }
  }

  // Se tutte le API falliscono
  return {
    country: 'Unknown',
    region: 'Unknown',
    city: 'Unknown',
    ip,
    ipHash,
    confidence: 20,
    source: 'api-all-failed',
    timestamp
  };
}

/**
 * Fallback intelligente basato su informazioni disponibili
 */
function getIntelligentFallback(request: NextRequest, ipInfo: { ip: string; confidence: number; source: string }, timestamp: number): RobustGeoInfo {
  const ipHash = createHash('sha256').update(ipInfo.ip).digest('hex').substring(0, 16);
  
  // Controlla Accept-Language per suggerimenti geografici
  const acceptLanguage = request.headers.get('accept-language') || '';
  const userAgent = request.headers.get('user-agent') || '';

  let country = 'Unknown';
  let region = 'Unknown';
  let city = 'Unknown';
  let confidence = 40;

  // Inferisci dalla lingua preferita
  if (acceptLanguage.toLowerCase().includes('it')) {
    country = 'Italy';
    region = 'Lazio';
    city = 'Rome';
    confidence = 60;
  } else if (acceptLanguage.toLowerCase().includes('en-us')) {
    country = 'United States';
    region = 'Unknown';
    city = 'Unknown';
    confidence = 55;
  } else if (acceptLanguage.toLowerCase().includes('en-gb')) {
    country = 'United Kingdom';
    region = 'Unknown'; 
    city = 'Unknown';
    confidence = 55;
  } else if (acceptLanguage.toLowerCase().includes('de')) {
    country = 'Germany';
    region = 'Unknown';
    city = 'Unknown';
    confidence = 55;
  } else if (acceptLanguage.toLowerCase().includes('fr')) {
    country = 'France';
    region = 'Unknown';
    city = 'Unknown';
    confidence = 55;
  } else if (acceptLanguage.toLowerCase().includes('es')) {
    country = 'Spain';
    region = 'Unknown';
    city = 'Unknown';
    confidence = 55;
  }

  return {
    country,
    region,
    city,
    ip: ipInfo.ip,
    ipHash,
    confidence,
    source: 'intelligent-fallback',
    timestamp
  };
}

/**
 * Fallback per sviluppo locale
 */
function getLocalDevelopmentGeo(ip: string, timestamp: number): RobustGeoInfo {
  return {
    country: 'Italy',
    region: 'Lazio',
    city: 'Rome',
    ip,
    ipHash: createHash('sha256').update(ip).digest('hex').substring(0, 16),
    confidence: 70,
    source: 'local-development',
    timestamp
  };
}

/**
 * Pulisce la cache dalle entry scadute
 */
export function cleanupGeoCache(): void {
  const now = Date.now();
  for (const [ip, entry] of ipGeoCache.entries()) {
    if (entry.expiresAt <= now) {
      ipGeoCache.delete(ip);
    }
  }
}

// Pulizia automatica della cache ogni ora
if (typeof globalThis !== 'undefined') {
  setInterval(cleanupGeoCache, 1000 * 60 * 60);
}
