import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🧪 TEST API chiamata');
  return NextResponse.json({ message: 'Test API funziona', timestamp: new Date().toISOString() });
}
