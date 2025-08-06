import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/app/lib/session';

// API per creare dati di test con referrer URL-encoded
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.userId || !session.isLoggedIn) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Trova un link dell'utente per aggiungere test data
    const userLink = await sql`
      SELECT id FROM links 
      WHERE user_id = ${session.userId} 
      LIMIT 1
    `;

    if (userLink.rowCount === 0) {
      return NextResponse.json({ error: 'Nessun link trovato per l\'utente' }, { status: 404 });
    }

    const linkId = userLink.rows[0].id;

    // Crea alcuni click di test con referrer URL-encoded
    const testReferrers = [
      'google%20search',
      'bing%20search', 
      'yahoo%20search',
      'social%20media',
      'facebook%20app',
      'instagram%20mobile',
      'test%20referrer%20with%20spaces',
      'another+encoded+referrer',
      'mixed%20encoding+test'
    ];

    const insertPromises = testReferrers.map(async (referrer, index) => {
      return sql`
        INSERT INTO clicks (
          link_id, country, region, city, referrer, browser_name, 
          language_device, device_type, os_name, ip_address, user_agent, 
          timezone_device, click_fingerprint_hash, source_type, source_detail
        ) VALUES (
          ${linkId}, 'Test Country', 'Test Region', 'Test City', 
          ${referrer}, 'Test Browser', 'en', 'Desktop', 'Test OS', 
          '127.0.0.1', 'Test User Agent', 'Europe/Rome', 
          'test_hash_${Date.now()}_${index}', 'test', 'Test Source Detail'
        )
      `;
    });

    await Promise.all(insertPromises);

    return NextResponse.json({ 
      message: 'Dati di test creati con successo',
      testReferrers,
      linkId,
      count: testReferrers.length
    });
  } catch (error) {
    console.error('Errore nella creazione dati di test:', error);
    return NextResponse.json({ 
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
