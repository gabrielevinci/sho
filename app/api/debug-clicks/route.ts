import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query per ottenere tutti i click del link udUUmGe con i loro timestamp
    const { rows } = await sql`
      SELECT 
        c.id,
        c.clicked_at_rome,
        c.created_at,
        c.browser_name,
        c.device_type,
        c.country,
        l.short_code
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      WHERE l.user_id = ${session.userId} 
        AND l.workspace_id = ${session.workspaceId} 
        AND l.short_code = 'udUUmGe'
      ORDER BY c.clicked_at_rome DESC
    `;

    const now = new Date();
    const italianNow = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Rome"}));

    return NextResponse.json({
      currentTime: {
        utc: now.toISOString(),
        italian: italianNow.toISOString(),
        formatted: italianNow.toLocaleString("it-IT", {timeZone: "Europe/Rome"})
      },
      clicks: rows.map(row => ({
        ...row,
        clicked_at_rome_formatted: new Date(row.clicked_at_rome).toLocaleString("it-IT", {timeZone: "Europe/Rome"})
      }))
    });

  } catch (error) {
    console.error('Debug clicks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
