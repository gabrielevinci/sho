import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { UAParser } from 'ua-parser-js';
import { createHash } from 'crypto';

// Tipo per il risultato della query al DB
type LinkFromDb = {
  id: number;
  original_url: string;
}

// Funzione helper per generare un fingerprint unico dell'utente
function generateUserFingerprint(request: NextRequest, browserName: string, osName: string, deviceType: string): string {
  const acceptLanguage = request.headers.get('accept-language') || '';
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  
  // Ottieni l'IP dall'header appropriato (Vercel usa x-forwarded-for)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
  
  // Crea un hash dell'IP per privacy (non salviamo l'IP diretto)
  const ipHash = createHash('sha256').update(ip).digest('hex').substring(0, 8);
  
  // Combina diversi elementi per creare un fingerprint unico ma rispettoso della privacy
  const fingerprintData = [
    ipHash,
    browserName,
    osName, 
    deviceType,
    acceptLanguage?.substring(0, 10) || '', // Primi caratteri della lingua
    acceptEncoding?.substring(0, 20) || ''  // Primi caratteri dell'encoding
  ].join('|');
  
  // Genera il fingerprint finale
  return createHash('md5').update(fingerprintData).digest('hex').substring(0, 16);
}

// Funzione helper per registrare il click (aggiornata con fingerprint e conteggio click unici)
async function recordClick(linkId: number, request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  let referrer = request.headers.get('referer') || 'Direct';
  const country = request.headers.get('x-vercel-ip-country') || 'Unknown';

  // Controlla se il click proviene da un QR code
  const url = new URL(request.url);
  const isQrCode = url.searchParams.get('qr') === '1';
  
  if (isQrCode) {
    referrer = 'QR Code';
  }

  // Parse user agent info
  const parser = new UAParser(userAgent);
  const browserName = parser.getBrowser().name || 'Unknown';
  const osName = parser.getOS().name || 'Unknown';
  const deviceType = parser.getDevice().type || 'desktop';

  // Generate user fingerprint for unique visit tracking
  const userFingerprint = generateUserFingerprint(request, browserName, osName, deviceType);

  try {
    // Check if this is a unique visitor (based on fingerprint)
    const uniqueCheck = await sql`
      SELECT COUNT(*) as count FROM clicks 
      WHERE link_id = ${linkId} AND user_fingerprint = ${userFingerprint}
    `;
    
    const isUniqueVisit = uniqueCheck.rows[0].count === 0;
    
    // Record the click data (without os column for now to avoid database errors)
    await sql`
      INSERT INTO clicks 
        (link_id, country, referrer, browser_name, device_type, user_fingerprint, clicked_at_rome) 
      VALUES (
        ${linkId}, ${country}, ${referrer}, ${browserName}, ${deviceType}, 
        ${userFingerprint}, 
        NOW() AT TIME ZONE 'Europe/Rome'
      )
    `;
    
    // Update click count (always) and unique click count (only if needed)
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
    console.error("Failed to record click, but proceeding with redirect:", error);
  }
}

// --- QUESTA È LA FUNZIONE GET DEFINITIVA ---
// Firma inattaccabile che usa solo 'request'.
export async function GET(request: NextRequest) {
  
  // 1. Deriviamo lo shortCode direttamente dall'URL (Scoperta Corretta #2)
  const url = new URL(request.url);
  const shortCode = url.pathname.slice(1);

  if (!shortCode) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  try {
    const result = await sql<LinkFromDb>`
      SELECT id, original_url FROM links WHERE short_code = ${shortCode}
    `;
    const link = result.rows[0];

    if (!link) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // 2. Attendiamo che la registrazione sia completa (Scoperta Corretta #3)
    await recordClick(link.id, request);

    // 3. Eseguiamo il reindirizzamento
    return NextResponse.redirect(new URL(link.original_url));

  } catch (error) {
    console.error('Redirect Error:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}