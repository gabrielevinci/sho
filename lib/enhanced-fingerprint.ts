/**
 * Enhanced Fingerprinting System
 * Sistema migliorato che identifica lo stesso utente fisico 
 * anche quando usa browser diversi o modalità incognito
 */

import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { UAParser } from 'ua-parser-js';
import { QueryResult, QueryResultRow } from '@vercel/postgres';

export interface PhysicalDeviceFingerprint {
  // Identificatori del dispositivo fisico (stabili tra browser)
  deviceFingerprint: string;          // Hash che identifica il dispositivo
  ipHash: string;                     // Hash IP (stesso per tutti i browser)
  screenResolution: string;           // Risoluzione schermo fisica
  timezoneFingerprint: string;        // Timezone + offset (stabile)
  hardwareProfile: string;            // CPU + caratteristiche hardware
  
  // Identificatori del browser specifico (cambiano tra browser)
  browserFingerprint: string;         // Hash specifico del browser
  sessionFingerprint: string;         // Hash della sessione specifica
  
  // Metadati per correlazione
  browserType: string;                // chrome, firefox, safari, edge
  deviceCategory: string;             // mobile, tablet, desktop
  osFamily: string;                   // windows, macos, linux, android, ios
  
  // Informazioni geografiche
  country: string;                    // Paese dell'utente
  region: string;                     // Regione dell'utente  
  city: string;                       // Città dell'utente
  
  // Scoring per correlazione
  confidence: number;                 // 0-100: confidenza che sia stesso utente
  correlationFactors: string[];       // Fattori usati per correlazione
}

export interface EnhancedCorrelation {
  deviceCluster: string;              // ID cluster di dispositivi correlati
  relatedFingerprints: string[];      // Altri fingerprint dello stesso utente
  firstSeen: Date;
  lastSeen: Date;
  totalVisits: number;
  uniqueBrowsers: string[];
}

/**
 * Estrae informazioni geografiche dagli header Vercel con fallback per sviluppo locale
 */
export function extractGeoInfo(request: NextRequest): { country: string; region: string; city: string } {
  const country = request.headers.get('x-vercel-ip-country') || null;
  const region = request.headers.get('x-vercel-ip-country-region') || null;
  const city = request.headers.get('x-vercel-ip-city') || null;
  
  // Se siamo in sviluppo locale (headers Vercel nulli), usa valori di default
  if (!country || country === 'Unknown') {
    return {
      country: 'IT',      // Default per sviluppo locale
      region: 'LZ',       // Lazio
      city: 'Rome'        // Roma
    };
  }
  
  return {
    country: country || 'Unknown',
    region: region || 'Unknown', 
    city: city || 'Unknown'
  };
}

/**
 * Genera un fingerprint fisico del dispositivo che sia stabile tra browser
 */
