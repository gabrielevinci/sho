import { sql } from '@vercel/postgres';

// Configura la variabile d'ambiente se non è già settata
if (!process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL = "postgres://neondb_owner:npg_Avg8n0iImOko@ep-bitter-wildflower-a2ysw8zc-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
}

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Controllo struttura database...');
    
    // Lista tutte le tabelle
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('\n📋 Tabelle esistenti:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Controlla struttura tabella clicks
    console.log('\n📊 Struttura tabella clicks:');
    const clicksColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'clicks'
      ORDER BY ordinal_position
    `;
    
    clicksColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Controlla se esistono enhanced_fingerprints e fingerprint_correlations
    const enhancedExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'enhanced_fingerprints'
      )
    `;
    
    const correlationsExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'fingerprint_correlations'
      )
    `;
    
    console.log(`\n🔗 enhanced_fingerprints esiste: ${enhancedExists.rows[0].exists}`);
    console.log(`🔗 fingerprint_correlations esiste: ${correlationsExists.rows[0].exists}`);
    
    if (enhancedExists.rows[0].exists) {
      console.log('\n📊 Struttura tabella enhanced_fingerprints:');
      const enhancedColumns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'enhanced_fingerprints'
        ORDER BY ordinal_position
      `;
      
      enhancedColumns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    if (correlationsExists.rows[0].exists) {
      console.log('\n📊 Struttura tabella fingerprint_correlations:');
      const correlationsColumns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'fingerprint_correlations'
        ORDER BY ordinal_position
      `;
      
      correlationsColumns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

checkDatabaseStructure();
