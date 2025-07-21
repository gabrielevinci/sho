/**
 * Script per testare il rilevamento migliorato di browser, OS e geolocalizzazione
 */

import { getDeviceInfo, getGeoLocation } from './lib/database-helpers';

// Simula alcune richieste con diversi user agents
const testCases = [
  {
    name: 'Chrome Windows',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    acceptLanguage: 'it-IT,it;q=0.9,en;q=0.8'
  },
  {
    name: 'Firefox macOS',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',
    acceptLanguage: 'en-US,en;q=0.5'
  },
  {
    name: 'Safari iOS',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    acceptLanguage: 'it-IT,it;q=0.9'
  },
  {
    name: 'Edge Windows',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    acceptLanguage: 'en-US,en;q=0.9'
  },
  {
    name: 'Samsung Internet Android',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
    acceptLanguage: 'it-IT,it;q=0.9'
  },
  {
    name: 'Instagram App',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 309.0.0.0 (iPhone14,3; iOS 17_1; it_IT; it-IT; scale=3.00; 1170x2532; 472271879) NW/3',
    acceptLanguage: 'it-IT,it;q=0.9'
  }
];

function simulateRequest(testCase: any) {
  return {
    headers: {
      get: (headerName: string) => {
        switch (headerName) {
          case 'user-agent':
            return testCase.userAgent;
          case 'accept-language':
            return testCase.acceptLanguage;
          case 'x-forwarded-for':
            return '93.56.123.45'; // IP italiano di esempio
          case 'x-real-ip':
            return null;
          case 'referer':
            return 'https://google.com';
          default:
            return null;
        }
      }
    }
  } as any;
}

console.log('🧪 Test del sistema di rilevamento migliorato\n');

for (const testCase of testCases) {
  console.log(`\n--- ${testCase.name} ---`);
  const mockRequest = simulateRequest(testCase);
  
  try {
    const deviceInfo = getDeviceInfo(mockRequest);
    console.log(`✅ Browser: ${deviceInfo.browser_name}`);
    console.log(`✅ OS: ${deviceInfo.os_name}`);
    console.log(`✅ Device: ${deviceInfo.device_type}`);
    console.log(`✅ Language: ${deviceInfo.language_device}`);
  } catch (error) {
    console.error(`❌ Errore nel rilevamento device:`, error);
  }
}

console.log('\n🌍 Test geolocalizzazione...');

async function testGeoLocation() {
  const mockRequest = {
    headers: {
      get: (headerName: string) => {
        switch (headerName) {
          case 'x-forwarded-for':
            return '8.8.8.8'; // Google DNS IP
          case 'x-real-ip':
            return null;
          default:
            return null;
        }
      }
    }
  } as any;

  try {
    const geoLocation = await getGeoLocation(mockRequest);
    console.log(`✅ Paese: ${geoLocation.country}`);
    console.log(`✅ Regione: ${geoLocation.region}`);
    console.log(`✅ Città: ${geoLocation.city}`);
  } catch (error) {
    console.error(`❌ Errore nella geolocalizzazione:`, error);
  }
}

testGeoLocation();
