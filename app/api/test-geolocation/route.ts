import { NextRequest, NextResponse } from 'next/server';
import { getGeoLocation, getDeviceInfo } from '@/lib/database-helpers';

export async function GET(request: NextRequest) {
  try {
    // Test con diversi IP per verificare la geolocalizzazione
    const testIPs = [
      { name: 'IP locale', ip: '::1' },
      { name: 'Google DNS', ip: '8.8.8.8' },
      { name: 'Cloudflare DNS', ip: '1.1.1.1' },
      { name: 'IP Italiano Telecom', ip: '79.23.144.1' }
    ];
    
    const results = [];
    
    for (const testCase of testIPs) {
      console.log(`🧪 Testando geolocalizzazione per ${testCase.name} (${testCase.ip})`);
      
      // Simula una richiesta con IP specifico
      const mockRequest = {
        headers: {
          get: (headerName: string) => {
            switch (headerName) {
              case 'x-forwarded-for':
                return testCase.ip;
              case 'x-real-ip':
                return null;
              case 'user-agent':
                return request.headers.get('user-agent');
              case 'accept-language':
                return request.headers.get('accept-language');
              default:
                return null;
            }
          }
        }
      } as NextRequest;
      
      try {
        const geoLocation = await getGeoLocation(mockRequest);
        const deviceInfo = getDeviceInfo(mockRequest);
        
        results.push({
          test: testCase.name,
          ip: testCase.ip,
          geolocation: geoLocation,
          device: deviceInfo,
          success: true
        });
        
        console.log(`✅ ${testCase.name}: ${geoLocation.city}, ${geoLocation.region}, ${geoLocation.country}`);
      } catch (error) {
        console.error(`❌ Errore per ${testCase.name}:`, error);
        results.push({
          test: testCase.name,
          ip: testCase.ip,
          error: error instanceof Error ? error.message : 'Errore sconosciuto',
          success: false
        });
      }
    }
    
    // Test anche con la richiesta reale
    const realGeoLocation = await getGeoLocation(request);
    const realDeviceInfo = getDeviceInfo(request);
    
    return NextResponse.json({
      message: 'Test della geolocalizzazione e rilevamento dispositivo',
      real_request: {
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        geolocation: realGeoLocation,
        device: realDeviceInfo
      },
      test_results: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Errore nel test di geolocalizzazione:', error);
    return NextResponse.json({ 
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}
