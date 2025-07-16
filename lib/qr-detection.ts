import { NextRequest } from 'next/server';

/**
 * Rileva se una richiesta proviene da un QR code
 * Utilizza multiple strategie di rilevamento per massimizzare l'accuratezza
 */
export function detectQRCodeSource(request: NextRequest): {
  isQRCode: boolean;
  method: 'explicit' | 'user-agent' | 'mobile-direct' | 'none';
  confidence: 'high' | 'medium' | 'low';
} {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer');
  
  // 1. Rilevamento esplicito: parametro qr=1
  if (url.searchParams.get('qr') === '1') {
    return {
      isQRCode: true,
      method: 'explicit',
      confidence: 'high'
    };
  }
  
  // 2. Pattern per app di scan QR code specifiche
  const qrAppPatterns = [
    /QR.*Scanner/i,
    /QR.*Reader/i,
    /QR.*Code/i,
    /ZXing/i,
    /Barcode.*Scanner/i,
    /Scanner.*Pro/i,
    /QR.*Droid/i,
    /Lightning.*QR/i
  ];
  
  const hasQRAppPattern = qrAppPatterns.some(pattern => pattern.test(userAgent));
  if (hasQRAppPattern) {
    return {
      isQRCode: true,
      method: 'user-agent',
      confidence: 'high'
    };
  }
  
  // 3. Pattern per scanner generici
  const genericScannerPatterns = [
    /Camera/i,
    /Scanner/i,
    /Barcode/i
  ];
  
  const hasGenericScannerPattern = genericScannerPatterns.some(pattern => pattern.test(userAgent));
  
  // 4. Pattern per browser mobili
  const mobileBrowserPatterns = [
    /Mobile.*Safari/i,
    /Chrome.*Mobile/i,
    /CriOS/i, // Chrome su iOS
    /FxiOS/i, // Firefox su iOS
    /iPhone/i,
    /Android/i
  ];
  
  const isMobileBrowser = mobileBrowserPatterns.some(pattern => pattern.test(userAgent));
  const isDirectAccess = !referer || referer === '';
  const hasNoSecFetchSite = !request.headers.get('sec-fetch-site');
  
  // 5. Combinazione di indicatori per mobile + direct access
  if (isDirectAccess && isMobileBrowser && hasNoSecFetchSite) {
    if (hasGenericScannerPattern) {
      return {
        isQRCode: true,
        method: 'mobile-direct',
        confidence: 'medium'
      };
    }
    
    // Mobile direct senza scanner esplicito - bassa confidenza
    return {
      isQRCode: true,
      method: 'mobile-direct',
      confidence: 'low'
    };
  }
  
  // 6. Scanner generico ma non mobile direct
  if (hasGenericScannerPattern && isDirectAccess) {
    return {
      isQRCode: true,
      method: 'user-agent',
      confidence: 'medium'
    };
  }
  
  return {
    isQRCode: false,
    method: 'none',
    confidence: 'high'
  };
}

/**
 * Determina il referrer appropriato basato sul rilevamento QR
 */
export function getTrafficSource(request: NextRequest): string {
  const originalReferrer = request.headers.get('referer') || 'Direct';
  const qrDetection = detectQRCodeSource(request);
  
  if (qrDetection.isQRCode) {
    // Se la confidenza è alta o media, considera come QR Code
    if (qrDetection.confidence === 'high' || qrDetection.confidence === 'medium') {
      return 'QR Code';
    }
    
    // Se la confidenza è bassa, aggiungi un indicatore ma mantieni il referrer originale
    if (qrDetection.confidence === 'low' && originalReferrer === 'Direct') {
      return 'QR Code (Probable)';
    }
  }
  
  return originalReferrer;
}

/**
 * Statistiche di rilevamento per analytics
 */
export function getQRDetectionStats(request: NextRequest): {
  userAgent: string;
  isMobile: boolean;
  isDirect: boolean;
  hasSecFetch: boolean;
  qrDetection: ReturnType<typeof detectQRCodeSource>;
} {
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer');
  
  const mobileBrowserPatterns = [
    /Mobile.*Safari/i,
    /Chrome.*Mobile/i,
    /CriOS/i,
    /FxiOS/i,
    /iPhone/i,
    /Android/i
  ];
  
  return {
    userAgent,
    isMobile: mobileBrowserPatterns.some(pattern => pattern.test(userAgent)),
    isDirect: !referer || referer === '',
    hasSecFetch: !!request.headers.get('sec-fetch-site'),
    qrDetection: detectQRCodeSource(request)
  };
}
