import { NextRequest, NextResponse } from 'next/server';
import { generatePhysicalDeviceFingerprint } from '@/lib/enhanced-fingerprint';

export async function POST(request: NextRequest) {
  try {
    // Genera il fingerprint fisico del dispositivo
    const physicalFingerprint = generatePhysicalDeviceFingerprint(request);
    
    // Restituisci i dati per il test
    return NextResponse.json({
      deviceFingerprint: physicalFingerprint.deviceFingerprint,
      browserFingerprint: physicalFingerprint.browserFingerprint,
      sessionFingerprint: physicalFingerprint.sessionFingerprint,
      ipHash: physicalFingerprint.ipHash,
      timezoneFingerprint: physicalFingerprint.timezoneFingerprint,
      hardwareProfile: physicalFingerprint.hardwareProfile,
      browserType: physicalFingerprint.browserType,
      deviceCategory: physicalFingerprint.deviceCategory,
      osFamily: physicalFingerprint.osFamily,
      confidence: physicalFingerprint.confidence,
      correlationFactors: physicalFingerprint.correlationFactors,
      
      // Debug info
      headers: {
        userAgent: request.headers.get('user-agent')?.substring(0, 100),
        acceptLanguage: request.headers.get('accept-language'),
        country: request.headers.get('x-vercel-ip-country'),
        city: request.headers.get('x-vercel-ip-city'),
        timezone: request.headers.get('x-vercel-ip-timezone')
      }
    });
    
  } catch (error) {
    console.error('Error generating test fingerprint:', error);
    return NextResponse.json(
      { error: 'Failed to generate fingerprint' },
      { status: 500 }
    );
  }
}
