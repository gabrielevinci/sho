/**
 * Migrazione per ripristinare le tabelle links e clicks
 * secondo le nuove specifiche del database
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Carica le variabili d'ambiente dal file .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { sql } from '@vercel/postgres';

export async function resetLinksAndClicksTables() {
  console.log('🔄 Avvio reset delle tabelle links e clicks...');
  
  try {
    // 1. Drop delle tabelle esistenti
    console.log('📋 Eliminazione tabelle esistenti...');
    
    await sql`DROP TABLE IF EXISTS clicks CASCADE`;
    console.log('✅ Tabella clicks eliminata');
    
    await sql`DROP TABLE IF EXISTS links CASCADE`;
    console.log('✅ Tabella links eliminata');
    
    // 2. Creazione tabella links con la nuova struttura
    console.log('🔨 Creazione nuova tabella links...');
    
    await sql`
      CREATE TABLE links (
        id SERIAL PRIMARY KEY,
        short_code VARCHAR(255) NOT NULL UNIQUE,
        original_url TEXT NOT NULL,
        title VARCHAR(500),
        description TEXT,
        user_id UUID,
        workspace_id UUID,
        folder_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        utm_campaign VARCHAR(255),
        utm_source VARCHAR(255),
        utm_content VARCHAR(255),
        utm_medium VARCHAR(255),
        utm_term VARCHAR(255)
      )
    `;
    
    // Indici per migliorare le performance
    await sql`CREATE INDEX idx_links_short_code ON links(short_code)`;
    await sql`CREATE INDEX idx_links_user_id ON links(user_id)`;
    await sql`CREATE INDEX idx_links_workspace_id ON links(workspace_id)`;
    await sql`CREATE INDEX idx_links_folder_id ON links(folder_id)`;
    await sql`CREATE INDEX idx_links_created_at ON links(created_at)`;
    
    console.log('✅ Tabella links creata con successo');
    
    // 3. Creazione tabella clicks con la nuova struttura
    console.log('🔨 Creazione nuova tabella clicks...');
    
    await sql`
      CREATE TABLE clicks (
        id SERIAL PRIMARY KEY,
        link_id INTEGER NOT NULL,
        clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        clicked_at_rome TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Rome'),
        country VARCHAR(100),
        region VARCHAR(100),
        city VARCHAR(100),
        referrer TEXT,
        browser_name VARCHAR(50),
        language_device VARCHAR(10),
        device_type VARCHAR(20),
        os_name VARCHAR(50),
        ip_address INET,
        user_agent TEXT,
        timezone_device VARCHAR(50),
        click_fingerprint_hash VARCHAR(64),
        FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
      )
    `;
    
    // Indici per migliorare le performance
    await sql`CREATE INDEX idx_clicks_link_id ON clicks(link_id)`;
    await sql`CREATE INDEX idx_clicks_clicked_at ON clicks(clicked_at)`;
    await sql`CREATE INDEX idx_clicks_clicked_at_rome ON clicks(clicked_at_rome)`;
    await sql`CREATE INDEX idx_clicks_country ON clicks(country)`;
    await sql`CREATE INDEX idx_clicks_fingerprint_hash ON clicks(click_fingerprint_hash)`;
    await sql`CREATE INDEX idx_clicks_ip_address ON clicks(ip_address)`;
    
    console.log('✅ Tabella clicks creata con successo');
    
    console.log('🎉 Reset delle tabelle completato con successo!');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Errore durante il reset delle tabelle:', error);
    throw error;
  }
}

// Esegui la migrazione se chiamato direttamente
if (require.main === module) {
  resetLinksAndClicksTables()
    .then(() => {
      console.log('✨ Reset delle tabelle completato!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Reset fallito:', error);
      process.exit(1);
    });
}
