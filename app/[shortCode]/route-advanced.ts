/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { UAParser } from 'ua-parser-js';
import { createHash } from 'crypto';

// Tipo per il risultato della query al DB
type LinkFromDb = {
  id: number;
  original_url: string;
  title?: string;
}

// Funzione helper per generare un fingerprint server-side più avanzato
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
  const userAgent = request.headers.get('user-agent') || '';
  let referrer = request.headers.get('referer') || 'Direct';
  const country = request.headers.get('x-vercel-ip-country') || 'Unknown';

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
        (link_id, country, referrer, browser_name, device_type, user_fingerprint, clicked_at_rome) 
      VALUES (
        ${linkId}, 
        ${country}, 
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
    
    // Registra il click basic per compatibilità
    await recordBasicClick(link.id, request, fingerprintInfo);

    // Controlla se è un bot o crawler
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = /bot|crawl|spider|facebook|twitter|linkedinbot|whatsapp/i.test(userAgent);
    
    // Se è un bot, reindirizza direttamente
    if (isBot) {
      return NextResponse.redirect(new URL(link.original_url));
    }

    // Per utenti reali, crea una pagina intermedia che raccoglie il fingerprint completo
    const intermediatePageHtml = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="short-code" content="${shortCode}">
    <title>${link.title || 'Reindirizzamento...'}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            text-align: center;
        }
        .container {
            max-width: 500px;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 25px 45px rgba(0, 0, 0, 0.2);
        }
        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .progress-bar {
            width: 100%;
            height: 6px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 3px;
            overflow: hidden;
            margin: 1rem 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #ff6b6b, #ffd93d, #6bcf7f, #4d9de0);
            animation: progress 3s ease-in-out forwards;
            width: 0%;
        }
        @keyframes progress {
            0% { width: 0%; }
            25% { width: 30%; }
            50% { width: 60%; }
            75% { width: 85%; }
            100% { width: 100%; }
        }
        h1 { margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 600; }
        p { margin: 0.5rem 0; opacity: 0.9; }
        .status { font-size: 0.9rem; margin-top: 1rem; opacity: 0.8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h1>Reindirizzamento in corso...</h1>
        <p>Stiamo preparando il link per te</p>
        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>
        <div class="status" id="status">Raccolta informazioni del browser...</div>
    </div>

    <script>
        // Advanced Fingerprint Collection - Versione semplificata inline
        const statuses = [
            'Raccolta informazioni del browser...',
            'Analisi delle funzionalità supportate...',
            'Ottimizzazione dell\'esperienza...',
            'Preparazione del reindirizzamento...'
        ];
        
        let currentStatus = 0;
        const statusElement = document.getElementById('status');
        
        const updateStatus = () => {
            if (currentStatus < statuses.length - 1) {
                currentStatus++;
                statusElement.textContent = statuses[currentStatus];
            }
        };
        
        // Update status periodically
        setTimeout(updateStatus, 800);
        setTimeout(updateStatus, 1600);
        setTimeout(updateStatus, 2400);

        // Collect basic fingerprint data
        const collectFingerprint = async () => {
            const fingerprint = {
                userAgent: navigator.userAgent,
                language: navigator.language,
                languages: navigator.languages ? Array.from(navigator.languages) : [],
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack,
                screenWidth: screen.width,
                screenHeight: screen.height,
                screenColorDepth: screen.colorDepth,
                screenPixelDepth: screen.pixelDepth,
                availScreenWidth: screen.availWidth,
                availScreenHeight: screen.availHeight,
                devicePixelRatio: window.devicePixelRatio,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timezoneOffset: new Date().getTimezoneOffset(),
                hardwareConcurrency: navigator.hardwareConcurrency || 0,
                maxTouchPoints: navigator.maxTouchPoints || 0,
                audioFingerprint: 'collecting...',
                canvasFingerprint: 'collecting...',
                webglVendor: 'collecting...',
                webglRenderer: 'collecting...',
                webglFingerprint: 'collecting...',
                availableFonts: [],
                plugins: [],
                localStorage: !!window.localStorage,
                sessionStorage: !!window.sessionStorage,
                indexedDB: !!window.indexedDB,
                webSQL: !!(window.openDatabase),
                connectionType: 'unknown',
                connectionSpeed: 'unknown',
                mediaDevices: [],
                performanceFingerprint: 'collecting...',
                cssFeatures: [],
                jsFeatures: [],
                fingerprintHash: 'generating...'
            };

            // Generate simple hash
            const data = JSON.stringify(fingerprint);
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            fingerprint.fingerprintHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);

            return fingerprint;
        };

        // Main execution
        (async () => {
            try {
                const fingerprint = await collectFingerprint();
                const startTime = performance.now();
                
                // Send fingerprint data
                const fingerprintData = {
                    shortCode: '${shortCode}',
                    fingerprint: fingerprint,
                    timestamp: Date.now(),
                    pageLoadTime: Math.round(performance.now()),
                    timeOnPage: Math.round(performance.now() - startTime)
                };

                // Fingerprint data is captured but not sent to analytics (analytics removed)
                console.log('Fingerprint captured for:', shortCode);

                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = '${link.original_url}';
                }, 3000);

            } catch (error) {
                console.error('Fingerprint collection failed:', error);
                // Fallback redirect
                setTimeout(() => {
                    window.location.href = '${link.original_url}';
                }, 2000);
            }
        })();
    </script>
</body>
</html>`;

    return new NextResponse(intermediatePageHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Redirect Error:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
