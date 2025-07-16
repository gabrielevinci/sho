// Debug del fingerprinting con dati reali dal database
const { generatePhysicalDeviceFingerprint } = require('./lib/enhanced-fingerprint.ts');

// Simula richieste reali con diversi browser
function createRealRequest(userAgent, additionalHeaders = {}) {
    const headers = new Map();
    
    // Headers base comuni
    headers.set('user-agent', userAgent);
    headers.set('accept-language', 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7');
    headers.set('x-forwarded-for', '79.21.148.203'); // IP reale dal tuo database
    
    // Headers Vercel che potrebbero essere diversi
    headers.set('x-vercel-ip-timezone', 'Europe/Rome');
    headers.set('x-vercel-ip-country', 'IT');
    headers.set('x-vercel-ip-country-region', 'LZ');
    headers.set('x-vercel-ip-city', 'Rome');
    
    // Accept headers specifici per browser
    Object.entries(additionalHeaders).forEach(([key, value]) => {
        headers.set(key, value);
    });
    
    return {
        headers: {
            get: (key) => headers.get(key.toLowerCase())
        }
    };
}

console.log('=== Debug Fingerprinting con Dati Reali ===\n');

// Test con User Agent reali che potresti aver usato
const realUserAgents = {
    chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'
};

const results = {};

// Test ogni browser
Object.entries(realUserAgents).forEach(([browser, ua]) => {
    console.log(`🔍 Test ${browser.toUpperCase()}:`);
    
    // Accept headers specifici per ogni browser
    const specificHeaders = {};
    if (browser === 'chrome') {
        specificHeaders['accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
        specificHeaders['accept-encoding'] = 'gzip, deflate, br, zstd';
    } else if (browser === 'firefox') {
        specificHeaders['accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
        specificHeaders['accept-encoding'] = 'gzip, deflate, br';
    } else if (browser === 'edge') {
        specificHeaders['accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
        specificHeaders['accept-encoding'] = 'gzip, deflate, br, zstd';
    }
    
    const request = createRealRequest(ua, specificHeaders);
    const fingerprint = generatePhysicalDeviceFingerprint(request);
    results[browser] = fingerprint;
    
    console.log(`  User Agent: ${ua.substring(0, 60)}...`);
    console.log(`  Device Fingerprint: ${fingerprint.deviceFingerprint}`);
    console.log(`  Browser Fingerprint: ${fingerprint.browserFingerprint}`);
    console.log(`  IP Hash: ${fingerprint.ipHash}`);
    console.log(`  OS Family: ${fingerprint.osFamily}`);
    console.log(`  Browser Type: ${fingerprint.browserType}`);
    console.log(`  Confidence: ${fingerprint.confidence}%`);
    console.log(`  Correlation Factors: ${fingerprint.correlationFactors.join(', ')}`);
    console.log();
});

// Analisi dettagliata
console.log('🔬 ANALISI DETTAGLIATA:\n');

// Verifica elementi fisici che dovrebbero essere identici
const chromeResult = results.chrome;
const firefoxResult = results.firefox;
const edgeResult = results.edge;

console.log('📊 Confronto elementi fisici:');
console.log(`IP Hash identico: ${chromeResult.ipHash === firefoxResult.ipHash && firefoxResult.ipHash === edgeResult.ipHash ? '✅' : '❌'}`);
console.log(`  Chrome: ${chromeResult.ipHash}`);
console.log(`  Firefox: ${firefoxResult.ipHash}`);
console.log(`  Edge: ${edgeResult.ipHash}`);
console.log();

console.log(`Timezone identico: ${chromeResult.timezoneFingerprint === firefoxResult.timezoneFingerprint && firefoxResult.timezoneFingerprint === edgeResult.timezoneFingerprint ? '✅' : '❌'}`);
console.log(`  Chrome: ${chromeResult.timezoneFingerprint}`);
console.log(`  Firefox: ${firefoxResult.timezoneFingerprint}`);
console.log(`  Edge: ${edgeResult.timezoneFingerprint}`);
console.log();

console.log(`OS Family identico: ${chromeResult.osFamily === firefoxResult.osFamily && firefoxResult.osFamily === edgeResult.osFamily ? '✅' : '❌'}`);
console.log(`  Chrome: ${chromeResult.osFamily}`);
console.log(`  Firefox: ${firefoxResult.osFamily}`);
console.log(`  Edge: ${edgeResult.osFamily}`);
console.log();

console.log(`Hardware Profile identico: ${chromeResult.hardwareProfile === firefoxResult.hardwareProfile && firefoxResult.hardwareProfile === edgeResult.hardwareProfile ? '✅' : '❌'}`);
console.log(`  Chrome: ${chromeResult.hardwareProfile}`);
console.log(`  Firefox: ${firefoxResult.hardwareProfile}`);
console.log(`  Edge: ${edgeResult.hardwareProfile}`);
console.log();

// Verifica finale device fingerprint
console.log('🎯 RISULTATO DEVICE FINGERPRINT:');
const deviceMatch = chromeResult.deviceFingerprint === firefoxResult.deviceFingerprint && 
                   firefoxResult.deviceFingerprint === edgeResult.deviceFingerprint;

console.log(`Device Fingerprint identico: ${deviceMatch ? '✅ SUCCESSO' : '❌ PROBLEMA'}`);
console.log(`  Chrome: ${chromeResult.deviceFingerprint}`);
console.log(`  Firefox: ${firefoxResult.deviceFingerprint}`);
console.log(`  Edge: ${edgeResult.deviceFingerprint}`);

if (!deviceMatch) {
    console.log('\n⚠️ I device fingerprint sono diversi! Questo spiega perché nel database vedi hash diversi.');
    console.log('🔧 Dobbiamo identificare quale elemento sta causando la differenza.');
}

console.log('\n🔍 Browser Fingerprint (devono essere diversi):');
const browserDifferent = chromeResult.browserFingerprint !== firefoxResult.browserFingerprint && 
                         chromeResult.browserFingerprint !== edgeResult.browserFingerprint &&
                         firefoxResult.browserFingerprint !== edgeResult.browserFingerprint;

console.log(`Browser Fingerprint diversi: ${browserDifferent ? '✅ CORRETTO' : '❌ PROBLEMA'}`);
console.log(`  Chrome: ${chromeResult.browserFingerprint}`);
console.log(`  Firefox: ${firefoxResult.browserFingerprint}`);
console.log(`  Edge: ${edgeResult.browserFingerprint}`);
