import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTrafficSource, getQRDetectionStats } from '@/lib/qr-detection';
import { 
  generatePhysicalDeviceFingerprint, 
  isUniqueVisit,
  PhysicalDeviceFingerprint
} from '@/lib/enhanced-fingerprint';

// Tipo per il risultato della query al DB
type LinkFromDb = {
  id: number;
  original_url: string;
  title?: string;
}

// Funzione per registrare il click usando il nuovo sistema di fingerprinting
async function recordEnhancedClick(
  linkId: number, 
  request: NextRequest, 
  physicalFingerprint: PhysicalDeviceFingerprint
) {
  console.log('🎯 recordEnhancedClick called:', { linkId, deviceFingerprint: physicalFingerprint.deviceFingerprint });
  
  const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
  const region = request.headers.get('x-vercel-ip-country-region') || 'Unknown';
  const city = request.headers.get('x-vercel-ip-city') || 'Unknown';
  
  // Usa la libreria di rilevamento QR per determinare la sorgente di traffico
  const referrer = getTrafficSource(request);
  
  // Debug logging per monitorare l'efficacia del rilevamento QR
  if (process.env.NODE_ENV === 'development') {
    const qrStats = getQRDetectionStats(request);
    if (qrStats.qrDetection.isQRCode) {
      console.log('QR Code detected:', {
        referrer,
        method: qrStats.qrDetection.method,
        confidence: qrStats.qrDetection.confidence,
        userAgent: qrStats.userAgent.substring(0, 100),
        isMobile: qrStats.isMobile,
        isDirect: qrStats.isDirect
      });
    }
  }

  try {
    // STEP 1: Salva sempre il fingerprint prima di controllare uniqueness
    // Questo permette alla logica di correlazione di funzionare correttamente
    
    // Registra il click nella tabella legacy (per compatibilità)
    await sql`
      INSERT INTO clicks 
        (link_id, country, referrer, browser_name, device_type, user_fingerprint, clicked_at_rome) 
      VALUES (
        ${linkId}, 
        ${country}, 
        ${referrer}, 
        ${physicalFingerprint.browserType}, 
        ${physicalFingerprint.deviceCategory}, 
        ${physicalFingerprint.browserFingerprint}, 
        NOW() AT TIME ZONE 'Europe/Rome'
      )
    `;
    
    // Salva o aggiorna il fingerprint migliorato
    const existingFingerprint = await sql`
      SELECT id FROM enhanced_fingerprints 
      WHERE browser_fingerprint = ${physicalFingerprint.browserFingerprint}
      AND link_id = ${linkId}
    `;

    if (existingFingerprint.rows.length > 0) {
      // Aggiorna fingerprint esistente
      await sql`
        UPDATE enhanced_fingerprints SET
          last_seen = NOW() AT TIME ZONE 'Europe/Rome',
          visit_count = visit_count + 1
        WHERE id = ${existingFingerprint.rows[0].id}
      `;
    } else {
      // Inserisci nuovo fingerprint
      await sql`
        INSERT INTO enhanced_fingerprints (
          link_id,
          device_fingerprint,
          browser_fingerprint,
          session_fingerprint,
          fingerprint_hash,
          ip_hash,
          timezone_fingerprint,
          hardware_profile,
          device_category,
          os_family,
          browser_type,
          user_agent,
          country,
          region,
          city,
          confidence,
          correlation_factors,
          created_at,
          last_seen
        ) VALUES (
          ${linkId},
          ${physicalFingerprint.deviceFingerprint},
          ${physicalFingerprint.browserFingerprint},
          ${physicalFingerprint.sessionFingerprint},
          ${physicalFingerprint.browserFingerprint},
          ${physicalFingerprint.ipHash},
          ${physicalFingerprint.timezoneFingerprint},
          ${physicalFingerprint.hardwareProfile},
          ${physicalFingerprint.deviceCategory},
          ${physicalFingerprint.osFamily},
          ${physicalFingerprint.browserType},
          ${request.headers.get('user-agent') || ''},
          ${country},
          ${region},
          ${city},
          ${physicalFingerprint.confidence},
          ${JSON.stringify(physicalFingerprint.correlationFactors)},
          NOW() AT TIME ZONE 'Europe/Rome',
          NOW() AT TIME ZONE 'Europe/Rome'
        )
      `;
    }
    
    // STEP 2: Ora che il fingerprint è salvato, determina se questo è un visit unico
    // La logica di correlazione può ora funzionare correttamente
    const uniqueCheckResult = await isUniqueVisit(linkId, physicalFingerprint, sql);
    const isUniqueVisitor = uniqueCheckResult.isUnique;
    
    // Log per debug (rimuovere in produzione)
    if (process.env.NODE_ENV === 'development') {
      console.log('Enhanced fingerprint check:', {
        isUnique: isUniqueVisitor,
        reason: uniqueCheckResult.reason,
        deviceFingerprint: physicalFingerprint.deviceFingerprint,
        browserFingerprint: physicalFingerprint.browserFingerprint,
        confidence: physicalFingerprint.confidence,
        correlationFactors: physicalFingerprint.correlationFactors,
        relatedFingerprints: uniqueCheckResult.relatedFingerprints
      });
    }
    
    // STEP 3: Aggiorna i contatori del link con la nuova logica
    if (isUniqueVisitor) {
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
    console.error("Failed to record enhanced click:", error);
    
    // Fallback al sistema legacy in caso di errore
    try {
      await sql`
        INSERT INTO clicks 
          (link_id, country, referrer, browser_name, device_type, user_fingerprint, clicked_at_rome) 
        VALUES (
          ${linkId}, 
          ${country}, 
          ${referrer}, 
          ${physicalFingerprint.browserType}, 
          ${physicalFingerprint.deviceCategory}, 
          ${physicalFingerprint.browserFingerprint}, 
          NOW() AT TIME ZONE 'Europe/Rome'
        )
      `;
      
      await sql`
        UPDATE links SET click_count = click_count + 1 WHERE id = ${linkId}
      `;
    } catch (fallbackError) {
      console.error("Even fallback failed:", fallbackError);
    }
  }
}

export async function GET(request: NextRequest) {
  // Estrai lo shortCode dall'URL
  const url = new URL(request.url);
  const shortCode = url.pathname.slice(1);

  console.log('🚀 REDIRECT REQUEST:', { shortCode, userAgent: request.headers.get('user-agent')?.substring(0, 50) });

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

    // Genera fingerprint fisico del dispositivo migliorato
    const physicalFingerprint = generatePhysicalDeviceFingerprint(request);
    console.log('🔑 Generated fingerprint:', { 
      deviceFingerprint: physicalFingerprint.deviceFingerprint,
      browserFingerprint: physicalFingerprint.browserFingerprint 
    });
    
    // Per tutti (bot e utenti reali): registra il click con il nuovo sistema
    try {
      await recordEnhancedClick(link.id, request, physicalFingerprint);
      console.log('✅ Click recorded successfully');
    } catch (error) {
      console.error('❌ Error recording click:', error);
    }

    // Redirect immediato - NESSUNA PAGINA INTERMEDIA
    return NextResponse.redirect(new URL(link.original_url));

  } catch (error) {
    console.error('Redirect Error:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}