/**
 * Utility per la gestione delle tabelle links e clicks
 */

import { sql } from '@vercel/postgres';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
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
 * Estrae informazioni geografiche dall'IP (simulato per ora)
 */
export async function getGeoLocation(request: NextRequest): Promise<GeoLocation> {
  // In un ambiente reale, qui useresti un servizio come MaxMind GeoIP2
  // Per ora restituiamo dati di default
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || '127.0.0.1';
  
  // Simulazione basata sull'IP (sostituire con vera geolocalizzazione)
  if (ip && (ip.startsWith('192.168') || ip === '::1' || ip === '127.0.0.1')) {
    return {
      country: 'Italy',
      region: 'Lazio',
      city: 'Rome'
    };
  }
  
  return {
    country: 'Unknown',
    region: 'Unknown', 
    city: 'Unknown'
  };
}

/**
 * Estrae informazioni del dispositivo dal user agent
 */
export function getDeviceInfo(request: NextRequest): DeviceInfo {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  
  // Rilevamento browser
  let browser_name = 'Unknown';
  if (userAgent.includes('Chrome')) browser_name = 'Chrome';
  else if (userAgent.includes('Firefox')) browser_name = 'Firefox';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser_name = 'Safari';
  else if (userAgent.includes('Edge')) browser_name = 'Edge';
  else if (userAgent.includes('Opera')) browser_name = 'Opera';
  
  // Rilevamento dispositivo
  let device_type = 'Desktop';
  if (userAgent.includes('Mobile')) device_type = 'Mobile';
  else if (userAgent.includes('Tablet')) device_type = 'Tablet';
  
  // Rilevamento sistema operativo
  let os_name = 'Unknown';
  if (userAgent.includes('Windows')) os_name = 'Windows';
  else if (userAgent.includes('Mac')) os_name = 'macOS';
  else if (userAgent.includes('Linux')) os_name = 'Linux';
  else if (userAgent.includes('Android')) os_name = 'Android';
  else if (userAgent.includes('iOS')) os_name = 'iOS';
  else if (userAgent.includes('Ubuntu')) os_name = 'Ubuntu';
  
  // Estrazione lingua
  const language_device = acceptLanguage.split(',')[0]?.split('-')[0] || 'unknown';
  
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
  // Ottieni informazioni geografiche
  const geoLocation = await getGeoLocation(request);
  
  // Ottieni informazioni del dispositivo
  const deviceInfo = getDeviceInfo(request);
  
  // Ottieni IP e altri dati
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip_address = forwardedFor?.split(',')[0] || realIp || 'unknown';
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
