import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ shortCode: string }> }
) {
  const { shortCode } = await context.params;
  
  try {
    // Trova il link
    const linkResult = await sql`
      SELECT id, title FROM links WHERE short_code = ${shortCode}
    `;

    if (linkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const linkId = linkResult.rows[0].id;
    const linkTitle = linkResult.rows[0].title;

    // Ottieni i dati del fingerprint avanzato
    const fingerprintData = await sql`
      SELECT 
        af.*,
        COUNT(fi.id) as total_interactions
      FROM advanced_fingerprints af
      LEFT JOIN fingerprint_interactions fi ON af.id = fi.fingerprint_id
      WHERE af.link_id = ${linkId}
      GROUP BY af.id
      ORDER BY af.last_seen DESC
    `;

    // Statistiche aggregate
    const stats = await sql`
      SELECT 
        COUNT(DISTINCT fingerprint_hash) as unique_visitors,
        COUNT(*) as total_visits,
        AVG(page_load_time) as avg_page_load_time,
        AVG(total_time_on_page) as avg_time_on_page,
        SUM(total_keystrokes) as total_keystrokes,
        COUNT(DISTINCT country) as unique_countries,
        COUNT(DISTINCT city) as unique_cities,
        COUNT(DISTINCT platform) as unique_platforms,
        COUNT(CASE WHEN max_touch_points > 0 THEN 1 END) as touch_devices,
        COUNT(CASE WHEN device_pixel_ratio > 1 THEN 1 END) as high_dpi_devices
      FROM advanced_fingerprints 
      WHERE link_id = ${linkId}
    `;

    // Top browsers
    const topBrowsers = await sql`
      SELECT 
        user_agent,
        COUNT(*) as count,
        COUNT(DISTINCT fingerprint_hash) as unique_visitors
      FROM advanced_fingerprints 
      WHERE link_id = ${linkId}
      GROUP BY user_agent
      ORDER BY count DESC
      LIMIT 10
    `;

    // Top countries
    const topCountries = await sql`
      SELECT 
        country,
        COUNT(*) as count,
        COUNT(DISTINCT fingerprint_hash) as unique_visitors
      FROM advanced_fingerprints 
      WHERE link_id = ${linkId} AND country != 'Unknown'
      GROUP BY country
      ORDER BY count DESC
      LIMIT 10
    `;

    // Device types distribution
    const deviceTypes = await sql`
      SELECT 
        CASE 
          WHEN max_touch_points > 0 AND screen_width < 768 THEN 'Mobile'
          WHEN max_touch_points > 0 AND screen_width >= 768 THEN 'Tablet'
          ELSE 'Desktop'
        END as device_category,
        COUNT(*) as count,
        COUNT(DISTINCT fingerprint_hash) as unique_visitors
      FROM advanced_fingerprints 
      WHERE link_id = ${linkId}
      GROUP BY device_category
      ORDER BY count DESC
    `;

    // Screen resolutions
    const screenResolutions = await sql`
      SELECT 
        CONCAT(screen_width, 'x', screen_height) as resolution,
        COUNT(*) as count,
        COUNT(DISTINCT fingerprint_hash) as unique_visitors
      FROM advanced_fingerprints 
      WHERE link_id = ${linkId}
      GROUP BY screen_width, screen_height
      ORDER BY count DESC
      LIMIT 10
    `;

    // Timezone distribution
    const timezones = await sql`
      SELECT 
        timezone,
        COUNT(*) as count,
        COUNT(DISTINCT fingerprint_hash) as unique_visitors
      FROM advanced_fingerprints 
      WHERE link_id = ${linkId} AND timezone != 'Unknown'
      GROUP BY timezone
      ORDER BY count DESC
      LIMIT 10
    `;

    // Browser features analysis
    const browserFeatures = await sql`
      SELECT 
        local_storage,
        session_storage,
        indexed_db,
        cookie_enabled,
        COUNT(*) as count
      FROM advanced_fingerprints 
      WHERE link_id = ${linkId}
      GROUP BY local_storage, session_storage, indexed_db, cookie_enabled
      ORDER BY count DESC
    `;

    // Connection types
    const connectionTypes = await sql`
      SELECT 
        connection_type,
        COUNT(*) as count,
        COUNT(DISTINCT fingerprint_hash) as unique_visitors
      FROM advanced_fingerprints 
      WHERE link_id = ${linkId} AND connection_type != 'unknown'
      GROUP BY connection_type
      ORDER BY count DESC
    `;

    // Canvas fingerprint diversity
    const canvasFingerprints = await sql`
      SELECT 
        COUNT(DISTINCT canvas_fingerprint) as unique_canvas_fingerprints,
        COUNT(DISTINCT audio_fingerprint) as unique_audio_fingerprints,
        COUNT(DISTINCT webgl_fingerprint) as unique_webgl_fingerprints
      FROM advanced_fingerprints 
      WHERE link_id = ${linkId}
    `;

    return NextResponse.json({
      link: {
        shortCode,
        title: linkTitle
      },
      stats: stats.rows[0],
      fingerprints: fingerprintData.rows,
      analytics: {
        topBrowsers: topBrowsers.rows,
        topCountries: topCountries.rows,
        deviceTypes: deviceTypes.rows,
        screenResolutions: screenResolutions.rows,
        timezones: timezones.rows,
        browserFeatures: browserFeatures.rows,
        connectionTypes: connectionTypes.rows,
        canvasFingerprints: canvasFingerprints.rows[0]
      }
    });

  } catch (error) {
    console.error('Error fetching advanced fingerprint analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
