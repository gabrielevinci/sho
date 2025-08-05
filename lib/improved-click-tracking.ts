/**
 * Sistema migliorato per la raccolta affidabile dei dati al momento del click
 * NON modifica il database - migliora solo la qualità dei dati raccolti
 */

import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

export interface ImprovedClickData {
  ip: string;
  country: string;
  region: string;
  city: string;
  confidence: number;
  sources: string[];
  warnings: string[];
}

/**
 * Raccoglie IP in modo più affidabile provando multiple fonti
 */
export function getReliableIP(request: NextRequest): { ip: string; confidence: number; source: string } {
  const ipSources = [
    { 
      header: 'x-vercel-forwarded-for',
      confidence: 95,
      processor: (value: string | null) => value?.split(',')[0]?.trim()
    },
    { 
      header: 'x-forwarded-for',
      confidence: 90,
      processor: (value: string | null) => value?.split(',')[0]?.trim()
    },
    { 
      header: 'x-real-ip',
      confidence: 85,
      processor: (value: string | null) => value?.trim()
    },
    { 
      header: 'cf-connecting-ip',
      confidence: 88,
      processor: (value: string | null) => value?.trim()
    },
    { 
      header: 'x-client-ip',
      confidence: 80,
      processor: (value: string | null) => value?.trim()
    }
  ];

  for (const source of ipSources) {
    const rawValue = request.headers.get(source.header);
    const processedIP = source.processor(rawValue);
    
    if (processedIP && isValidIP(processedIP)) {
      const normalizedIP = normalizeIP(processedIP);
      
      console.log(`🌐 IP rilevato da ${source.header}: ${normalizedIP} (confidence: ${source.confidence}%)`);
      
      return {
        ip: normalizedIP,
        confidence: source.confidence,
        source: source.header
      };
    }
  }

  // Fallback per sviluppo locale - restituisce IP valido per PostgreSQL
  console.log('🏠 Fallback a localhost per sviluppo locale');
  return {
    ip: '127.0.0.1', // IP valido invece di stringa 'localhost'
    confidence: 50,
    source: 'localhost-fallback'
  };
}

/**
 * Verifica se un IP è valido
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
 * Normalizza l'IP per consistenza e compatibilità PostgreSQL
 */
function normalizeIP(ip: string): string {
  if (!ip) return '127.0.0.1'; // Default valido per PostgreSQL
  
  // Gestisci localhost variants - mantieni il formato IP per PostgreSQL
  if (['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'].includes(ip)) {
    return '127.0.0.1';
  }
  
  // Gestisci IPv6 mapped IPv4
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  
  // Rimuovi porte e restituisci IP valido
  const cleanIP = ip.split(':')[0];
  return cleanIP || '127.0.0.1';
}

/**
 * Raccoglie informazioni geografiche con validazione e fallback
 */
export async function getReliableGeoInfo(request: NextRequest): Promise<ImprovedClickData> {
  const ipInfo = getReliableIP(request);
  
  // Usa la cache per evitare chiamate API ripetute
  const { getCachedGeoInfo } = await import('./geo-cache');
  
  return await getCachedGeoInfo(ipInfo.ip, async () => {
    const warnings: string[] = [];
    const sources: string[] = [];
    let confidence = 30; // Base confidence
    
    sources.push(`ip-${ipInfo.source}`);
    confidence += Math.min(ipInfo.confidence * 0.3, 30);

    // METODO 1: Header Vercel (priorità massima in produzione)
    const vercelCountry = request.headers.get('x-vercel-ip-country');
    const vercelRegion = request.headers.get('x-vercel-ip-country-region');
    const vercelCity = request.headers.get('x-vercel-ip-city');
    
    if (vercelCountry && vercelCountry !== 'Unknown' && vercelCity && vercelCity !== 'Unknown') {
      console.log(`🌍 Dati Vercel completi: ${vercelCity}, ${vercelRegion}, ${vercelCountry}`);
      sources.push('vercel-headers');
      confidence += 40;
      
      return {
        ip: ipInfo.ip,
        country: vercelCountry,
        region: vercelRegion || 'Unknown',
        city: vercelCity,
        confidence: Math.min(confidence, 95),
        sources,
        warnings
      };
    } else if (vercelCountry && vercelCountry !== 'Unknown') {
      console.log(`🌍 Dati Vercel parziali: ${vercelCountry} (mancano regione/città)`);
      sources.push('vercel-headers-partial');
      confidence += 25;
      warnings.push('geo_incomplete_vercel');
      
      // Prova a completare con API esterna
      const externalGeo = await tryExternalGeoAPI(ipInfo.ip);
      if (externalGeo) {
        sources.push(externalGeo.source);
        confidence += 15;
        
        return {
          ip: ipInfo.ip,
          country: vercelCountry, // Usa sempre Vercel per paese se disponibile
          region: externalGeo.region || 'Unknown',
          city: externalGeo.city || 'Unknown',
          confidence: Math.min(confidence, 90),
          sources,
          warnings
        };
      }
      
      return {
        ip: ipInfo.ip,
        country: vercelCountry,
        region: 'Unknown',
        city: 'Unknown',
        confidence: Math.min(confidence, 75),
        sources,
        warnings
      };
    }

    // METODO 2: API esterna se Vercel non disponibile
    warnings.push('vercel_geo_missing');
    
    if (ipInfo.ip !== 'localhost' && !isPrivateIP(ipInfo.ip)) {
      const externalGeo = await tryExternalGeoAPI(ipInfo.ip);
      if (externalGeo) {
        sources.push(externalGeo.source);
        confidence += 35;
        
        console.log(`🌍 Dati API esterni: ${externalGeo.city}, ${externalGeo.region}, ${externalGeo.country}`);
        
        return {
          ip: ipInfo.ip,
          country: externalGeo.country,
          region: externalGeo.region,
          city: externalGeo.city,
          confidence: Math.min(confidence, 85),
          sources,
          warnings
        };
      }
    }

    // METODO 3: Fallback intelligente basato su header del browser
    warnings.push('external_geo_failed');
    const intelligentFallback = getIntelligentGeoFallback(request);
    sources.push('intelligent-fallback');
    confidence += 20;
    
    console.log(`🌍 Fallback intelligente: ${intelligentFallback.city}, ${intelligentFallback.region}, ${intelligentFallback.country}`);
    
    return {
      ip: ipInfo.ip,
      country: intelligentFallback.country,
      region: intelligentFallback.region,
      city: intelligentFallback.city,
      confidence: Math.min(confidence, 70),
      sources,
      warnings
    };
  });
}

