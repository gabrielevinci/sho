import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { 
      linkId, 
      fingerprintHash, 
      clientFingerprint 
    } = data;

    if (!linkId || !fingerprintHash || !clientFingerprint) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Aggiorna il record esistente con i dati client-side (UPSERT)
    await sql`
      UPDATE advanced_fingerprints SET
        screen_width = ${clientFingerprint.screenWidth || null},
        screen_height = ${clientFingerprint.screenHeight || null},
        screen_color_depth = ${clientFingerprint.screenColorDepth || null},
        screen_pixel_depth = ${clientFingerprint.screenPixelDepth || null},
        avail_screen_width = ${clientFingerprint.availScreenWidth || null},
        avail_screen_height = ${clientFingerprint.availScreenHeight || null},
        device_pixel_ratio = ${clientFingerprint.devicePixelRatio || null},
        viewport_width = ${clientFingerprint.viewportWidth || null},
        viewport_height = ${clientFingerprint.viewportHeight || null},
        
        timezone_offset = ${clientFingerprint.timezoneOffset || null},
        
        hardware_concurrency = ${clientFingerprint.hardwareConcurrency || null},
        max_touch_points = ${clientFingerprint.maxTouchPoints || null},
        
        audio_fingerprint = ${clientFingerprint.audioFingerprint || null},
        canvas_fingerprint = ${clientFingerprint.canvasFingerprint || null},
        webgl_vendor = ${clientFingerprint.webglVendor || null},
        webgl_renderer = ${clientFingerprint.webglRenderer || null},
        webgl_fingerprint = ${clientFingerprint.webglFingerprint || null},
        
        available_fonts = ${clientFingerprint.availableFonts ? JSON.stringify(clientFingerprint.availableFonts) : null},
        plugins = ${clientFingerprint.plugins ? JSON.stringify(clientFingerprint.plugins) : null},
        
        local_storage = ${clientFingerprint.localStorage || null},
        session_storage = ${clientFingerprint.sessionStorage || null},
        indexed_db = ${clientFingerprint.indexedDB || null},
        web_sql = ${clientFingerprint.webSQL || null},
        
        connection_type = ${clientFingerprint.connectionType || null},
        connection_speed = ${clientFingerprint.connectionSpeed || null},
        
        battery_level = ${clientFingerprint.batteryLevel || null},
        battery_charging = ${clientFingerprint.batteryCharging || null},
        
        media_devices = ${clientFingerprint.mediaDevices ? JSON.stringify(clientFingerprint.mediaDevices) : null},
        performance_fingerprint = ${clientFingerprint.performanceFingerprint || null},
        css_features = ${clientFingerprint.cssFeatures ? JSON.stringify(clientFingerprint.cssFeatures) : null},
        js_features = ${clientFingerprint.jsFeatures ? JSON.stringify(clientFingerprint.jsFeatures) : null},
        
        last_seen = NOW() AT TIME ZONE 'Europe/Rome'
      WHERE link_id = ${linkId} AND fingerprint_hash = ${fingerprintHash}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating fingerprint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
