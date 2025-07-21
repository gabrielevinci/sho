import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { UAParser } from 'ua-parser-js';
import { createHash } from 'crypto';
import { normalizeCountryName, normalizeRegionName } from '@/lib/database-helpers';

// Tipo per il risultato della query al DB
type LinkFromDb = {
  id: number;
  original_url: string;
  title?: string;
}

// Funzione helper per generare un fingerprint server-side avanzato
function generateAdvancedServerFingerprint(request: NextRequest): {
  fingerprint: string;
  components: Record<string, string>;
} {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  const accept = request.headers.get('accept') || '';
  const dnt = request.headers.get('dnt') || '';
  const upgradeInsecureRequests = request.headers.get('upgrade-insecure-requests') || '';
  const secFetchSite = request.headers.get('sec-fetch-site') || '';
  const secFetchMode = request.headers.get('sec-fetch-mode') || '';
  const secFetchUser = request.headers.get('sec-fetch-user') || '';
  const secFetchDest = request.headers.get('sec-fetch-dest') || '';
  const cacheControl = request.headers.get('cache-control') || '';
  
  // Parse user agent per informazioni dettagliate
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();
  const cpu = parser.getCPU();

  // Ottieni l'IP e le informazioni geografiche
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
  const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
  const region = request.headers.get('x-vercel-ip-country-region') || 'Unknown';
  const city = request.headers.get('x-vercel-ip-city') || 'Unknown';
  const timezone = request.headers.get('x-vercel-ip-timezone') || 'Unknown';

  // Crea un hash dell'IP per privacy
  const ipHash = createHash('sha256').update(ip).digest('hex').substring(0, 12);

  // Componenti del fingerprint
  const components = {
    ipHash,
    browserName: browser.name || 'Unknown',
    browserVersion: browser.version || 'Unknown',
    osName: os.name || 'Unknown',
    osVersion: os.version || 'Unknown',
    deviceType: device.type || 'desktop',
    deviceVendor: device.vendor || 'Unknown',
    deviceModel: device.model || 'Unknown',
    cpuArchitecture: cpu.architecture || 'Unknown',
    language: acceptLanguage.substring(0, 20),
    encoding: acceptEncoding.substring(0, 50),
    accept: accept.substring(0, 100),
    dnt,
    upgradeInsecureRequests,
    secFetchSite,
    secFetchMode,
    secFetchUser,
    secFetchDest,
    cacheControl: cacheControl.substring(0, 50),
    country,
    region,
    city,
    timezone
  };

  // Genera il fingerprint finale combinando tutti i componenti
  const fingerprintData = Object.values(components).join('|');
  const fingerprint = createHash('sha256').update(fingerprintData).digest('hex').substring(0, 24);

  return { fingerprint, components };
}

// Funzione per registrare il click basic (per compatibilità)
async function recordBasicClick(linkId: number, request: NextRequest, fingerprintInfo: ReturnType<typeof generateAdvancedServerFingerprint>) {
  let referrer = request.headers.get('referer') || 'Direct';
  const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
  const region = request.headers.get('x-vercel-ip-country-region') || 'Unknown';

  // Normalizza i dati geografici
  const normalizedCountry = normalizeCountryName(country);
  const normalizedRegion = normalizeRegionName(region, country);

  // Controlla se il click proviene da un QR code
  const url = new URL(request.url);
  const isQrCode = url.searchParams.get('qr') === '1';
  
  if (isQrCode) {
    referrer = 'QR Code';
  }

  try {
    // Controlla se questo è un click unico (basato sul fingerprint server)
    const uniqueCheck = await sql`
      SELECT COUNT(*) as count FROM clicks 
      WHERE link_id = ${linkId} AND user_fingerprint = ${fingerprintInfo.fingerprint}
    `;
    
    const isUniqueVisit = uniqueCheck.rows[0].count === 0;
    
    // Registra il click nella tabella esistente
    await sql`
      INSERT INTO clicks 
        (link_id, country, region, referrer, browser_name, device_type, user_fingerprint, clicked_at_rome) 
      VALUES (
        ${linkId}, 
        ${normalizedCountry}, 
        ${normalizedRegion},
        ${referrer}, 
        ${fingerprintInfo.components.browserName}, 
        ${fingerprintInfo.components.deviceType}, 
        ${fingerprintInfo.fingerprint}, 
        NOW() AT TIME ZONE 'Europe/Rome'
      )
    `;
    
    // Aggiorna i contatori del link
    if (isUniqueVisit) {
      await sql`
        UPDATE links SET 
          click_count = click_count + 1,
          unique_click_count = unique_click_count + 1 
        WHERE id = ${linkId}
      `;
    } else {
      await sql`
        UPDATE links SET click_count = click_count + 1 WHERE id = ${linkId}
      `;
    }
  } catch (error) {
    console.error("Failed to record basic click:", error);
  }
}