/**
 * Verifica se l'IP è privato/locale
 */
function isPrivateIP(ip: string): boolean {
  if (ip === 'localhost') return true;
  
  return ip.startsWith('192.168.') || 
         ip.startsWith('10.') || 
         ip.startsWith('172.16.') ||
         ip.startsWith('172.17.') ||
         ip.startsWith('172.18.') ||
         ip.startsWith('172.19.') ||
         ip.startsWith('172.2') ||
         ip.startsWith('172.30.') ||
         ip.startsWith('172.31.') ||
         ip === '127.0.0.1';
}

/**
 * Prova API esterne per geolocalizzazione con timeout e fallback
 */
async function tryExternalGeoAPI(ip: string): Promise<{ country: string; region: string; city: string; source: string } | null> {
  const apis = [
    {
      name: 'ipapi',
      url: `http://ipapi.co/${ip}/json/`,
      timeout: 2500,
      parser: (data: any) => ({
        country: data.country_name || data.country,
        region: data.region || data.region_code,
        city: data.city
      })
    },
    {
      name: 'ip-api',
      url: `http://ip-api.com/json/${ip}?fields=country,regionName,city`,
      timeout: 2500,
      parser: (data: any) => ({
        country: data.country,
        region: data.regionName,
        city: data.city
      })
    }
  ];

  for (const api of apis) {
    try {
      console.log(`🔍 Tentativo API ${api.name} per IP ${ip.substring(0, 8)}...`);
      
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
            console.log(`✅ ${api.name} API success: ${parsed.city}, ${parsed.region}, ${parsed.country}`);
            
            return {
              country: parsed.country,
              region: parsed.region || 'Unknown',
              city: parsed.city || 'Unknown',
              source: `api-${api.name}`
            };
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ ${api.name} API failed:`, error instanceof Error ? error.message : 'Unknown error');
      continue;
    }
  }

  return null;
}

/**
 * Fallback intelligente basato su header del browser e timezone
 */
function getIntelligentGeoFallback(request: NextRequest): { country: string; region: string; city: string } {
  const acceptLanguage = request.headers.get('accept-language') || '';
  const userAgent = request.headers.get('user-agent') || '';

  console.log(`🧠 Fallback intelligente - Language: ${acceptLanguage.substring(0, 20)}, UA: ${userAgent.substring(0, 50)}...`);

  // Inferisci dalla lingua preferita
  if (acceptLanguage.toLowerCase().includes('it')) {
    return { country: 'Italy', region: 'Lazio', city: 'Rome' };
  } else if (acceptLanguage.toLowerCase().includes('en-us')) {
    return { country: 'United States', region: 'Unknown', city: 'Unknown' };
  } else if (acceptLanguage.toLowerCase().includes('en-gb')) {
    return { country: 'United Kingdom', region: 'Unknown', city: 'Unknown' };
  } else if (acceptLanguage.toLowerCase().includes('de')) {
    return { country: 'Germany', region: 'Unknown', city: 'Unknown' };
  } else if (acceptLanguage.toLowerCase().includes('fr')) {
    return { country: 'France', region: 'Unknown', city: 'Unknown' };
  } else if (acceptLanguage.toLowerCase().includes('es')) {
    return { country: 'Spain', region: 'Unknown', city: 'Unknown' };
  }

  // Default per sviluppo locale o casi non gestiti
  return { country: 'Italy', region: 'Lazio', city: 'Rome' };
}

/**
 * Validazione finale dei dati raccolti
 */
export function validateAndCleanGeoData(data: ImprovedClickData): ImprovedClickData {
  const cleaned = { ...data };
  
  // Validazione paese
  if (!cleaned.country || cleaned.country === 'Unknown' || cleaned.country.length < 2) {
    cleaned.country = 'Unknown';
    cleaned.warnings.push('invalid_country');
  }
  
  // Validazione regione
  if (!cleaned.region || cleaned.region.length < 1) {
    cleaned.region = 'Unknown';
    cleaned.warnings.push('invalid_region');
  }
  
  // Validazione città
  if (!cleaned.city || cleaned.city.length < 1) {
    cleaned.city = 'Unknown';
    cleaned.warnings.push('invalid_city');
  }
  
  // Validazione IP
  if (!cleaned.ip || cleaned.ip === 'unknown') {
    cleaned.ip = 'localhost';
    cleaned.warnings.push('invalid_ip');
    cleaned.confidence = Math.max(cleaned.confidence - 20, 10);
  }
  
  // Log finale per debug
  console.log(`📊 Dati geo validati - ${cleaned.city}, ${cleaned.region}, ${cleaned.country} | IP: ${cleaned.ip.substring(0, 8)}... | Confidence: ${cleaned.confidence}% | Warnings: ${cleaned.warnings.join(', ') || 'none'}`);
  
  return cleaned;
}
