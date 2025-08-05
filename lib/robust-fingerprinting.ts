/**
 * Sistema di fingerprinting robusto che combina multiple fonti
 * di informazioni per creare identificatori stabili e affidabili
 */

import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { UAParser } from 'ua-parser-js';
import { getRobustGeoLocation, RobustGeoInfo } from './robust-geo-tracker';

export interface RobustFingerprint {
  // Identificatori primari
  primaryFingerprint: string;          // Hash principale per tracking
  deviceStableHash: string;            // Hash del dispositivo fisico
  sessionHash: string;                 // Hash della sessione corrente
  
  // Componenti del fingerprint
  ipComponent: string;                 // Componente IP
  geoComponent: string;                // Componente geografico
  deviceComponent: string;             // Componente dispositivo
  browserComponent: string;            // Componente browser
  
  // Metadati
  confidence: number;                  // 0-100 confidenza del fingerprint
  sources: string[];                   // Fonti usate per generare il fingerprint
  geoInfo: RobustGeoInfo;             // Informazioni geografiche dettagliate
  
  // Timestamp e correlazione
  timestamp: number;
  correlationKey: string;              // Chiave per correlazione tra sessioni
}

/**
 * Genera un fingerprint robusto combinando multiple fonti
 */
export async function generateRobustFingerprint(request: NextRequest): Promise<RobustFingerprint> {
  const timestamp = Date.now();
  const sources: string[] = [];
  
  // 1. Ottieni informazioni geografiche robuste
  const geoInfo = await getRobustGeoLocation(request);
  sources.push(geoInfo.source);
  
  // 2. Analizza User Agent con fallback multipli
  const deviceInfo = analyzeDeviceInfo(request);
  sources.push('user-agent-analysis');
  
  // 3. Genera componenti del fingerprint
  const ipComponent = generateIPComponent(geoInfo);
  const geoComponent = generateGeoComponent(geoInfo);
  const deviceComponent = generateDeviceComponent(request, deviceInfo);
  const browserComponent = generateBrowserComponent(request, deviceInfo);
  
  // 4. Calcola confidence complessiva
  const confidence = calculateFingerprintConfidence(geoInfo, deviceInfo, sources);
  
  // 5. Genera hash primari
  const deviceStableHash = generateDeviceStableHash(ipComponent, geoComponent, deviceComponent);
  const sessionHash = generateSessionHash(deviceStableHash, browserComponent, timestamp);
  const primaryFingerprint = generatePrimaryFingerprint(deviceStableHash, sessionHash);
  
  // 6. Genera chiave di correlazione per tracking cross-sessione
  const correlationKey = generateCorrelationKey(geoInfo, deviceInfo);
  
  const fingerprint: RobustFingerprint = {
    primaryFingerprint,
    deviceStableHash,
    sessionHash,
    ipComponent,
    geoComponent,
    deviceComponent,
    browserComponent,
    confidence,
    sources,
    geoInfo,
    timestamp,
    correlationKey
  };
  
  console.log('🔐 Generated robust fingerprint:', {
    primaryFingerprint: primaryFingerprint.substring(0, 12) + '...',
    confidence,
    sources,
    ip: geoInfo.ip.substring(0, 8) + '...',
    location: `${geoInfo.city}, ${geoInfo.region}, ${geoInfo.country}`
  });
  
  return fingerprint;
}

/**
 * Analizza informazioni del dispositivo con fallback robusti
 */