export function generatePhysicalDeviceFingerprint(request: NextRequest): PhysicalDeviceFingerprint {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  
  // Parse informazioni del browser/OS
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  // Debug logging per Opera e altri browser
  console.log('🔍 Browser parsing details:', {
    userAgent: userAgent.substring(0, 100),
    browserName: browser.name,
    browserVersion: browser.version,
    osName: os.name,
    deviceType: device.type
  });

  // 1. ELEMENTI FISICI DEL DISPOSITIVO (stabili tra browser)
  // Estrazione IP più robusta che gestisce le differenze tra browser
  function extractStableIP(request: NextRequest): string {
    // Prova diverse fonti di IP in ordine di priorità
    const ipSources = [
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      request.headers.get('x-real-ip'),
      request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim(),
      request.headers.get('cf-connecting-ip'), // Cloudflare
      request.headers.get('x-client-ip'),
      request.headers.get('x-forwarded'),
      request.headers.get('forwarded')?.match(/for=([^;,]+)/)?.[1]
    ];
    
    // Trova il primo IP valido
    for (const ip of ipSources) {
      if (ip && ip !== 'unknown' && ip.length > 0) {
        // Normalizza tutti i localhost variants
        if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
          return 'localhost';
        }
        // Normalizza IPv6 mapped IPv4 (::ffff:192.168.1.1 -> 192.168.1.1)
        if (ip.startsWith('::ffff:')) {
          return ip.substring(7);
        }
        // Rimuovi porte se presenti (192.168.1.1:8080 -> 192.168.1.1)
        return ip.split(':')[0];
      }
    }
    return 'localhost'; // Default per sviluppo locale
  }
  
  const ip = extractStableIP(request);
  const ipHash = createHash('sha256').update(ip).digest('hex').substring(0, 16);
  
  // Timezone e offset (molto stabili) - con fallback più robusti
  function extractStableTimezone(request: NextRequest): string {
    // Prova diverse fonti per il timezone
    const timezone = request.headers.get('x-vercel-ip-timezone') || 
                    request.headers.get('x-timezone') ||
                    request.headers.get('timezone');
    
    // Se non abbiamo timezone da headers, usa fallback geografico o sviluppo locale
    if (!timezone || timezone === 'Unknown') {
      const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
      
      // Se siamo in sviluppo locale (headers Vercel nulli), usa timezone di default
      if (country === 'Unknown' || !country) {
        return 'Europe/Rome'; // Default per sviluppo locale
      }
      
      // Fallback basato su paese per timezone comuni
      const timezoneMap: Record<string, string> = {
        'IT': 'Europe/Rome',
        'US': 'America/New_York', 
        'GB': 'Europe/London',
        'DE': 'Europe/Berlin',
        'FR': 'Europe/Paris'
      };
      return timezoneMap[country] || 'UTC';
    }
    
    return timezone;
  }
  
  const timezoneFingerprint = extractStableTimezone(request);
  
  // Informazioni geografiche (stabili a breve termine) - con fallback per sviluppo locale
  const geoInfo = extractGeoInfo(request);
  const { country, region, city } = geoInfo;
  
  // Hardware info - più generico per stabilità cross-browser
  const osFamily = os.name ? os.name.toLowerCase().replace(/[^a-z]/g, '') : 'unknown';
  const deviceCategory = device.type || (userAgent.toLowerCase().includes('mobile') ? 'mobile' : 'desktop');
  
  // Lingua primaria (generalmente stabile)
  const primaryLanguage = acceptLanguage.split(',')[0]?.split('-')[0] || 'unknown';
  
  // 2. ELEMENTI DEL BROWSER SPECIFICO (cambiano tra browser)
  const browserName = browser.name || 'unknown';
  
  // Normalizza i nomi dei browser per una migliore correlazione
  let normalizedBrowserName = browserName.toLowerCase();
  if (normalizedBrowserName.includes('opera') || normalizedBrowserName.includes('opr')) {
    normalizedBrowserName = 'opera';
  } else if (normalizedBrowserName.includes('chrome')) {
    normalizedBrowserName = 'chrome';  
  } else if (normalizedBrowserName.includes('firefox')) {
    normalizedBrowserName = 'firefox';
  } else if (normalizedBrowserName.includes('safari')) {
    normalizedBrowserName = 'safari';
  } else if (normalizedBrowserName.includes('edge')) {
    normalizedBrowserName = 'edge';
  }
  
  const browserVersion = browser.version || 'unknown';
  const fullUserAgent = userAgent;
  
  // Accept headers specifici del browser
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  const accept = request.headers.get('accept') || '';
  
  // 3. GENERAZIONE FINGERPRINT FISICO
  // Combina solo elementi che sono stabili tra browser diversi
  // Usa strategia a livelli: se IP diverso, usa geo + timezone come fallback
  function generateDeviceElements(ip: string, timezone: string, country: string, region: string, osFamily: string, deviceCategory: string, primaryLanguage: string): string[] {
    // Livello 1: IP + geo completo (più preciso)
    const level1Elements = [
      ipHash,
      timezone,
      country,
      region,
      osFamily,
      deviceCategory,
      primaryLanguage
    ];
    
    // Livello 2: Solo geo + timezone (fallback se IP problematico)  
    const level2Elements = [
      timezone,
      country,
      region, 
      osFamily,
      deviceCategory,
      primaryLanguage,
      'fallback-geo' // marker per distinguere da level1
    ];
    
    // Se IP è "unknown" o sembrano essere diversi per motivi tecnici,
    // usa fallback geografico
    if (ip === 'unknown') {
      return level2Elements;
    }
    
    return level1Elements;
  }
  
  const physicalElements = generateDeviceElements(
    ip, 
    timezoneFingerprint, 
    country, 
    region, 
    osFamily, 
    deviceCategory, 
    primaryLanguage
  );
  
  const deviceFingerprint = createHash('sha256')
    .update(physicalElements.join('|'))
    .digest('hex')
    .substring(0, 20);
  
  // 4. GENERAZIONE FINGERPRINT BROWSER
  // Combina elementi specifici del browser
  const browserElements = [
    deviceFingerprint,         // Include base device
    normalizedBrowserName,     // Usa nome normalizzato
    browserVersion,
    acceptEncoding,
    accept,
    fullUserAgent
  ].join('|');
  
  const browserFingerprint = createHash('sha256')
    .update(browserElements)
    .digest('hex')
    .substring(0, 24);
  
  // 5. FINGERPRINT DI SESSIONE
  // Include timestamp dell'ora per sessioni multiple
  const sessionElements = [
    browserFingerprint,
    Math.floor(Date.now() / (1000 * 60 * 60 * 6)) // Cambia ogni 6 ore
  ].join('|');
  
  const sessionFingerprint = createHash('sha256')
    .update(sessionElements)
    .digest('hex')
    .substring(0, 24);
  
  // 6. CALCOLO CONFIDENCE E CORRELAZIONE
  const correlationFactors: string[] = [];
  let confidence = 50; // Base confidence
  
  // Fattori che aumentano la confidenza
  if (ipHash !== 'unknown') {
    correlationFactors.push('stable_ip');
    confidence += 20;
  }
  
  if (timezoneFingerprint !== 'Unknown' && timezoneFingerprint !== 'UTC') {
    correlationFactors.push('timezone');
    confidence += 15;
  }
  
  if (osFamily !== 'unknown') {
    correlationFactors.push('os_family');
    confidence += 10;
  }
  
  if (country !== 'Unknown' && city !== 'Unknown') {
    correlationFactors.push('geo_location');
    confidence += 10;
  }
  
  confidence = Math.min(confidence, 100);
  
  const result = {
    deviceFingerprint,
    ipHash,
    screenResolution: 'server-side', // Non disponibile lato server
    timezoneFingerprint,
    hardwareProfile: `${osFamily}-${deviceCategory}`,
    browserFingerprint,
    sessionFingerprint,
    browserType: normalizedBrowserName,
    deviceCategory: deviceCategory,
    osFamily: osFamily,
    country,
    region,
    city,
    confidence,
    correlationFactors
  };

  console.log('🔑 Generated fingerprint result:', {
    deviceFingerprint: result.deviceFingerprint,
    browserFingerprint: result.browserFingerprint,
    browserType: result.browserType,
    osFamily: result.osFamily,
    deviceCategory: result.deviceCategory,
    country: result.country,
    region: result.region,
    city: result.city,
    confidence: result.confidence,
    correlationFactors: result.correlationFactors,
    ipHash: result.ipHash.substring(0, 8) + '...',
    timezoneFingerprint: result.timezoneFingerprint
  });

  return result;
}

