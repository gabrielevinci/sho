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
 * Estrae informazioni geografiche dall'IP utilizzando un servizio di geolocalizzazione
 */
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
        console.log(`🌍 Geolocalizzazione IP ${ip}: ${data.city}, ${data.region}, ${data.country_name}`);
        return {
          country: data.country_name || 'Unknown',
          region: data.region || 'Unknown',
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
 * Registra un click nel database
 */
export async function recordClick(request: NextRequest, linkId: number): Promise<Click> {
  try {
    // Ottieni informazioni geografiche con fallback in caso di errore
    let geoLocation: GeoLocation;
    try {
      geoLocation = await getGeoLocation(request);
    } catch (error) {
      console.warn('⚠️ Errore nella geolocalizzazione, uso valori di fallback:', error);
      geoLocation = {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown'
      };
    }
    
    // Ottieni informazioni del dispositivo
    const deviceInfo = getDeviceInfo(request);
    
    // Ottieni IP e altri dati
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip_address = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
    const user_agent = request.headers.get('user-agent') || '';
    const referrer = request.headers.get('referer') || 'Direct';
    
    // Crea fingerprint
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
    
    // Log delle informazioni rilevate per debug
    console.log(`📊 Click rilevato - Browser: ${deviceInfo.browser_name}, OS: ${deviceInfo.os_name}, Paese: ${geoLocation.country}, Città: ${geoLocation.city}`);
    
    // Inserisci il click nel database
    const result = await sql`
      INSERT INTO clicks (
        link_id, country, region, city, referrer, browser_name, 
        language_device, device_type, os_name, ip_address, user_agent, 
        timezone_device, click_fingerprint_hash
      ) VALUES (
        ${linkId}, ${geoLocation.country}, ${geoLocation.region}, 
        ${geoLocation.city}, ${referrer}, ${deviceInfo.browser_name},
        ${deviceInfo.language_device}, ${deviceInfo.device_type}, 
        ${deviceInfo.os_name}, ${ip_address}, ${user_agent},
        ${deviceInfo.timezone_device}, ${click_fingerprint_hash}
      ) RETURNING *
    `;
    
    return result.rows[0] as Click;
    
  } catch (error) {
    console.error('❌ Errore critico nella registrazione del click:', error);
    throw error;
  }
}

/**
 * Ottiene le statistiche di un link
 */
export async function getLinkAnalytics(linkId: number, days: number = 30) {
  try {
    // Calcola la data di inizio basata sui giorni
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateISO = startDate.toISOString();
    
    const [totalClicks, uniqueClicks, countries, browsers, devices, operatingSystems, referrers, dailyClicks] = await Promise.all([
      // Total clicks
      sql`SELECT COUNT(*) as total FROM clicks WHERE link_id = ${linkId} AND clicked_at_rome >= ${startDateISO}`,
      
      // Unique clicks (basato su fingerprint hash)
      sql`SELECT COUNT(DISTINCT click_fingerprint_hash) as unique FROM clicks WHERE link_id = ${linkId} AND clicked_at_rome >= ${startDateISO}`,
      
      // Paesi
      sql`
        SELECT country, COUNT(*) as count 
        FROM clicks 
        WHERE link_id = ${linkId} AND clicked_at_rome >= ${startDateISO} AND country IS NOT NULL
        GROUP BY country 
        ORDER BY count DESC 
        LIMIT 10
      `,
      
      // Browser
      sql`
        SELECT browser_name as browser, COUNT(*) as count 
        FROM clicks 
        WHERE link_id = ${linkId} AND clicked_at_rome >= ${startDateISO} AND browser_name IS NOT NULL
        GROUP BY browser_name 
        ORDER BY count DESC 
        LIMIT 10
      `,
      
      // Dispositivi
      sql`
        SELECT device_type as device, COUNT(*) as count 
        FROM clicks 
        WHERE link_id = ${linkId} AND clicked_at_rome >= ${startDateISO} AND device_type IS NOT NULL
        GROUP BY device_type 
        ORDER BY count DESC 
        LIMIT 10
      `,
      
      // Sistemi operativi
      sql`
        SELECT os_name as os, COUNT(*) as count 
        FROM clicks 
        WHERE link_id = ${linkId} AND clicked_at_rome >= ${startDateISO} AND os_name IS NOT NULL
        GROUP BY os_name 
        ORDER BY count DESC 
        LIMIT 10
      `,
      
      // Referrer
      sql`
        SELECT referrer, COUNT(*) as count 
        FROM clicks 
        WHERE link_id = ${linkId} AND clicked_at_rome >= ${startDateISO} AND referrer IS NOT NULL
        GROUP BY referrer 
        ORDER BY count DESC 
        LIMIT 10
      `,
      
      // Click giornalieri
      sql`
        SELECT 
          DATE(clicked_at_rome) as date,
          COUNT(*) as clicks
        FROM clicks 
        WHERE link_id = ${linkId} AND clicked_at_rome >= ${startDateISO}
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
      browsers: browsers.rows,
      devices: devices.rows,
      operating_systems: operatingSystems.rows,
      referrers: referrers.rows,
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
      browsers: [],
      devices: [],
      operating_systems: [],
      referrers: [],
      daily_clicks: []
    };
  }
}