function analyzeDeviceInfo(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  // Normalizza informazioni browser
  let browserName = result.browser.name || 'Unknown';
  let browserVersion = result.browser.version || '0';
  
  // Gestisci casi speciali per app mobili
  if (userAgent.includes('Instagram')) browserName = 'Instagram';
  else if (userAgent.includes('FBAN') || userAgent.includes('FBAV')) browserName = 'Facebook';
  else if (userAgent.includes('WhatsApp')) browserName = 'WhatsApp';
  else if (userAgent.includes('Telegram')) browserName = 'Telegram';
  else if (userAgent.includes('TikTok')) browserName = 'TikTok';
  
  // Normalizza OS
  let osName = result.os.name || 'Unknown';
  let osVersion = result.os.version || '0';
  
  if (osName.toLowerCase().includes('mac')) osName = 'macOS';
  else if (osName.toLowerCase().includes('win')) osName = 'Windows';
  else if (osName.toLowerCase().includes('android')) osName = 'Android';
  else if (osName.toLowerCase().includes('ios')) osName = 'iOS';
  else if (osName.toLowerCase().includes('linux')) osName = 'Linux';
  
  // Determina tipo dispositivo
  let deviceType = result.device.type || 'desktop';
  if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/Tablet|iPad/i.test(userAgent)) {
    deviceType = 'tablet';
  }
  
  // Estrai lingua primaria
  const primaryLanguage = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase() || 'unknown';
  
  return {
    browserName,
    browserVersion: browserVersion.split('.')[0], // Solo major version
    osName,
    osVersion: osVersion.split('.')[0], // Solo major version
    deviceType,
    primaryLanguage,
    acceptEncoding,
    userAgent: userAgent.substring(0, 200) // Limitato per evitare hash troppo lunghi
  };
}

/**
 * Genera componente IP che tiene conto di possibili cambiamenti
 */
function generateIPComponent(geoInfo: RobustGeoInfo): string {
  // Se l'IP è affidabile, usalo direttamente
  if (geoInfo.confidence >= 80 && geoInfo.ip !== 'localhost') {
    return createHash('sha256').update(geoInfo.ipHash).digest('hex').substring(0, 12);
  }
  
  // Altrimenti usa una subnet più ampia o geo info come fallback
  if (geoInfo.ip.includes('.')) {
    // Per IPv4, usa solo i primi 3 ottetti (subnet /24)
    const subnet = geoInfo.ip.split('.').slice(0, 3).join('.');
    return createHash('sha256').update(subnet).digest('hex').substring(0, 12);
  }
  
  // Per IP non affidabili, usa informazioni geografiche
  return createHash('sha256').update(`${geoInfo.country}-${geoInfo.region}`).digest('hex').substring(0, 12);
}

/**
 * Genera componente geografico con tolleranza ai cambiamenti
 */
function generateGeoComponent(geoInfo: RobustGeoInfo): string {
  // Usa livelli di granularità basati sulla confidence
  if (geoInfo.confidence >= 90) {
    // Alta confidence: usa città
    return createHash('sha256').update(`${geoInfo.country}-${geoInfo.region}-${geoInfo.city}`).digest('hex').substring(0, 10);
  } else if (geoInfo.confidence >= 70) {
    // Media confidence: usa regione
    return createHash('sha256').update(`${geoInfo.country}-${geoInfo.region}`).digest('hex').substring(0, 10);
  } else {
    // Bassa confidence: usa solo paese
    return createHash('sha256').update(geoInfo.country).digest('hex').substring(0, 10);
  }
}

/**
 * Genera componente dispositivo stabile tra browser
 */
function generateDeviceComponent(request: NextRequest, deviceInfo: any): string {
  // Elementi che dovrebbero essere stabili per lo stesso dispositivo fisico
  const stableElements = [
    deviceInfo.osName,
    deviceInfo.osVersion,
    deviceInfo.deviceType,
    deviceInfo.primaryLanguage
    // Nota: non includiamo browser specifico qui perché vogliamo che sia stabile tra browser
  ];
  
  return createHash('sha256').update(stableElements.join('|')).digest('hex').substring(0, 10);
}

/**
 * Genera componente browser specifico
 */
function generateBrowserComponent(request: NextRequest, deviceInfo: any): string {
  const browserElements = [
    deviceInfo.browserName,
    deviceInfo.browserVersion,
    deviceInfo.acceptEncoding,
    // Altri header specifici del browser
    request.headers.get('accept') || '',
    request.headers.get('sec-ch-ua') || ''
  ];
  
  return createHash('sha256').update(browserElements.join('|')).digest('hex').substring(0, 10);
}

