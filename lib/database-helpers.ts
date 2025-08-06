/**
 * Utility per la gestione delle tabelle links e clicks
 */

import { sql } from '@vercel/postgres';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { UAParser } from 'ua-parser-js';
import { 
  Link, 
  Click, 
  CreateLinkData, 
  GeoLocation, 
  DeviceInfo, 
  ClickFingerprint 
} from './types';

/**
 * Genera un hash per il fingerprint del click
 */
export function generateClickFingerprintHash(fingerprint: ClickFingerprint): string {
  const data = JSON.stringify({
    link_id: fingerprint.link_id,
    country: fingerprint.country || 'unknown',
    region: fingerprint.region || 'unknown', 
    city: fingerprint.city || 'unknown',
    ip_address: fingerprint.ip_address || 'unknown',
    language_device: fingerprint.language_device || 'unknown',
    timezone_device: fingerprint.timezone_device || 'unknown'
  });
  
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * Mappa completa dei codici ISO paese ai nomi leggibili
 */
const COUNTRY_CODE_TO_NAME: { [code: string]: string } = {
  'US': 'United States', 'IT': 'Italy', 'GB': 'United Kingdom', 'DE': 'Germany',
  'FR': 'France', 'ES': 'Spain', 'JP': 'Japan', 'CN': 'China', 'IN': 'India',
  'BR': 'Brazil', 'AU': 'Australia', 'CA': 'Canada', 'RU': 'Russia', 'MX': 'Mexico',
  'KR': 'South Korea', 'NL': 'Netherlands', 'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark',
  'FI': 'Finland', 'CH': 'Switzerland', 'AT': 'Austria', 'BE': 'Belgium', 'PT': 'Portugal',
  'PL': 'Poland', 'CZ': 'Czech Republic', 'HU': 'Hungary', 'RO': 'Romania', 'BG': 'Bulgaria',
  'HR': 'Croatia', 'SK': 'Slovakia', 'SI': 'Slovenia', 'EE': 'Estonia', 'LV': 'Latvia',
  'LT': 'Lithuania', 'IE': 'Ireland', 'IS': 'Iceland', 'MT': 'Malta', 'CY': 'Cyprus',
  'LU': 'Luxembourg', 'TR': 'Turkey', 'GR': 'Greece', 'IL': 'Israel', 'SA': 'Saudi Arabia',
  'AE': 'United Arab Emirates', 'EG': 'Egypt', 'ZA': 'South Africa', 'NG': 'Nigeria',
  'KE': 'Kenya', 'MA': 'Morocco', 'TN': 'Tunisia', 'AR': 'Argentina', 'CL': 'Chile',
  'CO': 'Colombia', 'PE': 'Peru', 'VE': 'Venezuela', 'UY': 'Uruguay', 'EC': 'Ecuador',
  'BO': 'Bolivia', 'PY': 'Paraguay', 'TH': 'Thailand', 'VN': 'Vietnam', 'MY': 'Malaysia',
  'SG': 'Singapore', 'ID': 'Indonesia', 'PH': 'Philippines', 'TW': 'Taiwan', 'HK': 'Hong Kong',
  'NZ': 'New Zealand', 'UA': 'Ukraine', 'BY': 'Belarus', 'MD': 'Moldova', 'RS': 'Serbia',
  'BA': 'Bosnia and Herzegovina', 'ME': 'Montenegro', 'MK': 'North Macedonia', 'AL': 'Albania',
  'XK': 'Kosovo', 'AM': 'Armenia', 'AZ': 'Azerbaijan', 'GE': 'Georgia', 'KZ': 'Kazakhstan'
};

/**
 * Normalizza il nome della città decodificando caratteri URL-encoded
 */
export function normalizeCityName(city: string): string {
  if (!city || city === 'Unknown') {
    return 'Unknown';
  }
  
  let normalized = city;
  
  try {
    // Decodifica caratteri URL-encoded
    while (normalized !== decodeURIComponent(normalized)) {
      normalized = decodeURIComponent(normalized);
    }
  } catch {
    // Se la decodifica fallisce, prova decodifiche manuali per città specifiche trovate
    const cityMappings: { [key: string]: string } = {
      'Council%20Bluffs': 'Council Bluffs',
      'Frankfurt%20am%20Main': 'Frankfurt am Main', 
      'Los%20Angeles': 'Los Angeles',
      'Los%20Lunas': 'Los Lunas',
      'Lule%C3%A5': 'Luleå',
      'S%C3%A3o%20Paulo': 'São Paulo',
      'San%20Jose': 'San Jose',
      'Santa%20Clara': 'Santa Clara'
    };
    
    if (cityMappings[city]) {
      normalized = cityMappings[city];
    } else {
      // Decodifiche generiche
      normalized = city
        .replace(/%20/g, ' ')
        .replace(/%C3%A5/g, 'å')
        .replace(/%C3%A4/g, 'ä')
        .replace(/%C3%B6/g, 'ö')
        .replace(/%C3%A9/g, 'é')
        .replace(/%C3%A8/g, 'è')
        .replace(/%C3%A0/g, 'à')
        .replace(/%C3%B1/g, 'ñ')
        .replace(/%C3%A7/g, 'ç')
        .replace(/%C3%BC/g, 'ü')
        .replace(/%C3%A3/g, 'ã')
        .replace(/%C2%B0/g, '°');
    }
  }
  
  // Trim e rimuovi spazi multipli
  normalized = normalized.trim().replace(/\s+/g, ' ');
  
  return normalized;
}

/**
 * Normalizza il nome del paese convertendo codici ISO in nomi completi
/**
 * Normalizza il nome del paese convertendo codici ISO in nomi completi
 */
export function normalizeCountryName(country: string): string {
  if (!country || country === 'Unknown') {
    return 'Unknown';
  }
  
  // Se è un codice ISO a 2 lettere, convertilo
  if (country.length === 2 && /^[A-Z]{2}$/.test(country)) {
    return COUNTRY_CODE_TO_NAME[country] || country;
  }
  
  // Se è già un nome completo, restituiscilo così com'è
  return country;
}
const ITALIAN_REGION_CODES: { [key: string]: string } = {
  '01': 'Piemonte',
  '02': 'Valle d\'Aosta',
  '03': 'Lombardia',
  '04': 'Trentino-Alto Adige',
  '05': 'Veneto',
  '06': 'Friuli-Venezia Giulia',
  '07': 'Liguria',
  '08': 'Emilia-Romagna',
  '09': 'Toscana',
  '10': 'Umbria',
  '11': 'Marche',
  '12': 'Lazio',
  '13': 'Abruzzo',
  '14': 'Molise',
  '15': 'Campania',
  '16': 'Puglia',
  '17': 'Basilicata',
  '18': 'Calabria',
  '19': 'Sicilia',
  '20': 'Sardegna',
  '62': 'Lazio',       // Roma - codice specifico
  '82': 'Sicilia',     // Palermo - codice specifico
  '67': 'Campania',    // Napoli - codice comune
  '25': 'Lombardia',   // Milano - codice comune
  '45': 'Emilia-Romagna', // Bologna - codice comune
  '50': 'Toscana',     // Firenze - codice comune
  '80': 'Piemonte'     // Torino - codice comune
};

/**
 * Mappa dei codici regione per altri paesi comuni
 */
const REGION_CODE_MAPPINGS: { [country: string]: { [code: string]: string } } = {
  'US': {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
  },
  'GB': {
    'ENG': 'England',
    'SCT': 'Scotland', 
    'WLS': 'Wales',
    'NIR': 'Northern Ireland'
  },
  'AU': {
    'NSW': 'New South Wales',
    'VIC': 'Victoria',
    'QLD': 'Queensland',
    'WA': 'Western Australia',
    'SA': 'South Australia',
    'TAS': 'Tasmania',
    'ACT': 'Australian Capital Territory',
    'NT': 'Northern Territory'
  },
  'BR': {
    'SP': 'São Paulo',
    'RJ': 'Rio de Janeiro',
    'MG': 'Minas Gerais',
    'BA': 'Bahia',
    'PR': 'Paraná',
    'RS': 'Rio Grande do Sul',
    'PE': 'Pernambuco',
    'CE': 'Ceará',
    'PA': 'Pará',
    'SC': 'Santa Catarina'
  },
  'JP': {
    '13': 'Tokyo',
    '14': 'Kanagawa',
    '27': 'Osaka',
    '23': 'Aichi',
    '01': 'Hokkaido',
    '40': 'Fukuoka',
    '28': 'Hyogo',
    '11': 'Saitama',
    '12': 'Chiba',
    '26': 'Kyoto'
  },
  'PL': {
    '02': 'Lower Silesian Voivodeship',
    '04': 'Kuyavian-Pomeranian Voivodeship', 
    '06': 'Lublin Voivodeship',
    '08': 'Lubusz Voivodeship',
    '10': 'Łódź Voivodeship',
    '12': 'Lesser Poland Voivodeship',
    '14': 'Masovian Voivodeship',
    '16': 'Opole Voivodeship',
    '18': 'Subcarpathian Voivodeship',
    '20': 'Podlaskie Voivodeship',
    '22': 'Pomeranian Voivodeship',
    '24': 'Silesian Voivodeship',
    '26': 'Świętokrzyskie Voivodeship',
    '28': 'Warmian-Masurian Voivodeship',
    '30': 'Greater Poland Voivodeship',
    '32': 'West Pomeranian Voivodeship'
  }
};

/**
 * Normalizza il nome della regione convertendo codici in nomi leggibili
 */
export function normalizeRegionName(region: string, countryCode: string): string {
  if (!region || region === 'Unknown') {
    return 'Unknown';
  }
  
  // Se è già un nome completo (contiene lettere minuscole o spazi), restituiscilo così com'è
  if (/[a-z\s]/.test(region) && region.length > 3) {
    return region;
  }
  
  // Controllo per codici regionali italiani
  if (countryCode === 'IT' && ITALIAN_REGION_CODES[region]) {
    return ITALIAN_REGION_CODES[region];
  }
  
  // Controllo per altri paesi
  if (REGION_CODE_MAPPINGS[countryCode] && REGION_CODE_MAPPINGS[countryCode][region]) {
    return REGION_CODE_MAPPINGS[countryCode][region];
  }

  // Se è un numero puro e non abbiamo una mappatura, sostituiscilo con "Unknown Region"
  // per evitare di mostrare numeri confusi agli utenti
  if (/^\d+$/.test(region)) {
    return 'Unknown Region';
  }
  
  // Se non trovato nelle mappe ma sembra un codice (tutto maiuscolo, <=3 caratteri), mantienilo
  if (/^[A-Z0-9]{1,3}$/.test(region)) {
    return region; // Mantieni il codice se non abbiamo la mappatura
  }
  
  return region;
}
export async function getGeoLocation(request: NextRequest): Promise<GeoLocation> {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || '127.0.0.1';
  
  // Prima controlla gli header di geolocalizzazione di Vercel (se disponibili)
  const vercelCountry = request.headers.get('x-vercel-ip-country');
  const vercelRegion = request.headers.get('x-vercel-ip-country-region');
  const vercelCity = request.headers.get('x-vercel-ip-city');
  
  if (vercelCountry && vercelCity) {
    console.log(`🌍 Usando geolocalizzazione Vercel: ${vercelCity}, ${vercelRegion}, ${vercelCountry}`);
    return {
      country: vercelCountry,
      region: vercelRegion || 'Unknown',
      city: vercelCity
    };
  }
  
  // Se è IP locale, restituisci dati di default
  if (ip && (ip.startsWith('192.168') || ip.startsWith('10.') || ip.startsWith('172.') || 
            ip === '::1' || ip === '127.0.0.1' || ip === 'localhost')) {
    return {
      country: 'Italy',
      region: 'Lazio',
      city: 'Rome'
    };
  }
  
  try {
    // Usa il servizio gratuito ipapi.co per la geolocalizzazione
    const response = await fetch(`http://ipapi.co/${ip}/json/`, {
      headers: {
        'User-Agent': 'ShorterLink/1.0'
      },
      // Timeout di 3 secondi per non rallentare troppo
      signal: AbortSignal.timeout(3000)
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Verifica che i dati siano validi
      if (data && !data.error) {
        // Normalizza il nome della regione
        const normalizedRegion = normalizeRegionName(data.region || data.region_code || 'Unknown', data.country || 'Unknown');
        
        // Normalizza il nome del paese (preferisce country_name, poi country, poi conversione ISO)
        const normalizedCountry = normalizeCountryName(data.country_name || data.country || 'Unknown');
        
        console.log(`🌍 Geolocalizzazione IP ${ip}: ${data.city}, ${normalizedRegion}, ${normalizedCountry} (era: ${data.region}, ${data.country_name || data.country})`);
        
        return {
          country: normalizedCountry,
          region: normalizedRegion,
          city: data.city || 'Unknown'
        };
      }
    }
  } catch (error) {
    console.warn(`⚠️ Errore nella geolocalizzazione IP ${ip}:`, error);
  }
  
  // Fallback in caso di errore
  return {
    country: 'Unknown',
    region: 'Unknown', 
    city: 'Unknown'
  };
}

/**
 * Estrae informazioni del dispositivo dal user agent usando UAParser per maggiore accuratezza
 */
export function getDeviceInfo(request: NextRequest): DeviceInfo {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  
  // Usa UAParser per un parsing accurato del user agent
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  // Estrai informazioni dal parsing
  let browser_name = 'Unknown';
  let device_type = 'Desktop';
  let os_name = 'Unknown';
  
  // Browser detection con UAParser
  if (result.browser.name) {
    browser_name = result.browser.name;
    
    // Aggiungi versione se disponibile e rilevante
    if (result.browser.version) {
      const majorVersion = result.browser.version.split('.')[0];
      if (majorVersion && !isNaN(parseInt(majorVersion))) {
        browser_name += ` ${majorVersion}`;
      }
    }
  } else {
    // Fallback per app specifiche che UAParser potrebbe non riconoscere
    if (userAgent.includes('Instagram')) {
      browser_name = 'Instagram App';
    } else if (userAgent.includes('FBAN') || userAgent.includes('FBAV')) {
      browser_name = 'Facebook App';
    } else if (userAgent.includes('WhatsApp')) {
      browser_name = 'WhatsApp';
    } else if (userAgent.includes('Telegram')) {
      browser_name = 'Telegram';
    } else if (userAgent.includes('TikTok')) {
      browser_name = 'TikTok';
    } else if (userAgent.includes('Twitter')) {
      browser_name = 'Twitter';
    }
  }
  
  // Device type detection
  if (result.device.type) {
    // UAParser restituisce 'mobile', 'tablet', 'smarttv', 'wearable', 'embedded', etc.
    switch (result.device.type) {
      case 'mobile':
        device_type = 'Mobile';
        break;
      case 'tablet':
        device_type = 'Tablet';
        break;
      case 'smarttv':
        device_type = 'Smart TV';
        break;
      case 'wearable':
        device_type = 'Wearable';
        break;
      default:
        device_type = 'Desktop';
    }
  } else {
    // Se UAParser non rileva il tipo, usa il fallback
    if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      device_type = 'Mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
      device_type = 'Tablet';
    }
  }
  
  // OS detection con UAParser
  if (result.os.name) {
    os_name = result.os.name;
    
    // Aggiungi versione per sistemi principali
    if (result.os.version) {
      if (result.os.name === 'Windows') {
        // Mappatura versioni Windows
        if (result.os.version.startsWith('10')) {
          os_name = 'Windows 10/11';
        } else if (result.os.version.startsWith('6.3')) {
          os_name = 'Windows 8.1';
        } else if (result.os.version.startsWith('6.2')) {
          os_name = 'Windows 8';
        } else if (result.os.version.startsWith('6.1')) {
          os_name = 'Windows 7';
        } else {
          os_name = `Windows ${result.os.version}`;
        }
      } else if (result.os.name === 'Mac OS') {
        os_name = 'macOS';
        if (result.os.version) {
          const version = result.os.version.split('.')[0];
          if (parseInt(version) >= 11) {
            os_name = `macOS ${version}`;
          }
        }
      } else if (result.os.name === 'iOS' || result.os.name === 'Android') {
        const majorVersion = result.os.version.split('.')[0];
        if (majorVersion) {
          os_name = `${result.os.name} ${majorVersion}`;
        }
      }
    }
  }
  
  // Estrazione lingua migliorata
  const language_device = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase() || 'unknown';
  
  // Timezone (lo otterremo dal client-side in futuro)
  const timezone_device = 'Europe/Rome'; // Default per ora
  
  return {
    browser_name,
    device_type,
    os_name,
    language_device,
    timezone_device
  };
}

/**
 * Crea un nuovo link nel database
 */
export async function createLink(linkData: CreateLinkData): Promise<Link> {
  const result = await sql`
    INSERT INTO links (
      short_code, original_url, title, description, user_id, workspace_id, 
      folder_id, utm_campaign, utm_source, utm_content, utm_medium, utm_term
    ) VALUES (
      ${linkData.short_code}, ${linkData.original_url}, ${linkData.title || null}, 
      ${linkData.description || null}, ${linkData.user_id}, ${linkData.workspace_id},
      ${linkData.folder_id || null}, ${linkData.utm_campaign || null}, 
      ${linkData.utm_source || null}, ${linkData.utm_content || null}, 
      ${linkData.utm_medium || null}, ${linkData.utm_term || null}
    ) RETURNING *
  `;
  
  return result.rows[0] as Link;
}

/**
 * Ottiene un link dal suo short_code
 */
export async function getLinkByShortCode(shortCode: string): Promise<Link | null> {
  const result = await sql`
    SELECT * FROM links WHERE short_code = ${shortCode}
  `;
  
  return result.rows[0] as Link || null;
}

/**
 * Ottiene tutti i link di un utente in un workspace
 */
export async function getUserLinks(userId: number, workspaceId: number): Promise<Array<Link & { click_count: number; unique_click_count: number }>> {
  const result = await sql`
    SELECT 
      l.*,
      COUNT(c.id)::integer as click_count,
      COUNT(DISTINCT c.click_fingerprint_hash)::integer as unique_click_count
    FROM links l
    LEFT JOIN clicks c ON l.id = c.link_id
    WHERE l.user_id = ${userId} AND l.workspace_id = ${workspaceId}
    GROUP BY l.id
    ORDER BY l.created_at DESC
  `;
  
  return result.rows as Array<Link & { click_count: number; unique_click_count: number }>;
}

/**
 * Verifica se uno short_code è già in uso
 */
export async function isShortCodeTaken(shortCode: string): Promise<boolean> {
  const result = await sql`
    SELECT 1 FROM links WHERE short_code = ${shortCode} LIMIT 1
  `;
  
  return result.rowCount! > 0;
}

/**
 * Analizza il referrer e i parametri URL per determinare la fonte precisa del click
 */
export function analyzeReferrerSource(request: NextRequest): {
  referrer: string;
  source_type: string;
  source_detail: string;
} {
  const url = new URL(request.url);
  const rawReferrer = request.headers.get('referer') || request.headers.get('referrer') || '';
  const userAgent = request.headers.get('user-agent') || '';
  
  // 1. CONTROLLO QR CODE - Priorità massima
  const qrParam = url.searchParams.get('qr');
  if (qrParam === '1' || qrParam === 'true') {
    return {
      referrer: 'QR Code',
      source_type: 'qr_code',
      source_detail: 'QR Code Scanner'
    };
  }
  
  // 2. CONTROLLO PARAMETRI UTM E PERSONALIZZATI
  const utmSource = url.searchParams.get('utm_source');
  const utmMedium = url.searchParams.get('utm_medium');
  const utmCampaign = url.searchParams.get('utm_campaign');
  
  if (utmSource) {
    let sourceDetail = utmSource;
    if (utmMedium) sourceDetail += ` (${utmMedium})`;
    if (utmCampaign) sourceDetail += ` - ${utmCampaign}`;
    
    return {
      referrer: `UTM: ${sourceDetail}`,
      source_type: 'utm_campaign',
      source_detail: sourceDetail
    };
  }
  
  // Altri parametri comuni
  const fbclid = url.searchParams.get('fbclid'); // Facebook
  const gclid = url.searchParams.get('gclid');   // Google Ads
  const igshid = url.searchParams.get('igshid'); // Instagram
  
  if (fbclid) {
    return {
      referrer: 'Facebook',
      source_type: 'social_media',
      source_detail: 'Facebook Click ID'
    };
  }
  
  if (gclid) {
    return {
      referrer: 'Google Ads',
      source_type: 'paid_advertising',
      source_detail: 'Google Click ID'
    };
  }
  
  if (igshid) {
    return {
      referrer: 'Instagram',
      source_type: 'social_media',
      source_detail: 'Instagram Share ID'
    };
  }
  
  // 3. ANALISI REFERRER HEADER
  if (rawReferrer) {
    try {
      const referrerUrl = new URL(rawReferrer);
      const domain = referrerUrl.hostname.toLowerCase();
      
      // Social Media
      if (domain.includes('facebook.com') || domain.includes('fb.com')) {
        return {
          referrer: 'Facebook',
          source_type: 'social_media',
          source_detail: 'Facebook Website'
        };
      }
      
      if (domain.includes('instagram.com')) {
        return {
          referrer: 'Instagram',
          source_type: 'social_media',
          source_detail: 'Instagram Website'
        };
      }
      
      if (domain.includes('twitter.com') || domain.includes('t.co') || domain.includes('x.com')) {
        return {
          referrer: 'Twitter/X',
          source_type: 'social_media',
          source_detail: 'Twitter Website'
        };
      }
      
      if (domain.includes('linkedin.com')) {
        return {
          referrer: 'LinkedIn',
          source_type: 'social_media',
          source_detail: 'LinkedIn Website'
        };
      }
      
      if (domain.includes('tiktok.com')) {
        return {
          referrer: 'TikTok',
          source_type: 'social_media',
          source_detail: 'TikTok Website'
        };
      }
      
      if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        return {
          referrer: 'YouTube',
          source_type: 'social_media',
          source_detail: 'YouTube Website'
        };
      }
      
      if (domain.includes('whatsapp.com') || domain.includes('wa.me')) {
        return {
          referrer: 'WhatsApp',
          source_type: 'messaging',
          source_detail: 'WhatsApp Web'
        };
      }
      
      if (domain.includes('telegram.org') || domain.includes('t.me')) {
        return {
          referrer: 'Telegram',
          source_type: 'messaging',
          source_detail: 'Telegram Website'
        };
      }
      
      // Search Engines
      if (domain.includes('google.') || domain.includes('google.com')) {
        return {
          referrer: 'Google Search',
          source_type: 'search_engine',
          source_detail: 'Google Organic'
        };
      }
      
      if (domain.includes('bing.com')) {
        return {
          referrer: 'Bing Search',
          source_type: 'search_engine',
          source_detail: 'Bing Organic'
        };
      }
      
      if (domain.includes('yahoo.com')) {
        return {
          referrer: 'Yahoo Search',
          source_type: 'search_engine',
          source_detail: 'Yahoo Organic'
        };
      }
      
      if (domain.includes('duckduckgo.com')) {
        return {
          referrer: 'DuckDuckGo',
          source_type: 'search_engine',
          source_detail: 'DuckDuckGo Organic'
        };
      }
      
      // Email providers
      if (domain.includes('gmail.com') || domain.includes('mail.google.com')) {
        return {
          referrer: 'Gmail',
          source_type: 'email',
          source_detail: 'Gmail Client'
        };
      }
      
      if (domain.includes('outlook.') || domain.includes('hotmail.') || domain.includes('live.com')) {
        return {
          referrer: 'Outlook',
          source_type: 'email',
          source_detail: 'Outlook Client'
        };
      }
      
      // Se è il nostro stesso dominio, è un click interno
      if (domain.includes('sho-smoky.vercel.app') || domain.includes('localhost')) {
        return {
          referrer: 'Internal',
          source_type: 'internal',
          source_detail: 'Same Website'
        };
      }
      
      // Altri siti web
      let cleanDomain = domain;
      try {
        // Decodifica il domain se contiene caratteri encoded
        if (domain.includes('%')) {
          cleanDomain = decodeURIComponent(domain);
        }
      } catch {
        // Se la decodifica fallisce, usa il domain originale
        cleanDomain = domain;
      }
      
      return {
        referrer: cleanDomain,
        source_type: 'website',
        source_detail: `External Website: ${cleanDomain}`
      };
      
    } catch {
      // Se non riusciamo a parsare l'URL, usa il referrer raw ma decodificalo
      let cleanReferrer = rawReferrer;
      try {
        // Prova a decodificare il referrer
        cleanReferrer = decodeURIComponent(rawReferrer);
      } catch {
        // Se la decodifica fallisce, prova con decodifiche manuali
        cleanReferrer = rawReferrer
          .replace(/%20/g, ' ')
          .replace(/%21/g, '!')
          .replace(/%22/g, '"')
          .replace(/%23/g, '#')
          .replace(/%24/g, '$')
          .replace(/%25/g, '%')
          .replace(/%26/g, '&')
          .replace(/%27/g, "'")
          .replace(/%28/g, '(')
          .replace(/%29/g, ')')
          .replace(/%2A/g, '*')
          .replace(/%2B/g, '+')
          .replace(/%2C/g, ',')
          .replace(/%2D/g, '-')
          .replace(/%2E/g, '.')
          .replace(/%2F/g, '/')
          .replace(/%3A/g, ':')
          .replace(/%3B/g, ';')
          .replace(/%3C/g, '<')
          .replace(/%3D/g, '=')
          .replace(/%3E/g, '>')
          .replace(/%3F/g, '?')
          .replace(/%40/g, '@')
          .replace(/%5B/g, '[')
          .replace(/%5C/g, '\\')
          .replace(/%5D/g, ']')
          .replace(/%5E/g, '^')
          .replace(/%5F/g, '_')
          .replace(/%60/g, '`')
          .replace(/%7B/g, '{')
          .replace(/%7C/g, '|')
          .replace(/%7D/g, '}')
          .replace(/%7E/g, '~');
      }
      
      return {
        referrer: cleanReferrer,
        source_type: 'unknown',
        source_detail: 'Unparseable Referrer'
      };
    }
  }
  
  // 4. ANALISI USER AGENT (per app mobile)
  if (userAgent) {
    // App Instagram
    if (userAgent.includes('Instagram')) {
      return {
        referrer: 'Instagram App',
        source_type: 'social_media',
        source_detail: 'Instagram Mobile App'
      };
    }
    
    // App Facebook
    if (userAgent.includes('FBAN') || userAgent.includes('FBAV')) {
      return {
        referrer: 'Facebook App',
        source_type: 'social_media',
        source_detail: 'Facebook Mobile App'
      };
    }
    
    // WhatsApp
    if (userAgent.includes('WhatsApp')) {
      return {
        referrer: 'WhatsApp App',
        source_type: 'messaging',
        source_detail: 'WhatsApp Mobile App'
      };
    }
    
    // Telegram
    if (userAgent.includes('Telegram')) {
      return {
        referrer: 'Telegram App',
        source_type: 'messaging',
        source_detail: 'Telegram Mobile App'
      };
    }
    
    // TikTok
    if (userAgent.includes('TikTok')) {
      return {
        referrer: 'TikTok App',
        source_type: 'social_media',
        source_detail: 'TikTok Mobile App'
      };
    }
    
    // Twitter
    if (userAgent.includes('Twitter')) {
      return {
        referrer: 'Twitter App',
        source_type: 'social_media',
        source_detail: 'Twitter Mobile App'
      };
    }
    
    // LinkedIn
    if (userAgent.includes('LinkedInApp')) {
      return {
        referrer: 'LinkedIn App',
        source_type: 'social_media',
        source_detail: 'LinkedIn Mobile App'
      };
    }
  }
  
  // 5. FALLBACK - Click diretto
  return {
    referrer: 'Direct',
    source_type: 'direct',
    source_detail: 'Direct Access'
  };
}
export async function recordClick(request: NextRequest, linkId: number): Promise<Click> {
  try {
    // Usa il nuovo sistema migliorato per raccolta dati più affidabile
    const { getReliableGeoInfo, validateAndCleanGeoData } = await import('./improved-click-tracking');
    
    let geoLocation: GeoLocation;
    let dataQualityInfo = '';
    
    try {
      // Raccogli dati geografici e IP con il sistema migliorato
      const improvedData = await getReliableGeoInfo(request);
      const validatedData = validateAndCleanGeoData(improvedData);
      
      // Converti al formato esistente
      geoLocation = {
        country: validatedData.country,
        region: validatedData.region,
        city: validatedData.city
      };
      
      // Info per logging
      dataQualityInfo = ` (Confidence: ${validatedData.confidence}%, Sources: ${validatedData.sources.join(', ')}, Warnings: ${validatedData.warnings.join(', ') || 'none'})`;
      
      console.log(`🔍 Sistema migliorato attivo - IP: ${validatedData.ip.substring(0, 8)}...${dataQualityInfo}`);
      
    } catch (error) {
      console.warn('⚠️ Errore nel sistema migliorato, fallback al sistema legacy:', error);
      
      // Fallback al sistema legacy
      try {
        geoLocation = await getGeoLocation(request);
        dataQualityInfo = ' (Legacy system)';
      } catch (geoError) {
        console.warn('⚠️ Errore anche nel sistema legacy, uso valori di fallback:', geoError);
        geoLocation = {
          country: 'Unknown',
          region: 'Unknown',
          city: 'Unknown'
        };
        dataQualityInfo = ' (Emergency fallback)';
      }
    }
    
    // Ottieni informazioni del dispositivo (manteniamo sistema esistente)
    const deviceInfo = getDeviceInfo(request);
    
    // Analizza il referrer con il nuovo sistema avanzato
    const referrerInfo = analyzeReferrerSource(request);
    
    // Ottieni IP con il sistema migliorato se possibile
    let ip_address = 'unknown';
    try {
      const { getReliableIP } = await import('./improved-click-tracking');
      const ipInfo = getReliableIP(request);
      ip_address = ipInfo.ip;
    } catch (error) {
      // Fallback al sistema legacy per IP
      const forwardedFor = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      ip_address = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
    }
    
    const user_agent = request.headers.get('user-agent') || '';
    
    // Crea fingerprint per compatibilità con sistema esistente
    const fingerprint: ClickFingerprint = {
      link_id: linkId,
      country: geoLocation.country,
      region: geoLocation.region,
      city: geoLocation.city,
      ip_address,
      language_device: deviceInfo.language_device,
      timezone_device: deviceInfo.timezone_device
    };
    
    const click_fingerprint_hash = generateClickFingerprintHash(fingerprint);
    
    // Normalizza i dati geografici prima del salvataggio
    const normalizedCountry = normalizeCountryName(geoLocation.country || 'Unknown');
    const normalizedRegion = normalizeRegionName(geoLocation.region || 'Unknown', geoLocation.country || 'Unknown');
    const normalizedCity = normalizeCityName(geoLocation.city || 'Unknown');
    
    // Converti IP localhost in formato valido per PostgreSQL inet
    const validIP = ip_address === 'localhost' || ip_address === 'unknown' 
      ? '127.0.0.1' 
      : ip_address;
    
    // Log delle informazioni rilevate per debug
    console.log(`📊 Click rilevato - Browser: ${deviceInfo.browser_name}, OS: ${deviceInfo.os_name}, Paese: ${normalizedCountry}, Città: ${normalizedCity}, IP: ${validIP.substring(0, 8)}..., Fonte: ${referrerInfo.referrer} (${referrerInfo.source_type})${dataQualityInfo}`);
    
    // Inserisci il click nel database con i dati normalizzati (NESSUNA MODIFICA AL DB)
    const result = await sql`
      INSERT INTO clicks (
        link_id, country, region, city, referrer, browser_name, 
        language_device, device_type, os_name, ip_address, user_agent, 
        timezone_device, click_fingerprint_hash, source_type, source_detail
      ) VALUES (
        ${linkId}, ${normalizedCountry}, ${normalizedRegion}, 
        ${normalizedCity}, ${referrerInfo.referrer}, ${deviceInfo.browser_name},
        ${deviceInfo.language_device}, ${deviceInfo.device_type}, 
        ${deviceInfo.os_name}, ${validIP}, ${user_agent},
        ${deviceInfo.timezone_device}, ${click_fingerprint_hash},
        ${referrerInfo.source_type}, ${referrerInfo.source_detail}
      ) RETURNING *
    `;
    
    const click = result.rows[0] as Click;
    
    return click;
    
  } catch (error) {
    console.error('❌ Errore critico nella registrazione del click:', error);
    throw error;
  }
}