// Tipi per le query SQL - compatibile con Vercel Postgres
type Primitive = string | number | boolean | null | undefined;
type SqlFunction = <O extends QueryResultRow>(strings: TemplateStringsArray, ...values: Primitive[]) => Promise<QueryResult<O>>;
type FingerprintResult = { fingerprint_hash: string };

/**
 * Trova fingerprint correlati che potrebbero essere dello stesso utente
 */
export async function findCorrelatedFingerprints(
  currentFingerprint: PhysicalDeviceFingerprint,
  sql: SqlFunction
): Promise<string[]> {
  try {
    // Cerca fingerprint con stesso deviceFingerprint (match esatto)
    const exactMatches = await sql`
      SELECT DISTINCT fingerprint_hash 
      FROM enhanced_fingerprints 
      WHERE device_fingerprint = ${currentFingerprint.deviceFingerprint}
      AND fingerprint_hash != ${currentFingerprint.browserFingerprint}
    `;
    
    const correlatedIds = exactMatches.rows.map((row) => (row as FingerprintResult).fingerprint_hash);
    
    // Cerca match parziali basati su geo + timezone + OS (più permissivi per problemi IP)
    const partialMatches = await sql`
      SELECT DISTINCT fingerprint_hash, confidence
      FROM enhanced_fingerprints 
      WHERE (
        -- Match esatto IP (ideale)
        (ip_hash = ${currentFingerprint.ipHash}
         AND timezone_fingerprint = ${currentFingerprint.timezoneFingerprint}
         AND os_family = ${currentFingerprint.osFamily})
        OR
        -- Match geografico + timezone (fallback per IP diversi)
        (timezone_fingerprint = ${currentFingerprint.timezoneFingerprint}
         AND country = (SELECT country FROM enhanced_fingerprints WHERE browser_fingerprint = ${currentFingerprint.browserFingerprint} LIMIT 1)
         AND region = (SELECT region FROM enhanced_fingerprints WHERE browser_fingerprint = ${currentFingerprint.browserFingerprint} LIMIT 1)
         AND os_family = ${currentFingerprint.osFamily}
         AND device_category = ${currentFingerprint.deviceCategory})
      )
      AND fingerprint_hash != ${currentFingerprint.browserFingerprint}
      AND created_at >= NOW() - INTERVAL '24 hours'
    `;
    
    const additionalMatches = partialMatches.rows
      .map((row) => (row as FingerprintResult).fingerprint_hash)
      .filter((id: string) => !correlatedIds.includes(id));
    
    return [...correlatedIds, ...additionalMatches];
    
  } catch (error) {
    console.error('Error finding correlated fingerprints:', error);
    return [];
  }
}

