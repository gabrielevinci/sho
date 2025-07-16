// Simulazione semplice per testare la logica cross-browser
import { UAParser } from 'ua-parser-js';
import { createHash } from 'crypto';

// Test User Agents
const userAgents = {
    chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
};

// Funzione semplificata per generare device fingerprint
function generateDeviceFingerprint(userAgent, ip = '192.168.1.100') {
    const parser = new UAParser(userAgent);
    const os = parser.getOS();
    
    // IP Hash (uguale per tutti)
    const ipHash = createHash('sha256').update(ip).digest('hex').substring(0, 16);
    
    // OS Family normalizzato (dovrebbe essere uguale per tutti)
    const osFamily = os.name === 'Windows' ? 'Windows' : os.name || 'unknown';
    
    // Device elements che dovrebbero essere identici tra browser
    const physicalElements = [
        ipHash,
        osFamily,
        'Europe/Rome',      // timezone
        '-60',              // timezone offset  
        '1920x1080',        // screen resolution
        '24',               // color depth
        '8'                 // hardware concurrency
    ];
    
    const deviceFingerprint = createHash('sha256')
        .update(physicalElements.join('|'))
        .digest('hex')
        .substring(0, 32);
    
    // Browser fingerprint che dovrebbe essere diverso
    const browserElements = [
        userAgent,
        parser.getBrowser().name || 'unknown',
        parser.getBrowser().version || 'unknown'
    ];
    
    const browserFingerprint = createHash('sha256')
        .update(browserElements.join('|'))
        .digest('hex')
        .substring(0, 32);
    
    return {
        deviceFingerprint,
        browserFingerprint,
        osName: os.name,
        browserName: parser.getBrowser().name,
        physicalElements,
        browserElements
    };
}

console.log('=== Test Correlazione Cross-Browser ===\n');

const results: Record<string, any> = {};

// Test tutti i browser
Object.entries(userAgents).forEach(([browser, ua]) => {
    console.log(`🔍 Test ${browser.toUpperCase()}:`);
    const result = generateDeviceFingerprint(ua);
    results[browser] = result;
    
    console.log(`  OS: ${result.osName}`);
    console.log(`  Browser: ${result.browserName}`);
    console.log(`  Device Hash: ${result.deviceFingerprint}`);
    console.log(`  Browser Hash: ${result.browserFingerprint}`);
    console.log(`  Physical Elements: ${result.physicalElements.join(' | ')}`);
    console.log();
});

// Verifica correlazione
console.log('✅ Verifica Correlazione Device Hash:');
const chromeDevice = results['chrome'].deviceFingerprint;
const firefoxDevice = results['firefox'].deviceFingerprint;
const edgeDevice = results['edge'].deviceFingerprint;

console.log(`Chrome vs Firefox: ${chromeDevice === firefoxDevice ? '✅ UGUALE' : '❌ DIVERSO'}`);
console.log(`Chrome vs Edge: ${chromeDevice === edgeDevice ? '✅ UGUALE' : '❌ DIVERSO'}`);
console.log(`Firefox vs Edge: ${firefoxDevice === edgeDevice ? '✅ UGUALE' : '❌ DIVERSO'}`);
console.log();

console.log('🔍 Verifica Browser Hash (devono essere diversi):');
const chromeBrowser = results['chrome'].browserFingerprint;
const firefoxBrowser = results['firefox'].browserFingerprint;
const edgeBrowser = results['edge'].browserFingerprint;

console.log(`Chrome vs Firefox: ${chromeBrowser !== firefoxBrowser ? '✅ DIVERSO' : '❌ UGUALE'}`);
console.log(`Chrome vs Edge: ${chromeBrowser !== edgeBrowser ? '✅ DIVERSO' : '❌ UGUALE'}`);
console.log(`Firefox vs Edge: ${firefoxBrowser !== edgeBrowser ? '✅ DIVERSO' : '❌ UGUALE'}`);
console.log();

// Risultato finale
const deviceHashSuccess = chromeDevice === firefoxDevice && firefoxDevice === edgeDevice;
const browserHashSuccess = chromeBrowser !== firefoxBrowser && chromeBrowser !== edgeBrowser && firefoxBrowser !== edgeBrowser;

console.log('🏆 RISULTATO FINALE:');
console.log(`Device Hash identici: ${deviceHashSuccess ? '✅ SUCCESSO' : '❌ FALLITO'}`);
console.log(`Browser Hash diversi: ${browserHashSuccess ? '✅ SUCCESSO' : '❌ FALLITO'}`);

if (deviceHashSuccess && browserHashSuccess) {
    console.log('🎉 Test SUPERATO! La correlazione cross-browser funziona!');
} else {
    console.log('⚠️ Test FALLITO! Necessari aggiustamenti.');
    
    console.log('\n🔍 Debug Hash:');
    console.log(`Chrome Device: ${chromeDevice}`);
    console.log(`Firefox Device: ${firefoxDevice}`);
    console.log(`Edge Device: ${edgeDevice}`);
}
