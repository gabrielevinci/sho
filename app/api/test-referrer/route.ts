import { NextRequest, NextResponse } from 'next/server';
import { analyzeReferrerSource } from '@/lib/database-helpers';

export async function GET(request: NextRequest) {
  try {
    // Analizza il referrer della richiesta attuale
    const referrerInfo = analyzeReferrerSource(request);
    
    // Ottieni informazioni sulla richiesta per debug
    const headers = {
      'referer': request.headers.get('referer'),
      'user-agent': request.headers.get('user-agent'),
      'x-forwarded-for': request.headers.get('x-forwarded-for')
    };
    
    // Test con alcuni URL simulati
    const testCases = [
      'https://sho-smoky.vercel.app/abc123?qr=1',
      'https://sho-smoky.vercel.app/abc123?utm_source=instagram&utm_medium=story&utm_campaign=summer2025',
      'https://sho-smoky.vercel.app/abc123?fbclid=abc123',
      'https://sho-smoky.vercel.app/abc123?gclid=def456'
    ];
    
    const testResults = testCases.map(testUrl => {
      const mockRequest = {
        url: testUrl,
        headers: {
          get: (name: string) => {
            switch(name) {
              case 'referer': return 'https://www.facebook.com/';
              case 'user-agent': return 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
              default: return null;
            }
          }
        }
      } as NextRequest;
      
      const result = analyzeReferrerSource(mockRequest);
      return {
        test_url: testUrl,
        result
      };
    });
    
    return NextResponse.json({
      message: 'Test del sistema di analisi referrer avanzato',
      current_request: {
        url: request.url,
        headers,
        analysis: referrerInfo
      },
      test_cases: testResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Errore nel test referrer:', error);
    return NextResponse.json({ 
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}
