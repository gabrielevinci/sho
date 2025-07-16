// Test per verificare la correlazione cross-browser
const { generatePhysicalDeviceFingerprint } = require('./lib/enhanced-fingerprint.ts');

// Mock della NextRequest
function createMockNextRequest(userAgent, ip = '192.168.1.100') {
    const headers = new Map();
    headers.set('user-agent', userAgent);
    headers.set('accept-language', 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7');
    headers.set('x-forwarded-for', ip);
    
    return {
        headers: {
            get: (key) => headers.get(key.toLowerCase())
        }
    };
}

async function testCrossBrowserCorrelation() {
    console.log('=== Test Correlazione Cross-Browser ===\n');
    
    const testIP = '192.168.1.100';
    console.log(`🌐 Test con IP: ${testIP}\n`);

    // Test 1: Chrome
    console.log('🌐 Test 1: Chrome');
    const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const chromeRequest = createMockNextRequest(chromeUA, testIP);
    
    const chromeFingerprint = generatePhysicalDeviceFingerprint(chromeRequest);
    
    console.log(`Device Fingerprint Chrome: ${chromeFingerprint.deviceFingerprint}`);
    console.log(`Browser Fingerprint Chrome: ${chromeFingerprint.browserFingerprint}`);
    console.log();

    // Test 2: Firefox
    console.log('🦊 Test 2: Firefox');
    const firefoxUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';
    const firefoxRequest = createMockNextRequest(firefoxUA, testIP);
    
    const firefoxFingerprint = generatePhysicalDeviceFingerprint(firefoxRequest);
    
    console.log(`Device Fingerprint Firefox: ${firefoxFingerprint.deviceFingerprint}`);
    console.log(`Browser Fingerprint Firefox: ${firefoxFingerprint.browserFingerprint}`);
    console.log();

    // Test 3: Edge
    console.log('🔷 Test 3: Edge');
    const edgeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
    const edgeRequest = createMockNextRequest(edgeUA, testIP);
    
    const edgeFingerprint = generatePhysicalDeviceFingerprint(edgeRequest);
    
    console.log(`Device Fingerprint Edge: ${edgeFingerprint.deviceFingerprint}`);
    console.log(`Browser Fingerprint Edge: ${edgeFingerprint.browserFingerprint}`);
    console.log();

    // Verifica correlazione
    console.log('✅ Verifica Correlazione:');
    const chromeDeviceHash = chromeFingerprint.deviceFingerprint;
    const firefoxDeviceHash = firefoxFingerprint.deviceFingerprint;
    const edgeDeviceHash = edgeFingerprint.deviceFingerprint;
    
    console.log(`Chrome vs Firefox Device Hash uguale: ${chromeDeviceHash === firefoxDeviceHash ? '✅ SÌ' : '❌ NO'}`);
    console.log(`Chrome vs Edge Device Hash uguale: ${chromeDeviceHash === edgeDeviceHash ? '✅ SÌ' : '❌ NO'}`);
    console.log(`Firefox vs Edge Device Hash uguale: ${firefoxDeviceHash === edgeDeviceHash ? '✅ SÌ' : '❌ NO'}`);
    console.log();

    // Verifica che browser hash siano diversi (come devono essere)
    console.log('🔍 Verifica Browser Hash (devono essere diversi):');
    const chromeBrowserHash = chromeFingerprint.browserFingerprint;
    const firefoxBrowserHash = firefoxFingerprint.browserFingerprint;
    const edgeBrowserHash = edgeFingerprint.browserFingerprint;
    
    console.log(`Chrome vs Firefox Browser Hash diverso: ${chromeBrowserHash !== firefoxBrowserHash ? '✅ SÌ' : '❌ NO'}`);
    console.log(`Chrome vs Edge Browser Hash diverso: ${chromeBrowserHash !== edgeBrowserHash ? '✅ SÌ' : '❌ NO'}`);
    console.log(`Firefox vs Edge Browser Hash diverso: ${firefoxBrowserHash !== edgeBrowserHash ? '✅ SÌ' : '❌ NO'}`);
    console.log();

    // Mostra dettagli aggiuntivi
    console.log('🔧 Dettagli Fingerprint:');
    console.log(`Chrome IP Hash: ${chromeFingerprint.ipHash}`);
    console.log(`Firefox IP Hash: ${firefoxFingerprint.ipHash}`);
    console.log(`Edge IP Hash: ${edgeFingerprint.ipHash}`);
    console.log();

    console.log(`Chrome Screen: ${chromeFingerprint.screenResolution}`);
    console.log(`Firefox Screen: ${firefoxFingerprint.screenResolution}`);
    console.log(`Edge Screen: ${edgeFingerprint.screenResolution}`);
    console.log();

    console.log(`Chrome Timezone: ${chromeFingerprint.timezoneFingerprint}`);
    console.log(`Firefox Timezone: ${firefoxFingerprint.timezoneFingerprint}`);
    console.log(`Edge Timezone: ${edgeFingerprint.timezoneFingerprint}`);
    console.log();

    // Test risultato finale
    const allDeviceHashesEqual = chromeDeviceHash === firefoxDeviceHash && firefoxDeviceHash === edgeDeviceHash;
    const allBrowserHashesDifferent = chromeBrowserHash !== firefoxBrowserHash && 
                                     chromeBrowserHash !== edgeBrowserHash && 
                                     firefoxBrowserHash !== edgeBrowserHash;

    console.log('🏆 RISULTATO FINALE:');
    console.log(`Device Hash identico per tutti i browser: ${allDeviceHashesEqual ? '✅ SUCCESSO' : '❌ FALLITO'}`);
    console.log(`Browser Hash diversi per ogni browser: ${allBrowserHashesDifferent ? '✅ SUCCESSO' : '❌ FALLITO'}`);
    
    if (allDeviceHashesEqual && allBrowserHashesDifferent) {
        console.log('🎉 Test SUPERATO! La correlazione cross-browser funziona correttamente!');
    } else {
        console.log('⚠️ Test FALLITO! La correlazione cross-browser necessita di ulteriori aggiustamenti.');
        
        // Debug informazioni
        console.log('\n🔍 Debug - Hash completi:');
        console.log(`Chrome Device: ${chromeDeviceHash}`);
        console.log(`Firefox Device: ${firefoxDeviceHash}`);
        console.log(`Edge Device: ${edgeDeviceHash}`);
    }
}

// Esegui il test
testCrossBrowserCorrelation().catch(console.error);
