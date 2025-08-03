import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!linkId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const startTimestamp = `${startDate} 00:00:00`;
    const endTimestamp = `${endDate} 23:59:59`;

    console.log(`Debug query for linkId: ${linkId}, dates: ${startTimestamp} to ${endTimestamp}`);

    // Query per verificare quanti click esistono nel range
    const totalClicksResult = await sql`
      SELECT COUNT(*) as total_clicks
      FROM clicks 
      WHERE link_id = ${linkId}
    `;

    const clicksInRangeResult = await sql`
      SELECT COUNT(*) as clicks_in_range
      FROM clicks 
      WHERE link_id = ${linkId}
        AND clicked_at >= ${startTimestamp}::timestamp
        AND clicked_at <= ${endTimestamp}::timestamp
    `;

    // Query principale come nell'API originale
    const statsResult = await sql`
      SELECT 
        COUNT(*) as click_totali,
        COUNT(DISTINCT click_fingerprint_hash) as click_unici,
        COUNT(DISTINCT CASE WHEN referrer != 'Direct' AND referrer IS NOT NULL THEN referrer END) as referrer_count,
        COUNT(DISTINCT CASE WHEN country IS NOT NULL THEN country END) as country_count,
        COUNT(DISTINCT CASE WHEN city IS NOT NULL THEN city END) as city_count,
        COUNT(DISTINCT CASE WHEN browser_name IS NOT NULL THEN browser_name END) as browser_count,
        COUNT(DISTINCT CASE WHEN language_device IS NOT NULL THEN language_device END) as lingua_count,
        COUNT(DISTINCT CASE WHEN device_type IS NOT NULL THEN device_type END) as dispositivo_count,
        COUNT(DISTINCT CASE WHEN os_name IS NOT NULL THEN os_name END) as sistema_operativo_count
      FROM clicks 
      WHERE link_id = ${linkId}
        AND clicked_at >= ${startTimestamp}::timestamp
        AND clicked_at <= ${endTimestamp}::timestamp
    `;

    // Query per vedere alcuni click di esempio
    const sampleClicksResult = await sql`
      SELECT clicked_at, country, referrer, browser_name, language_device, device_type, os_name
      FROM clicks 
      WHERE link_id = ${linkId}
      ORDER BY clicked_at DESC
      LIMIT 5
    `;

    return NextResponse.json({
      linkId,
      dateRange: { startDate, endDate, startTimestamp, endTimestamp },
      totalClicks: totalClicksResult.rows[0].total_clicks,
      clicksInRange: clicksInRangeResult.rows[0].clicks_in_range,
      stats: statsResult.rows[0],
      sampleClicks: sampleClicksResult.rows
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
