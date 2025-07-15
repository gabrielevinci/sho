import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Tipi per i dati del fingerprint ricevuti dal client
type FingerprintData = {
  shortCode: string;
  fingerprint: {
    userAgent: string;
    language: string;
    languages: string[];
    platform: string;
    cookieEnabled: boolean;
    doNotTrack: string | null;
    screenWidth: number;
    screenHeight: number;
    screenColorDepth: number;
    screenPixelDepth: number;
    availScreenWidth: number;
    availScreenHeight: number;
    devicePixelRatio: number;
    viewportWidth: number;
    viewportHeight: number;
    timezone: string;
    timezoneOffset: number;
    hardwareConcurrency: number;
    maxTouchPoints: number;
    audioFingerprint: string;
    canvasFingerprint: string;
    webglVendor: string;
    webglRenderer: string;
    webglFingerprint: string;
    availableFonts: string[];
    plugins: string[];
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
    webSQL: boolean;
    connectionType: string;
    connectionSpeed: string;
    batteryLevel?: number;
    batteryCharging?: boolean;
    mediaDevices: string[];
    performanceFingerprint: string;
    cssFeatures: string[];
    jsFeatures: string[];
    fingerprintHash: string;
  };
  timestamp: number;
  pageLoadTime: number;
  clickPosition?: { x: number; y: number };
  scrollPosition?: { x: number; y: number };
  mouseMovements?: Array<{ x: number; y: number; timestamp: number }>;
  keystrokes?: number;
  timeOnPage?: number;
};