/**
 * Ottiene le statistiche di un link
 * @param linkId ID del link
 * @param days Numero di giorni da considerare (opzionale se si usano startDate/endDate)
 * @param startDate Data di inizio specifica (opzionale)
 * @param endDate Data di fine specifica (opzionale)
 */
export async function getLinkAnalytics(linkId: number, days: number = 30, startDate?: string, endDate?: string) {
  try {
    let startDateISO: string;
    let endDateISO: string;
    
    if (startDate && endDate) {
      // Usa le date personalizzate
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // Inizio della giornata di inizio
      startDateISO = start.toISOString();
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Fine della giornata di fine
      endDateISO = end.toISOString();
    } else {
      // Calcola la data di inizio basata sui giorni
      const start = new Date();
      start.setDate(start.getDate() - days);
      start.setHours(0, 0, 0, 0); // Inizio della giornata di inizio
      startDateISO = start.toISOString();
      
      // Per la data di fine, usa la fine della giornata corrente
      const end = new Date();
      end.setHours(23, 59, 59, 999); // Fine della giornata corrente
      endDateISO = end.toISOString();
    }
    
    const [totalClicks, uniqueClicks, countries, cities, browsers, devices, operatingSystems, referrers, languages, dailyClicks] = await Promise.all([
      // Total clicks
      sql`SELECT COUNT(*) as total FROM clicks WHERE link_id = ${linkId} AND clicked_at_rome >= ${startDateISO} AND clicked_at_rome <= ${endDateISO}`,
      
      // Unique clicks (migliorato per gestire fingerprint mancanti)
      sql`SELECT COUNT(DISTINCT COALESCE(click_fingerprint_hash, ip_address::text, user_agent)) as unique FROM clicks WHERE link_id = ${linkId} AND clicked_at_rome >= ${startDateISO} AND clicked_at_rome <= ${endDateISO}`,
      
      // Paesi (con click unici) - Query migliorata per catturare tutti i paesi
      sql`
        SELECT 
          COALESCE(NULLIF(country, ''), 'Unknown') as country,
          COUNT(*) as count,
          COUNT(DISTINCT COALESCE(click_fingerprint_hash, ip_address::text, user_agent)) as unique_count
        FROM clicks 
        WHERE link_id = ${linkId} 
          AND clicked_at_rome >= ${startDateISO} 
          AND clicked_at_rome <= ${endDateISO}
        GROUP BY COALESCE(NULLIF(country, ''), 'Unknown')
        ORDER BY count DESC 
        LIMIT 15
      `,
      
      // Città (con click unici) - Query completamente rivista per usare la normalizzazione
      sql`
        WITH city_mapping AS (
          SELECT 'Los%20Lunas' as encoded, 'Los Lunas' as decoded UNION ALL
          SELECT 'S%C3%A3o%20Paulo', 'São Paulo' UNION ALL
          SELECT 'Los%20Angeles', 'Los Angeles' UNION ALL
          SELECT 'Frankfurt%20am%20Main', 'Frankfurt am Main' UNION ALL
          SELECT 'Council%20Bluffs', 'Council Bluffs' UNION ALL
          SELECT 'Lule%C3%A5', 'Luleå' UNION ALL
          SELECT 'San%20Jose', 'San Jose' UNION ALL
          SELECT 'Santa%20Clara', 'Santa Clara'
        ),
        processed_clicks AS (
          SELECT 
            id, 
            link_id,
            clicked_at_rome,
            -- Completa normalizzazione di tutte le città usando la tabella di mappatura
            CASE 
              WHEN city IS NULL OR city = '' THEN 'Unknown'
              WHEN EXISTS (SELECT 1 FROM city_mapping WHERE encoded = city) THEN 
                (SELECT decoded FROM city_mapping WHERE encoded = city)
              WHEN city LIKE '%\\%%' THEN 
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                  city,
                  '%20', ' '),
                  '%C3%A5', 'å'),
                  '%C3%A4', 'ä'),
                  '%C3%B6', 'ö'),
                  '%C3%A9', 'é'),
                  '%C3%A8', 'è'),
                  '%C3%A0', 'à'),
                  '%C3%B1', 'ñ'),
                  '%C3%A7', 'ç'),
                  '%C3%BC', 'ü')
              ELSE city
            END as normalized_city,
            click_fingerprint_hash,
            ip_address,
            user_agent
          FROM clicks 
          WHERE link_id = ${linkId} 
            AND clicked_at_rome >= ${startDateISO} 
            AND clicked_at_rome <= ${endDateISO}
        )
        SELECT 
          normalized_city as city,
          COUNT(*) as count,
          COUNT(DISTINCT COALESCE(click_fingerprint_hash, ip_address::text, user_agent)) as unique_count
        FROM processed_clicks
        GROUP BY normalized_city
        ORDER BY count DESC 
        LIMIT 100  -- Aumentato il limite per includere tutte le città
      `,
      
      // Browser (normalizzati con click unici) - Query completamente rivista
      sql`
        WITH normalized_browsers AS (
          SELECT 
            link_id,
            clicked_at_rome,
            CASE 
              -- Chrome e varianti
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%chrome%' THEN 'Chrome'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%chromium%' THEN 'Chrome'
              
              -- Firefox e varianti
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%firefox%' THEN 'Firefox'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%mozilla%' AND LOWER(COALESCE(browser_name, '')) NOT LIKE '%seamonkey%' THEN 'Firefox'
              
              -- Safari e varianti
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%safari%' AND LOWER(COALESCE(browser_name, '')) NOT LIKE '%chrome%' THEN 'Safari'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%apple%' AND LOWER(COALESCE(browser_name, '')) LIKE '%webkit%' THEN 'Safari'
              
              -- Edge e varianti
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%edge%' THEN 'Microsoft Edge'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%edg/%' THEN 'Microsoft Edge'
              
              -- Opera e varianti
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%opera%' OR LOWER(COALESCE(browser_name, '')) LIKE '%opr/%' THEN 'Opera'
              
              -- Browser specifici per mobile e altri browser
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%samsung%' THEN 'Samsung Internet'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%brave%' THEN 'Brave'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%vivaldi%' THEN 'Vivaldi'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%yandex%' THEN 'Yandex Browser'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%ucbrowser%' THEN 'UC Browser'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%seamonkey%' THEN 'SeaMonkey'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%tor%' THEN 'Tor Browser'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%whatsapp%' THEN 'WhatsApp'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%instagram%' THEN 'Instagram'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%facebook%' THEN 'Facebook'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%snapchat%' THEN 'Snapchat'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%telegram%' THEN 'Telegram'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%tiktok%' THEN 'TikTok'
              WHEN LOWER(COALESCE(browser_name, '')) LIKE '%ie%' OR LOWER(COALESCE(browser_name, '')) LIKE '%internet explorer%' THEN 'Internet Explorer'
              
              -- Fallback
              WHEN browser_name IS NULL OR browser_name = '' THEN 'Sconosciuto'
              ELSE 
                -- Rimuovi numeri di versione per altri browser
                REGEXP_REPLACE(browser_name, ' [0-9.]+$', '')
            END as normalized_browser,
            click_fingerprint_hash,
            ip_address,
            user_agent
          FROM clicks 
          WHERE link_id = ${linkId} 
            AND clicked_at_rome >= ${startDateISO} 
            AND clicked_at_rome <= ${endDateISO}
        )
        SELECT 
          normalized_browser as browser,
          COUNT(*) as count,
          COUNT(DISTINCT COALESCE(click_fingerprint_hash, ip_address::text, user_agent)) as unique_count
        FROM normalized_browsers
        GROUP BY normalized_browser
        ORDER BY count DESC 
        LIMIT 15
      `,
      
      // Dispositivi (normalizzati con click unici) - Query migliorata
      sql`
        SELECT 
          CASE 
            WHEN LOWER(COALESCE(device_type, '')) LIKE '%mobile%' OR LOWER(COALESCE(device_type, '')) LIKE '%phone%' THEN 'Mobile'
            WHEN LOWER(COALESCE(device_type, '')) LIKE '%tablet%' THEN 'Tablet'
            WHEN LOWER(COALESCE(device_type, '')) LIKE '%desktop%' OR LOWER(COALESCE(device_type, '')) LIKE '%computer%' THEN 'Desktop'
            WHEN LOWER(COALESCE(device_type, '')) LIKE '%tv%' OR LOWER(COALESCE(device_type, '')) LIKE '%smart%' THEN 'Smart TV'
            ELSE COALESCE(NULLIF(device_type, ''), 'Sconosciuto')
          END as device, 
          COUNT(*) as count,
          COUNT(DISTINCT COALESCE(click_fingerprint_hash, ip_address::text, user_agent)) as unique_count
        FROM clicks 
        WHERE link_id = ${linkId} 
          AND clicked_at_rome >= ${startDateISO} 
          AND clicked_at_rome <= ${endDateISO}
        GROUP BY 
          CASE 
            WHEN LOWER(COALESCE(device_type, '')) LIKE '%mobile%' OR LOWER(COALESCE(device_type, '')) LIKE '%phone%' THEN 'Mobile'
            WHEN LOWER(COALESCE(device_type, '')) LIKE '%tablet%' THEN 'Tablet'
            WHEN LOWER(COALESCE(device_type, '')) LIKE '%desktop%' OR LOWER(COALESCE(device_type, '')) LIKE '%computer%' THEN 'Desktop'
            WHEN LOWER(COALESCE(device_type, '')) LIKE '%tv%' OR LOWER(COALESCE(device_type, '')) LIKE '%smart%' THEN 'Smart TV'
            ELSE COALESCE(NULLIF(device_type, ''), 'Sconosciuto')
          END
        ORDER BY count DESC 
        LIMIT 15
      `,
      
      // Sistemi operativi (normalizzati con click unici) - Query migliorata
      sql`
        SELECT 
          CASE 
            WHEN LOWER(COALESCE(os_name, '')) LIKE '%windows%' THEN 'Windows'
            WHEN LOWER(COALESCE(os_name, '')) LIKE '%mac%' OR LOWER(COALESCE(os_name, '')) LIKE '%darwin%' THEN 'macOS'
            WHEN LOWER(COALESCE(os_name, '')) LIKE '%linux%' THEN 'Linux'
            WHEN LOWER(COALESCE(os_name, '')) LIKE '%android%' THEN 'Android'
            WHEN LOWER(COALESCE(os_name, '')) LIKE '%ios%' OR LOWER(COALESCE(os_name, '')) LIKE '%iphone%' THEN 'iOS'
            WHEN LOWER(COALESCE(os_name, '')) LIKE '%ubuntu%' THEN 'Ubuntu'
            WHEN LOWER(COALESCE(os_name, '')) LIKE '%chrome%' THEN 'Chrome OS'
            ELSE COALESCE(NULLIF(os_name, ''), 'Sconosciuto')
          END as os, 
          COUNT(*) as count,
          COUNT(DISTINCT COALESCE(click_fingerprint_hash, ip_address::text, user_agent)) as unique_count
        FROM clicks 
        WHERE link_id = ${linkId} 
          AND clicked_at_rome >= ${startDateISO} 
          AND clicked_at_rome <= ${endDateISO}
        GROUP BY 
          CASE 
            WHEN LOWER(COALESCE(os_name, '')) LIKE '%windows%' THEN 'Windows'
            WHEN LOWER(COALESCE(os_name, '')) LIKE '%mac%' OR LOWER(COALESCE(os_name, '')) LIKE '%darwin%' THEN 'macOS'
            WHEN LOWER(COALESCE(os_name, '')) LIKE '%linux%' THEN 'Linux'
            WHEN LOWER(COALESCE(os_name, '')) LIKE '%android%' THEN 'Android'
            WHEN LOWER(COALESCE(os_name, '')) LIKE '%ios%' OR LOWER(COALESCE(os_name, '')) LIKE '%iphone%' THEN 'iOS'
            WHEN LOWER(COALESCE(os_name, '')) LIKE '%ubuntu%' THEN 'Ubuntu'
            WHEN LOWER(COALESCE(os_name, '')) LIKE '%chrome%' THEN 'Chrome OS'
            ELSE COALESCE(NULLIF(os_name, ''), 'Sconosciuto')
          END
        ORDER BY count DESC 
        LIMIT 15
      `,
      
      // Referrer (con click unici e normalizzazione) - Query migliorata
      sql`
        SELECT 
          CASE 
            WHEN COALESCE(referrer, '') LIKE '%qr%code%' OR COALESCE(referrer, '') LIKE '%qr%20code%' THEN 'QR Code'
            WHEN COALESCE(referrer, '') LIKE '%bing%search%' OR COALESCE(referrer, '') LIKE '%bing%20search%' THEN 'Bing'
            WHEN COALESCE(referrer, '') LIKE '%google%search%' OR COALESCE(referrer, '') LIKE '%google%20search%' THEN 'Google'
            WHEN COALESCE(referrer, '') LIKE '%facebook%' THEN 'Facebook'
            WHEN COALESCE(referrer, '') LIKE '%instagram%' THEN 'Instagram'
            WHEN COALESCE(referrer, '') LIKE '%twitter%' OR COALESCE(referrer, '') LIKE '%x.com%' THEN 'Twitter/X'
            WHEN COALESCE(referrer, '') LIKE '%linkedin%' THEN 'LinkedIn'
            WHEN COALESCE(referrer, '') LIKE '%youtube%' THEN 'YouTube'
            WHEN COALESCE(referrer, '') LIKE '%whatsapp%' THEN 'WhatsApp'
            WHEN COALESCE(referrer, '') LIKE '%telegram%' THEN 'Telegram'
            WHEN COALESCE(referrer, '') LIKE '%tiktok%' THEN 'TikTok'
            WHEN COALESCE(referrer, '') LIKE '%duckduckgo%' THEN 'DuckDuckGo'
            WHEN COALESCE(referrer, '') LIKE '%yahoo%' THEN 'Yahoo'
            WHEN COALESCE(referrer, '') LIKE '%reddit%' THEN 'Reddit'
            WHEN COALESCE(referrer, '') LIKE '%pinterest%' THEN 'Pinterest'
            ELSE COALESCE(NULLIF(referrer, ''), 'Accesso diretto')
          END as referrer, 
          COUNT(*) as count,
          COUNT(DISTINCT COALESCE(click_fingerprint_hash, ip_address::text, user_agent)) as unique_count
        FROM clicks 
        WHERE link_id = ${linkId} 
          AND clicked_at_rome >= ${startDateISO} 
          AND clicked_at_rome <= ${endDateISO}
        GROUP BY 
          CASE 
            WHEN COALESCE(referrer, '') LIKE '%qr%code%' OR COALESCE(referrer, '') LIKE '%qr%20code%' THEN 'QR Code'
            WHEN COALESCE(referrer, '') LIKE '%bing%search%' OR COALESCE(referrer, '') LIKE '%bing%20search%' THEN 'Bing'
            WHEN COALESCE(referrer, '') LIKE '%google%search%' OR COALESCE(referrer, '') LIKE '%google%20search%' THEN 'Google'
            WHEN COALESCE(referrer, '') LIKE '%facebook%' THEN 'Facebook'
            WHEN COALESCE(referrer, '') LIKE '%instagram%' THEN 'Instagram'
            WHEN COALESCE(referrer, '') LIKE '%twitter%' OR COALESCE(referrer, '') LIKE '%x.com%' THEN 'Twitter/X'
            WHEN COALESCE(referrer, '') LIKE '%linkedin%' THEN 'LinkedIn'
            WHEN COALESCE(referrer, '') LIKE '%youtube%' THEN 'YouTube'
            WHEN COALESCE(referrer, '') LIKE '%whatsapp%' THEN 'WhatsApp'
            WHEN COALESCE(referrer, '') LIKE '%telegram%' THEN 'Telegram'
            WHEN COALESCE(referrer, '') LIKE '%tiktok%' THEN 'TikTok'
            WHEN COALESCE(referrer, '') LIKE '%duckduckgo%' THEN 'DuckDuckGo'
            WHEN COALESCE(referrer, '') LIKE '%yahoo%' THEN 'Yahoo'
            WHEN COALESCE(referrer, '') LIKE '%reddit%' THEN 'Reddit'
            WHEN COALESCE(referrer, '') LIKE '%pinterest%' THEN 'Pinterest'
            ELSE COALESCE(NULLIF(referrer, ''), 'Accesso diretto')
          END
        ORDER BY count DESC 
        LIMIT 15
      `,
      
      // Lingue (con click unici) - Query migliorata
      sql`
        SELECT 
          COALESCE(NULLIF(language_device, ''), 'Unknown') as language,
          COUNT(*) as count,
          COUNT(DISTINCT COALESCE(click_fingerprint_hash, ip_address::text, user_agent)) as unique_count
        FROM clicks 
        WHERE link_id = ${linkId} 
          AND clicked_at_rome >= ${startDateISO} 
          AND clicked_at_rome <= ${endDateISO}
        GROUP BY COALESCE(NULLIF(language_device, ''), 'Unknown')
        ORDER BY count DESC 
        LIMIT 15
      `,
      
      // Click giornalieri
      sql`
        SELECT 
          DATE(clicked_at_rome) as date,
          COUNT(*) as clicks
        FROM clicks 
        WHERE link_id = ${linkId} AND clicked_at_rome >= ${startDateISO} AND clicked_at_rome <= ${endDateISO}
        GROUP BY DATE(clicked_at_rome) 
        ORDER BY date DESC
        LIMIT 30
      `
    ]);
    
    return {
      link_id: linkId,
      total_clicks: parseInt(totalClicks.rows[0].total),
      unique_clicks: parseInt(uniqueClicks.rows[0].unique),
      countries: countries.rows,
      cities: cities.rows,
      browsers: browsers.rows,
      devices: devices.rows,
      operating_systems: operatingSystems.rows,
      referrers: referrers.rows,
      languages: languages.rows,
      daily_clicks: dailyClicks.rows
    };
  } catch (error) {
    console.error('Errore in getLinkAnalytics:', error);
    // Restituisci dati vuoti in caso di errore
    return {
      link_id: linkId,
      total_clicks: 0,
      unique_clicks: 0,
      countries: [],
      cities: [],
      browsers: [],
      devices: [],
      operating_systems: [],
      referrers: [],
      languages: [],
      daily_clicks: []
    };
  }
}
