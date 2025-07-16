/**
 * Enhanced Fingerprinting System
 * Sistema migliorato che identifica lo stesso utente fisico 
 * anche quando usa browser diversi o modalità incognito
 */

import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { UAParser } from 'ua-parser-js';

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
 * Genera un fingerprint fisico del dispositivo che sia stabile tra browser
 */
function generatePhysicalDeviceFingerprint(request: NextRequest): PhysicalDeviceFingerprint {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  
  // Parse informazioni del browser/OS
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();
  const cpu = parser.getCPU();

  // 1. ELEMENTI FISICI DEL DISPOSITIVO (stabili tra browser)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
  const ipHash = createHash('sha256').update(ip).digest('hex').substring(0, 16);
  
  // Timezone e offset (molto stabili)
  const timezone = request.headers.get('x-vercel-ip-timezone') || 'Unknown';
  const timezoneFingerprint = timezone;
  
  // Informazioni geografiche (stabili a breve termine)
  const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
  const region = request.headers.get('x-vercel-ip-country-region') || 'Unknown';
  const city = request.headers.get('x-vercel-ip-city') || 'Unknown';
  
  // Hardware info (stabile)
  const cpuArch = cpu.architecture || 'unknown';
  const osName = os.name || 'unknown';
  const osVersion = os.version || 'unknown';
  const deviceType = device.type || 'desktop';
  
  // Lingua primaria (generalmente stabile)
  const primaryLanguage = acceptLanguage.split(',')[0]?.split('-')[0] || 'unknown';
  
  // 2. ELEMENTI DEL BROWSER SPECIFICO (cambiano tra browser)
  const browserName = browser.name || 'unknown';
  const browserVersion = browser.version || 'unknown';
  const fullUserAgent = userAgent;
  
  // Accept headers specifici del browser
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  const accept = request.headers.get('accept') || '';
  
  // 3. GENERAZIONE FINGERPRINT FISICO
  // Combina solo elementi che sono stabili tra browser diversi
  const physicalElements = [
    ipHash,                    // Stesso IP
    timezoneFingerprint,       // Stesso timezone
    country, region,           // Stessa posizione geografica
    osName,                    // Stesso OS
    cpuArch,                   // Stessa architettura
    deviceType,                // Stesso tipo di device
    primaryLanguage            // Stessa lingua primaria
  ].join('|');
  
  const deviceFingerprint = createHash('sha256')
    .update(physicalElements)
    .digest('hex')
    .substring(0, 20);
  
  // 4. GENERAZIONE FINGERPRINT BROWSER
  // Combina elementi specifici del browser
  const browserElements = [
    deviceFingerprint,         // Include base device
    browserName,
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
  
  if (timezone !== 'Unknown') {
    correlationFactors.push('timezone');
    confidence += 15;
  }
  
  if (osName !== 'unknown' && osVersion !== 'unknown') {
    correlationFactors.push('os_version');
    confidence += 10;
  }
  
  if (country !== 'Unknown' && city !== 'Unknown') {
    correlationFactors.push('geo_location');
    confidence += 10;
  }
  
  confidence = Math.min(confidence, 100);
  
  return {
    deviceFingerprint,
    ipHash,
    screenResolution: 'unknown', // Da implementare lato client se necessario
    timezoneFingerprint,
    hardwareProfile: `${cpuArch}-${osName}`,
    browserFingerprint,
    sessionFingerprint,
    browserType: browserName.toLowerCase(),
    deviceCategory: deviceType,
    osFamily: osName.toLowerCase(),
    confidence,
    correlationFactors
  };
}

// Tipi per le query SQL - compatibile con Vercel Postgres
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlFunction = (...args: any[]) => Promise<{ rows: Record<string, unknown>[] }>;
type CountResult = { count: number };
type FingerprintResult = { fingerprint_hash: string };
type UserFingerprintResult = { user_fingerprint: string };

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
    
    // Cerca match parziali basati su IP + timezone + geo
    const partialMatches = await sql`
      SELECT DISTINCT fingerprint_hash, confidence
      FROM enhanced_fingerprints 
      WHERE ip_hash = ${currentFingerprint.ipHash}
      AND timezone_fingerprint = ${currentFingerprint.timezoneFingerprint}
      AND confidence >= 70
      AND fingerprint_hash != ${currentFingerprint.browserFingerprint}
      AND created_at >= NOW() - INTERVAL '7 days'
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
    // 1. Controlla se questo browser specifico ha già visitato
    const directMatch = await sql`
      SELECT COUNT(*) as count 
      FROM clicks 
      WHERE link_id = ${linkId} 
      AND user_fingerprint = ${currentFingerprint.browserFingerprint}
    `;
    
    if ((directMatch.rows[0] as CountResult).count > 0) {
      return {
        isUnique: false,
        reason: 'same_browser_session',
        relatedFingerprints: [currentFingerprint.browserFingerprint]
      };
    }
    
    // 2. Controlla se il dispositivo fisico ha già visitato (tramite correlazione)
    const correlatedFingerprints = await findCorrelatedFingerprints(currentFingerprint, sql);
    
    if (correlatedFingerprints.length > 0) {
      // Controlla se qualche fingerprint correlato ha già visitato questo link
      const correlatedVisits = await sql`
        SELECT DISTINCT user_fingerprint 
        FROM clicks 
        WHERE link_id = ${linkId} 
        AND user_fingerprint = ANY(${correlatedFingerprints})
      `;
        
        if (correlatedVisits.rows.length > 0) {
          return {
            isUnique: false,
            reason: 'same_physical_device',
            relatedFingerprints: correlatedVisits.rows.map((row) => (row as UserFingerprintResult).user_fingerprint)
          };
        }
    }
    
    // 3. Se nessun match, è un visitatore unico
    return {
      isUnique: true,
      reason: 'new_device',
      relatedFingerprints: []
    };
    
  } catch (error) {
    console.error('Error checking unique visit:', error);
    // In caso di errore, considera come unico per non perdere dati
    return {
      isUnique: true,
      reason: 'error_fallback',
      relatedFingerprints: []
    };
  }
}

export { generatePhysicalDeviceFingerprint };
