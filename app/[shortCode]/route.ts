import { NextRequest, NextResponse } from 'next/server';
import { getLinkByShortCode, recordClick } from '@/lib/database-helpers';

export async function GET(request: NextRequest) {
  // Estrai lo shortCode dall'URL
  const url = new URL(request.url);
  const shortCode = url.pathname.slice(1);

  if (!shortCode) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  try {
    // Trova il link nel database usando la nuova funzione helper
    const link = await getLinkByShortCode(shortCode);

    if (!link) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Registra il click utilizzando il nuovo sistema
    try {
      await recordClick(request, link.id);
      console.log(`✅ Click registrato per link ${link.short_code}`);
    } catch (error) {
      console.error('❌ Errore nella registrazione del click:', error);
    }

    // Redirect immediato all'URL originale
    return NextResponse.redirect(new URL(link.original_url));

  } catch (error) {
    console.error('Errore nel redirect:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}