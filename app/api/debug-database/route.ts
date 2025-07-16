// API endpoint per verificare i dati del database
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const linkId = url.searchParams.get('linkId') || '60';
    
    console.log(`=== VERIFICA DATABASE per Link ID: ${linkId} ===`);
    
    // 1. Controlla la tabella links
    const linkCheck = await sql`SELECT id, short_code, click_count, unique_click_count FROM links WHERE id = ${linkId}`;
    
    // 2. Controlla tutti i click nella tabella clicks per questo link
    const clicksCheck = await sql`
      SELECT browser_name, COUNT(*) as count_per_browser
      FROM clicks 
      WHERE link_id = ${linkId} 
      GROUP BY browser_name
      ORDER BY browser_name
    `;
    
    // 3. Totale clicks nella tabella clicks
    const totalClicksCheck = await sql`SELECT COUNT(*) as total FROM clicks WHERE link_id = ${linkId}`;
    
    // 4. Controlla enhanced_fingerprints
    const enhancedCheck = await sql`
      SELECT browser_type, visit_count, created_at 
      FROM enhanced_fingerprints 
      WHERE link_id = ${linkId} 
      ORDER BY created_at
    `;
    
    // 5. Ultimi clicks
    const recentClicks = await sql`
      SELECT browser_name, clicked_at_rome 
      FROM clicks 
      WHERE link_id = ${linkId} 
      ORDER BY clicked_at_rome DESC 
      LIMIT 10
    `;
    
    const result = {
      linkData: linkCheck.rows[0],
      clicksByBrowser: clicksCheck.rows,
      totalClicksInTable: totalClicksCheck.rows[0],
      enhancedFingerprints: enhancedCheck.rows,
      recentClicks: recentClicks.rows
    };
    
    console.log('📊 RISULTATI VERIFICA:', JSON.stringify(result, null, 2));
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ Errore nella verifica:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