// Funzione per salvare fingerprint server-side avanzato in background
async function saveAdvancedFingerprint(linkId: number, request: NextRequest, fingerprintInfo: ReturnType<typeof generateAdvancedServerFingerprint>) {
  try {
    const realIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
    const region = request.headers.get('x-vercel-ip-country-region') || 'Unknown';
    const city = request.headers.get('x-vercel-ip-city') || 'Unknown';
    const referer = request.headers.get('referer') || 'Direct';

    // Controlla se abbiamo già registrato questo fingerprint per questo link
    const existingFingerprint = await sql`
      SELECT id FROM advanced_fingerprints 
      WHERE link_id = ${linkId} AND fingerprint_hash = ${fingerprintInfo.fingerprint}
    `;

    if (existingFingerprint.rows.length > 0) {
      // Aggiorna il record esistente
      await sql`
        UPDATE advanced_fingerprints SET
          last_seen = NOW() AT TIME ZONE 'Europe/Rome',
          visit_count = visit_count + 1
        WHERE id = ${existingFingerprint.rows[0].id}
      `;
    } else {
      // Inserisci nuovo fingerprint con i dati server-side disponibili
      await sql`
        INSERT INTO advanced_fingerprints (
          link_id,
          fingerprint_hash,
          user_agent,
          language,
          platform,
          country,
          region,
          city,
          referer,
          ip_address,
          visit_count,
          first_seen,
          last_seen
        ) VALUES (
          ${linkId},
          ${fingerprintInfo.fingerprint},
          ${fingerprintInfo.components.browserName} ${fingerprintInfo.components.browserVersion},
          ${fingerprintInfo.components.language},
          ${fingerprintInfo.components.osName} ${fingerprintInfo.components.osVersion},
          ${country},
          ${region},
          ${city},
          ${referer},
          ${realIp},
          1,
          NOW() AT TIME ZONE 'Europe/Rome',
          NOW() AT TIME ZONE 'Europe/Rome'
        )
      `;
    }
  } catch (error) {
    console.error("Failed to save advanced fingerprint:", error);
  }
}

export async function GET(request: NextRequest) {
  // Estrai lo shortCode dall'URL
  const url = new URL(request.url);
  const shortCode = url.pathname.slice(1);

  if (!shortCode) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  try {
    // Trova il link nel database
    const result = await sql<LinkFromDb>`
      SELECT id, original_url, title FROM links WHERE short_code = ${shortCode}
    `;
    const link = result.rows[0];

    if (!link) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Genera fingerprint server-side avanzato
    const fingerprintInfo = generateAdvancedServerFingerprint(request);
    
    // Controlla se è un bot o crawler (skip fingerprinting per bot)
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = /bot|crawl|spider|facebook|twitter|linkedinbot|whatsapp/i.test(userAgent);
    
    // Per tutti (bot e utenti reali): registra il click basic per compatibilità
    await recordBasicClick(link.id, request, fingerprintInfo);
    
    // Solo per utenti reali: salva fingerprint avanzato in background
    if (!isBot) {
      // Non await - lascia che avvenga in background
      saveAdvancedFingerprint(link.id, request, fingerprintInfo).catch(console.error);
    }

    // Redirect immediato - NESSUNA PAGINA INTERMEDIA
    return NextResponse.redirect(new URL(link.original_url));

  } catch (error) {
    console.error('Redirect Error:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
