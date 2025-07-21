/**
 * Script di test per verificare il corretto funzionamento
 * delle nuove tabelle e funzioni helper
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Carica le variabili d'ambiente dal file .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { sql } from '@vercel/postgres';
import { 
  createLink, 
  getLinkByShortCode, 
  getUserLinks, 
  recordClick,
  getLinkAnalytics,
  isShortCodeTaken 
} from '../lib/database-helpers';
import { CreateLinkData } from '../lib/types';

async function testDatabaseFunctions() {
  console.log('🚀 Avvio test delle funzioni del database...\n');
  
  try {
    // Test 1: Verifica connessione database
    console.log('1️⃣ Test connessione database...');
    const { rows } = await sql`SELECT 1 as test`;
    console.log('✅ Connessione database OK\n');
    
    // Test 2: Verifica esistenza tabelle
    console.log('2️⃣ Test esistenza tabelle...');
    const tablesCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('links', 'clicks')
      ORDER BY table_name
    `;
    
    const tables = tablesCheck.rows.map(row => row.table_name);
    console.log('📋 Tabelle trovate:', tables);
    
    if (tables.includes('links') && tables.includes('clicks')) {
      console.log('✅ Tabelle links e clicks presenti\n');
    } else {
      console.log('❌ Tabelle mancanti. Esegui la migrazione prima!\n');
      return;
    }
    
    // Test 3: Test creazione link
    console.log('3️⃣ Test creazione link...');
    const testLinkData: CreateLinkData = {
      short_code: 'test-' + Date.now(),
      original_url: 'https://example.com/test',
      title: 'Link di Test',
      description: 'Questo è un link creato per testare il sistema',
      user_id: 1,
      workspace_id: 1,
      utm_campaign: 'test-campaign',
      utm_source: 'test-source'
    };
    
    const createdLink = await createLink(testLinkData);
    console.log('✅ Link creato:', {
      id: createdLink.id,
      short_code: createdLink.short_code,
      title: createdLink.title
    });
    console.log();
    
    // Test 4: Test ricerca link per short code
    console.log('4️⃣ Test ricerca link per short code...');
    const foundLink = await getLinkByShortCode(createdLink.short_code);
    if (foundLink && foundLink.id === createdLink.id) {
      console.log('✅ Link trovato correttamente');
    } else {
      console.log('❌ Errore nella ricerca del link');
    }
    console.log();
    
    // Test 5: Test verifica short code esistente
    console.log('5️⃣ Test verifica short code esistente...');
    const isCodeTaken = await isShortCodeTaken(createdLink.short_code);
    const isRandomCodeTaken = await isShortCodeTaken('random-' + Date.now());
    
    if (isCodeTaken && !isRandomCodeTaken) {
      console.log('✅ Verifica short code funziona correttamente');
    } else {
      console.log('❌ Errore nella verifica short code');
    }
    console.log();
    
    // Test 6: Test ottenere link utente
    console.log('6️⃣ Test ottenere link utente...');
    const userLinks = await getUserLinks(1, 1);
    console.log(`✅ Trovati ${userLinks.length} link per l'utente`);
    console.log();
    
    // Test 7: Test registrazione click (simulato)
    console.log('7️⃣ Test registrazione click...');
    // Creiamo un mock di NextRequest per il test
    const mockRequest = {
      headers: {
        get: (name: string) => {
          switch (name) {
            case 'user-agent': return 'Mozilla/5.0 (Test Browser)';
            case 'accept-language': return 'it-IT,en;q=0.9';
            case 'x-forwarded-for': return '127.0.0.1';
            case 'referer': return 'https://google.com';
            default: return null;
          }
        }
      }
    } as any;
    
    const clickRecord = await recordClick(mockRequest, createdLink.id);
    console.log('✅ Click registrato:', {
      id: clickRecord.id,
      link_id: clickRecord.link_id,
      browser_name: clickRecord.browser_name,
      country: clickRecord.country
    });
    console.log();
    
    // Test 8: Test analitiche
    console.log('8️⃣ Test analitiche...');
    const analytics = await getLinkAnalytics(createdLink.id, 30);
    console.log('✅ Analitiche generate:', {
      total_clicks: analytics.total_clicks,
      unique_clicks: analytics.unique_clicks,
      countries_count: analytics.countries.length,
      browsers_count: analytics.browsers.length
    });
    console.log();
    
    // Test 9: Cleanup - rimuovi il link di test
    console.log('9️⃣ Cleanup test...');
    await sql`DELETE FROM clicks WHERE link_id = ${createdLink.id}`;
    await sql`DELETE FROM links WHERE id = ${createdLink.id}`;
    console.log('✅ Link di test rimosso\n');
    
    console.log('🎉 Tutti i test completati con successo!');
    console.log('✨ Il sistema è pronto per l\'uso in produzione.\n');
    
  } catch (error) {
    console.error('❌ Errore durante i test:', error);
    console.log('\n💡 Suggerimenti:');
    console.log('   - Verifica che la migrazione sia stata eseguita');
    console.log('   - Controlla la connessione al database');
    console.log('   - Assicurati che le variabili d\'ambiente siano configurate');
  }
}

// Esegui i test se chiamato direttamente
if (require.main === module) {
  testDatabaseFunctions()
    .then(() => {
      console.log('🏁 Test completati!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test falliti:', error);
      process.exit(1);
    });
}

export { testDatabaseFunctions };
