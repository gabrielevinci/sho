import { NextRequest, NextResponse } from 'next/server';
import { detectQRCodeSource, getTrafficSource, getQRDetectionStats } from '@/lib/qr-detection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testUserAgent, testReferrer, testUrl } = body;
    
    // Crea una mock request per testare
    const mockHeaders = new Headers();
    if (testUserAgent) mockHeaders.set('user-agent', testUserAgent);
    if (testReferrer) mockHeaders.set('referer', testReferrer);
    
    const mockRequest = new NextRequest(testUrl || 'https://example.com/test', {
      headers: mockHeaders,
    });
    
    const qrDetection = detectQRCodeSource(mockRequest);
    const trafficSource = getTrafficSource(mockRequest);
    const stats = getQRDetectionStats(mockRequest);
    
    return NextResponse.json({
      success: true,
      results: {
        qrDetection,
        trafficSource,
        stats
      }
    });
  } catch (error) {
    console.error('Test QR detection error:', error);
    return NextResponse.json(
      { error: 'Failed to test QR detection' },
      { status: 500 }
    );
  }
}
