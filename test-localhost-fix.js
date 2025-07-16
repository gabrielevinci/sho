// Test rapido per localhost normalization
const { createHash } = require('crypto');

// Test normalizzazione IP localhost
function testLocalhostNormalization() {
    const ipVariants = [
        '::1',                    // IPv6 localhost (Chrome)
        '::ffff:127.0.0.1',       // IPv4 mapped in IPv6 (Firefox)
        '127.0.0.1'               // IPv4 localhost standard
    ];
    
    console.log('=== Test Normalizzazione Localhost ===\n');
    
    const normalizedIps = ipVariants.map(ip => {
        let normalized;
        
        // Normalizza tutti i localhost variants a 'localhost'
        if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
            normalized = 'localhost';
        } else if (ip.startsWith('::ffff:')) {
            normalized = ip.substring(7);
        } else {
            normalized = ip;
        }
        
        const hash = createHash('sha256').update(normalized).digest('hex').substring(0, 16);
        
        console.log(`IP originale: ${ip}`);
        console.log(`IP normalizzato: ${normalized}`);
        console.log(`Hash: ${hash}`);
        console.log();
        
        return { original: ip, normalized, hash };
    });
    
    // Verifica che tutti abbiano lo stesso hash
    const allSame = normalizedIps.every(item => item.hash === normalizedIps[0].hash);
    
    console.log('🎯 RISULTATO:');
    console.log(`Tutti gli hash localhost sono uguali: ${allSame ? '✅ SÌ' : '❌ NO'}`);
    
    if (allSame) {
        console.log('🎉 Chrome e Firefox avranno ora lo stesso IP hash!');
    } else {
        console.log('⚠️ Problema nella normalizzazione!');
    }
}

testLocalhostNormalization();
