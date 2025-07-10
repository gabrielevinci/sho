// Test completo del bug delle associazioni cartelle

const { execSync } = require('child_process');

async function testFullScenario() {
    console.log('🧪 Test completo del bug delle associazioni cartelle\n');
    
    try {
        // 1. Controlla se il database ha associazioni
        console.log('1️⃣ Controllo database diretto...');
        
        // Query per vedere le associazioni nel database
        const pgQuery = `
            SELECT 
                l.id as link_id,
                l.short_code,
                l.title,
                COUNT(lfa.folder_id) as associations_count,
                ARRAY_AGG(f.name) as folder_names
            FROM links l
            LEFT JOIN link_folder_associations lfa ON l.id = lfa.link_id
            LEFT JOIN folders f ON lfa.folder_id = f.id
            GROUP BY l.id, l.short_code, l.title
            HAVING COUNT(lfa.folder_id) > 0
            ORDER BY l.created_at DESC
            LIMIT 5;
        `;
        
        console.log('Query SQL da eseguire manualmente:');
        console.log(pgQuery);
        console.log('\n');
        
        // 2. Simula chiamata API (senza autenticazione per ora)
        console.log('2️⃣ Analisi del problema API...');
        console.log('Il problema è che l\'API /api/links-with-folders restituisce 401');
        console.log('Questo significa che la sessione non è valida o l\'utente non è autenticato');
        console.log('\n');
        
        // 3. Analizza il codice dell'API
        console.log('3️⃣ Problemi identificati:');
        console.log('- L\'API richiede autenticazione (session.isLoggedIn)');
        console.log('- Nel browser, l\'utente deve essere loggato per vedere i dati');
        console.log('- I log di debug nell\'API non appaiono perché l\'API esce prima con 401');
        console.log('\n');
        
        // 4. Soluzione proposta
        console.log('4️⃣ Soluzione proposta:');
        console.log('- Rimuovere temporaneamente i console.log per evitare problemi in produzione');
        console.log('- Testare con utente autenticato nel browser');
        console.log('- Verificare se il problema persiste dopo l\'autenticazione');
        console.log('\n');
        
        console.log('✅ Test completato. Procedi con login nel browser per testare l\'API.');
        
    } catch (error) {
        console.error('❌ Errore durante il test:', error);
    }
}

testFullScenario();
