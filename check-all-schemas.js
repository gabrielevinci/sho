require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkAllLinksTableSchemas() {
  try {
    console.log('🔍 Controllo tutti gli schemi e le tabelle "links"...');
    
    // Controlla tutti gli schemi che contengono una tabella links
    const schemas = await sql`
      SELECT 
        table_schema,
        table_name,
        table_type
      FROM information_schema.tables 
      WHERE table_name = 'links'
      ORDER BY table_schema;
    `;
    
    console.table(schemas.rows);
    
    if (schemas.rows.length > 1) {
      console.log('\n⚠️  ATTENZIONE: Trovate multiple tabelle "links" in schemi diversi!');
      
      // Per ogni schema, controlla la struttura delle colonne
      for (const schema of schemas.rows) {
        console.log(`\n📋 Struttura tabella links nello schema "${schema.table_schema}":`);
        
        const columns = await sql`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = 'links' 
          AND table_schema = ${schema.table_schema}
          ORDER BY ordinal_position
        `;
        
        console.table(columns.rows);
      }
    }
    
    // Controlla anche quale schema viene usato di default
    console.log('\n🔧 Schema search path corrente:');
    const searchPath = await sql`SHOW search_path`;
    console.log('Search path:', searchPath.rows[0]);
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

checkAllLinksTableSchemas();
