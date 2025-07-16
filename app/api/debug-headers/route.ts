import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Raccoglie tutti gli headers e informazioni di rete
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const debugInfo = {
    timestamp: new Date().toISOString(),
    url: request.url,
    ip_sources: {
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      'x-real-ip': request.headers.get('x-real-ip'),
      'x-vercel-forwarded-for': request.headers.get('x-vercel-forwarded-for'),
    },
    vercel_geo: {
      'x-vercel-ip-timezone': request.headers.get('x-vercel-ip-timezone'),
      'x-vercel-ip-country': request.headers.get('x-vercel-ip-country'),
      'x-vercel-ip-country-region': request.headers.get('x-vercel-ip-country-region'),
      'x-vercel-ip-city': request.headers.get('x-vercel-ip-city'),
    },
    browser_info: {
      'user-agent': request.headers.get('user-agent'),
      'accept': request.headers.get('accept'),
      'accept-language': request.headers.get('accept-language'),
      'accept-encoding': request.headers.get('accept-encoding'),
    },
    all_headers: headers
  };

  return NextResponse.json(debugInfo, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}
