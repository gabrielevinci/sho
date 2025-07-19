import { sql } from '@vercel/postgres';

// Configura la variabile d'ambiente se non è già settata
if (!process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL = "postgres://neondb_owner:npg_Avg8n0iImOko@ep-bitter-wildflower-a2ysw8zc-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
}

async function createTestLink() {
  try {
    console.log('🔧 Creazione link di test con data più vecchia...\n');
    
    // Simula un link creato 45 giorni fa
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
    
    console.log(`📅 Data simulata: ${fortyFiveDaysAgo.toISOString()}`);
    
    // Aggiorna il link esistente con una data di creazione più vecchia
    const updateResult = await sql`
      UPDATE links 
      SET created_at = ${fortyFiveDaysAgo.toISOString()}
      WHERE short_code = 'qskNsOk'
      RETURNING short_code, created_at
    `;
    
    if (updateResult.rows.length > 0) {
      const updated = updateResult.rows[0];
      console.log(`✅ Link aggiornato: ${updated.short_code}`);
      console.log(`📅 Nuova data di creazione: ${new Date(updated.created_at).toISOString().split('T')[0]}`);
      
      // Calcola il nuovo range per "always"
      const today = new Date();
      const daysDiff = Math.ceil((today.getTime() - new Date(updated.created_at).getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`📊 Il filtro "always" ora mostrerà ${daysDiff} giorni invece di 30!`);
      console.log(`🎯 Range: ${new Date(updated.created_at).toISOString().split('T')[0]} → ${today.toISOString().split('T')[0]}`);
      
    } else {
      console.log('❌ Errore nell\'aggiornamento del link');
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

createTestLink();