/**
 * Aggiorna la tabella fingerprint_correlations per tracciare dispositivi correlati
 */
async function updateFingerprintCorrelations(
  currentFingerprint: PhysicalDeviceFingerprint,
  sql: SqlFunction
): Promise<void> {
  try {
    // 1. Cerca altri fingerprint con lo stesso device_fingerprint
    const relatedFingerprints = await sql`
      SELECT DISTINCT browser_fingerprint, confidence
      FROM enhanced_fingerprints 
      WHERE device_fingerprint = ${currentFingerprint.deviceFingerprint}
      AND browser_fingerprint != ${currentFingerprint.browserFingerprint}
    `;

    if (relatedFingerprints.rows.length > 0) {
      // 2. Crea o aggiorna cluster ID per questo dispositivo
      const deviceClusterId = createHash('sha256')
        .update(`cluster_${currentFingerprint.deviceFingerprint}`)
        .digest('hex')
        .substring(0, 24);

      // 3. Inserisci/aggiorna correlazione per il fingerprint corrente
      await sql`
        INSERT INTO fingerprint_correlations (
          device_cluster_id,
          fingerprint_hash,
          correlation_type,
          confidence_score,
          first_correlated,
          last_confirmed
        ) VALUES (
          ${deviceClusterId},
          ${currentFingerprint.browserFingerprint},
          'same_device',
          ${currentFingerprint.confidence},
          NOW(),
          NOW()
        )
        ON CONFLICT (device_cluster_id, fingerprint_hash) 
        DO UPDATE SET
          last_confirmed = NOW(),
          confidence_score = GREATEST(fingerprint_correlations.confidence_score, ${currentFingerprint.confidence})
      `;

      // 4. Inserisci/aggiorna correlazioni per tutti i fingerprint correlati
      for (const related of relatedFingerprints.rows) {
        const relatedFp = (related as Record<string, unknown>).browser_fingerprint as string;
        const relatedConfidence = ((related as Record<string, unknown>).confidence as number) || 100;

        await sql`
          INSERT INTO fingerprint_correlations (
            device_cluster_id,
            fingerprint_hash,
            correlation_type,
            confidence_score,
            first_correlated,
            last_confirmed
          ) VALUES (
            ${deviceClusterId},
            ${relatedFp},
            'same_device',
            ${relatedConfidence},
            NOW(),
            NOW()
          )
          ON CONFLICT (device_cluster_id, fingerprint_hash) 
          DO UPDATE SET
            last_confirmed = NOW(),
            confidence_score = GREATEST(fingerprint_correlations.confidence_score, ${relatedConfidence})
        `;
      }


    }
  } catch (error) {
    console.error('Error updating fingerprint correlations:', error);
  }
}

