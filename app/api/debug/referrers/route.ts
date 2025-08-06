import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// API per debug dei referrer con caratteri URL-encoded
export async function GET(request: NextRequest) {
  try {
    // Query per trovare referrer con caratteri URL-encoded
    const encodedReferrers = await sql`
      SELECT 
        referrer,
        COUNT(*) as occurrences,
        COUNT(DISTINCT link_id) as links_affected
      FROM clicks 
      WHERE referrer LIKE '%\%%' 
        OR referrer LIKE '%+%'
        OR referrer LIKE '%_%'
      GROUP BY referrer 
      ORDER BY occurrences DESC 
      LIMIT 20
    `;

    // Query per i referrer più comuni in generale
    const topReferrers = await sql`
      SELECT 
        referrer,
        COUNT(*) as occurrences,
        COUNT(DISTINCT link_id) as links_affected
      FROM clicks 
      WHERE referrer IS NOT NULL AND referrer != 'Direct'
      GROUP BY referrer 
      ORDER BY occurrences DESC 
      LIMIT 20
    `;

    return NextResponse.json({
      encodedReferrers: encodedReferrers.rows,
      topReferrers: topReferrers.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Errore nel debug referrers:', error);
    return NextResponse.json({ 
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