export async function POST(request: NextRequest) {
  try {
    const data: FingerprintData = await request.json();
    
    // Ottieni informazioni aggiuntive dall'header
    const realIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
    const region = request.headers.get('x-vercel-ip-country-region') || 'Unknown';
    const city = request.headers.get('x-vercel-ip-city') || 'Unknown';
    const referer = request.headers.get('referer') || 'Direct';

    // Trova il link dal shortCode
    const linkResult = await sql`
      SELECT id FROM links WHERE short_code = ${data.shortCode}
    `;

    if (linkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const linkId = linkResult.rows[0].id;

    // Controlla se abbiamo già registrato questo fingerprint per questo link
    const existingFingerprint = await sql`
      SELECT id FROM advanced_fingerprints 
      WHERE link_id = ${linkId} AND fingerprint_hash = ${data.fingerprint.fingerprintHash}
    `;

    let fingerprintId: number;

    if (existingFingerprint.rows.length > 0) {
      fingerprintId = existingFingerprint.rows[0].id;
      
      // Aggiorna il record esistente con i nuovi dati di interazione
      await sql`
        UPDATE advanced_fingerprints SET
          last_seen = NOW() AT TIME ZONE 'Europe/Rome',
          visit_count = visit_count + 1,
          total_time_on_page = total_time_on_page + ${data.timeOnPage || 0},
          total_keystrokes = total_keystrokes + ${data.keystrokes || 0},
          page_load_time = ${data.pageLoadTime}
        WHERE id = ${fingerprintId}
      `;
    } else {
      // Inserisci nuovo fingerprint
      const fingerprintResult = await sql`
        INSERT INTO advanced_fingerprints (
          link_id,
          fingerprint_hash,
          user_agent,
          language,
          languages,
          platform,
          cookie_enabled,
          do_not_track,
          screen_width,
          screen_height,
          screen_color_depth,
          screen_pixel_depth,
          avail_screen_width,
          avail_screen_height,
          device_pixel_ratio,
          viewport_width,
          viewport_height,
          timezone,
          timezone_offset,
          hardware_concurrency,
          max_touch_points,
          audio_fingerprint,
          canvas_fingerprint,
          webgl_vendor,
          webgl_renderer,
          webgl_fingerprint,
          available_fonts,
          plugins,
          local_storage,
          session_storage,
          indexed_db,
          web_sql,
          connection_type,
          connection_speed,
          battery_level,
          battery_charging,
          media_devices,
          performance_fingerprint,
          css_features,
          js_features,
          ip_address,
          country,
          region,
          city,
          referer,
          visit_count,
          total_time_on_page,
          total_keystrokes,
          page_load_time,
          first_seen,
          last_seen
        ) VALUES (
          ${linkId},
          ${data.fingerprint.fingerprintHash},
          ${data.fingerprint.userAgent},
          ${data.fingerprint.language},
          ${JSON.stringify(data.fingerprint.languages)},
          ${data.fingerprint.platform},
          ${data.fingerprint.cookieEnabled},
          ${data.fingerprint.doNotTrack},
          ${data.fingerprint.screenWidth},
          ${data.fingerprint.screenHeight},
          ${data.fingerprint.screenColorDepth},
          ${data.fingerprint.screenPixelDepth},
          ${data.fingerprint.availScreenWidth},
          ${data.fingerprint.availScreenHeight},
          ${data.fingerprint.devicePixelRatio},
          ${data.fingerprint.viewportWidth},
          ${data.fingerprint.viewportHeight},
          ${data.fingerprint.timezone},
          ${data.fingerprint.timezoneOffset},
          ${data.fingerprint.hardwareConcurrency},
          ${data.fingerprint.maxTouchPoints},
          ${data.fingerprint.audioFingerprint},
          ${data.fingerprint.canvasFingerprint},
          ${data.fingerprint.webglVendor},
          ${data.fingerprint.webglRenderer},
          ${data.fingerprint.webglFingerprint},
          ${JSON.stringify(data.fingerprint.availableFonts)},
          ${JSON.stringify(data.fingerprint.plugins)},
          ${data.fingerprint.localStorage},
          ${data.fingerprint.sessionStorage},
          ${data.fingerprint.indexedDB},
          ${data.fingerprint.webSQL},
          ${data.fingerprint.connectionType},
          ${data.fingerprint.connectionSpeed},
          ${data.fingerprint.batteryLevel || null},
          ${data.fingerprint.batteryCharging || null},
          ${JSON.stringify(data.fingerprint.mediaDevices)},
          ${data.fingerprint.performanceFingerprint},
          ${JSON.stringify(data.fingerprint.cssFeatures)},
          ${JSON.stringify(data.fingerprint.jsFeatures)},
          ${realIp},
          ${country},
          ${region},
          ${city},
          ${referer},
          1,
          ${data.timeOnPage || 0},
          ${data.keystrokes || 0},
          ${data.pageLoadTime},
          NOW() AT TIME ZONE 'Europe/Rome',
          NOW() AT TIME ZONE 'Europe/Rome'
        ) RETURNING id
      `;
      
      fingerprintId = fingerprintResult.rows[0].id;
    }

    // Registra i dettagli dell'interazione
    if (data.clickPosition || data.scrollPosition || data.mouseMovements) {
      await sql`
        INSERT INTO fingerprint_interactions (
          fingerprint_id,
          click_position_x,
          click_position_y,
          scroll_position_x,
          scroll_position_y,
          mouse_movements,
          keystrokes,
          time_on_page,
          interaction_timestamp
        ) VALUES (
          ${fingerprintId},
          ${data.clickPosition?.x || null},
          ${data.clickPosition?.y || null},
          ${data.scrollPosition?.x || null},
          ${data.scrollPosition?.y || null},
          ${data.mouseMovements ? JSON.stringify(data.mouseMovements) : null},
          ${data.keystrokes || 0},
          ${data.timeOnPage || 0},
          NOW() AT TIME ZONE 'Europe/Rome'
        )
      `;
    }

    return NextResponse.json({ 
      success: true, 
      fingerprintId,
      message: 'Fingerprint data recorded successfully' 
    });

  } catch (error) {
    console.error('Error processing fingerprint data:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
