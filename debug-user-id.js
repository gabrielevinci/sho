/**
 * Script di debug per verificare se il campo user_id nella tabella links
 * viene popolato correttamente quando si crea un nuovo link
 */

const { sql } = require('@vercel/postgres');

async function checkLinksUserIds() {
  try {
    console.log('🔍 Verificando i campi user_id nella tabella links...\n');

    // 1. Verifica la struttura della tabella
    console.log('📋 Struttura della tabella links:');
    const tableStructure = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'links' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    console.table(tableStructure.rows);
    console.log('\n');

    // 2. Conta i link totali
    const totalLinks = await sql`SELECT COUNT(*) as total FROM links`;
    console.log(`📊 Totale link nella tabella: ${totalLinks.rows[0].total}\n`);

    // 3. Conta i link con user_id NULL
    const nullUserIds = await sql`SELECT COUNT(*) as null_count FROM links WHERE user_id IS NULL`;
    console.log(`❌ Link con user_id NULL: ${nullUserIds.rows[0].null_count}`);

    // 4. Conta i link con user_id valorizzato
    const validUserIds = await sql`SELECT COUNT(*) as valid_count FROM links WHERE user_id IS NOT NULL`;
    console.log(`✅ Link con user_id valorizzato: ${validUserIds.rows[0].valid_count}\n`);

    // 5. Mostra alcuni esempi di link con dettagli
    console.log('📝 Esempi di link (ultimi 10 creati):');
    const sampleLinks = await sql`
      SELECT id, short_code, user_id, workspace_id, created_at, title
      FROM links 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    console.table(sampleLinks.rows);
    console.log('\n');

    // 6. Verifica utenti nella tabella users
    console.log('👤 Utenti registrati:');
    const users = await sql`
      SELECT id, email, created_at
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    console.table(users.rows);
    console.log('\n');

    // 7. Verifica workspace
    console.log('🏢 Workspace disponibili:');
    const workspaces = await sql`
      SELECT id, user_id, name, created_at
      FROM workspaces 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    console.table(workspaces.rows);

  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
  }
}

// Esegui il controllo
checkLinksUserIds().then(() => {
  console.log('\n✅ Verifica completata!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Errore fatale:', error);
  process.exit(1);
});