/**
 * Determina se un click dovrebbe essere considerato unico
 * basandosi sulla correlazione tra fingerprint
 */
export async function isUniqueVisit(
  linkId: number,
  currentFingerprint: PhysicalDeviceFingerprint,
  sql: SqlFunction
): Promise<{
  isUnique: boolean;
  reason: string;
  relatedFingerprints: string[];
}> {
  try {
    // AGGIORNA CORRELAZIONI: Popola la tabella fingerprint_correlations
    await updateFingerprintCorrelations(currentFingerprint, sql);

    // CONTROLLO 1: Verifica se questo DEVICE_FINGERPRINT ha già visitato (escludendo browser corrente)
    const deviceMatch = await sql`
      SELECT COUNT(*) as count, 
             array_agg(DISTINCT browser_fingerprint) as browser_fingerprints,
             array_agg(DISTINCT browser_type) as browser_types
      FROM enhanced_fingerprints 
      WHERE link_id = ${linkId} 
      AND device_fingerprint = ${currentFingerprint.deviceFingerprint}
      AND browser_fingerprint != ${currentFingerprint.browserFingerprint}
    `;
    
    if (deviceMatch.rows.length > 0 && ((deviceMatch.rows[0] as Record<string, unknown>).count as number) > 0) {
      const relatedBrowsers = ((deviceMatch.rows[0] as Record<string, unknown>).browser_fingerprints as string[]) || [];
      
      return {
        isUnique: false,
        reason: 'same_device_different_browser',
        relatedFingerprints: relatedBrowsers
      };
    }

    // CONTROLLO 2: Verifica se questo SPECIFICO browser ha già visitato
    const browserMatch = await sql`
      SELECT visit_count 
      FROM enhanced_fingerprints 
      WHERE link_id = ${linkId} 
      AND browser_fingerprint = ${currentFingerprint.browserFingerprint}
      ORDER BY last_seen DESC
      LIMIT 1
    `;
    
    if (browserMatch.rows.length > 0) {
      const visitCount = ((browserMatch.rows[0] as Record<string, unknown>).visit_count as number) || 1;
      
      // Se visit_count > 1, significa che questo browser ha già visitato prima
      if (visitCount > 1) {
        return {
          isUnique: false,
          reason: 'repeat_visit_same_browser',
          relatedFingerprints: [currentFingerprint.browserFingerprint]
        };
      }
      
      // Se visit_count = 1, è la prima visita da questo browser E
      // non ci sono altri browser dallo stesso device (controllo 1 già fatto)
      return {
        isUnique: true,
        reason: 'first_visit_new_device',
        relatedFingerprints: []
      };
    }

    // Se arriviamo qui, non dovrebbe succedere (bug), ma consideriamo come unico
    return {
      isUnique: true,
      reason: 'fallback_new_device',
      relatedFingerprints: []
    };
    
  } catch (error) {
    console.error('❌ Error checking unique visit:', error);
    // In caso di errore, considera come unico per non perdere dati
    return {
      isUnique: true,
      reason: 'error_fallback',
      relatedFingerprints: []
    };
  }
}