/**
 * Genera hash stabile del dispositivo fisico
 */
function generateDeviceStableHash(ipComponent: string, geoComponent: string, deviceComponent: string): string {
  return createHash('sha256').update(`${ipComponent}|${geoComponent}|${deviceComponent}`).digest('hex').substring(0, 16);
}

/**
 * Genera hash della sessione corrente
 */
function generateSessionHash(deviceStableHash: string, browserComponent: string, timestamp: number): string {
  // Cambia ogni 6 ore per bilanciare stabilità e privacy
  const timeWindow = Math.floor(timestamp / (1000 * 60 * 60 * 6));
  return createHash('sha256').update(`${deviceStableHash}|${browserComponent}|${timeWindow}`).digest('hex').substring(0, 16);
}

/**
 * Genera fingerprint primario
 */
function generatePrimaryFingerprint(deviceStableHash: string, sessionHash: string): string {
  return createHash('sha256').update(`${deviceStableHash}|${sessionHash}`).digest('hex').substring(0, 24);
}

/**
 * Genera chiave di correlazione per tracking cross-sessione
 */
function generateCorrelationKey(geoInfo: RobustGeoInfo, deviceInfo: any): string {
  // Combina elementi molto stabili per correlazione a lungo termine
  const correlationElements = [
    geoInfo.country,
    deviceInfo.osName,
    deviceInfo.deviceType,
    deviceInfo.primaryLanguage
  ];
  
  return createHash('sha256').update(correlationElements.join('|')).digest('hex').substring(0, 12);
}

/**
 * Calcola confidence complessiva del fingerprint
 */
function calculateFingerprintConfidence(geoInfo: RobustGeoInfo, deviceInfo: any, sources: string[]): number {
  let confidence = 30; // Base confidence
  
  // Confidence geografica
  confidence += Math.min(geoInfo.confidence * 0.4, 40);
  
  // Confidence dispositivo
  if (deviceInfo.browserName !== 'Unknown') confidence += 10;
  if (deviceInfo.osName !== 'Unknown') confidence += 10;
  if (deviceInfo.deviceType !== 'unknown') confidence += 5;
  if (deviceInfo.primaryLanguage !== 'unknown') confidence += 5;
  
  // Bonus per fonti multiple
  if (sources.length > 2) confidence += 5;
  if (sources.includes('vercel-headers')) confidence += 10;
  
  return Math.min(confidence, 100);
}

/**
 * Verifica se due fingerprint potrebbero appartenere allo stesso utente
 */
export function areRelatedFingerprints(fp1: RobustFingerprint, fp2: RobustFingerprint): {
  isRelated: boolean;
  confidence: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let confidence = 0;
  
  // Controllo hash dispositivo stabile
  if (fp1.deviceStableHash === fp2.deviceStableHash) {
    confidence += 40;
    reasons.push('same-device-hash');
  }
  
  // Controllo correlazione key
  if (fp1.correlationKey === fp2.correlationKey) {
    confidence += 30;
    reasons.push('same-correlation-key');
  }
  
  // Controllo geografico
  if (fp1.geoComponent === fp2.geoComponent) {
    confidence += 20;
    reasons.push('same-geo-component');
  }
  
  // Controllo IP component (con tolleranza)
  if (fp1.ipComponent === fp2.ipComponent) {
    confidence += 15;
    reasons.push('same-ip-component');
  }
  
  // Controllo device component
  if (fp1.deviceComponent === fp2.deviceComponent) {
    confidence += 10;
    reasons.push('same-device-component');
  }
  
  // Controllo temporale (se troppo vicini nel tempo, probabilmente stesso utente)
  const timeDiff = Math.abs(fp1.timestamp - fp2.timestamp);
  if (timeDiff < 1000 * 60 * 10) { // 10 minuti
    confidence += 5;
    reasons.push('close-in-time');
  }
  
  return {
    isRelated: confidence >= 50,
    confidence,
    reasons
  };
}
