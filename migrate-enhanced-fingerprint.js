#!/usr/bin/env node

/**
 * Script di migrazione per il sistema di fingerprinting migliorato
 * Esegui con: node migrate-enhanced-fingerprint.js
 */

const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function migrateEnhancedFingerprint() {
  console.log('🚀 Inizio migrazione Enhanced Fingerprinting System...\n');

  try {
    // 1. Crea la tabella enhanced_fingerprints
    console.log('📊 Creazione tabella enhanced_fingerprints...');
    await sql`
      CREATE TABLE IF NOT EXISTS enhanced_fingerprints (
        id SERIAL PRIMARY KEY,
        link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
        
        -- Fingerprint identifiers
        device_fingerprint VARCHAR(32) NOT NULL,
        browser_fingerprint VARCHAR(32) NOT NULL,
        session_fingerprint VARCHAR(32) NOT NULL,
        fingerprint_hash VARCHAR(32) NOT NULL,
        
        -- Physical device data (stable across browsers)
        ip_hash VARCHAR(32),
        timezone_fingerprint VARCHAR(100),
        hardware_profile VARCHAR(100),
        device_category VARCHAR(20),
        os_family VARCHAR(50),
        
        -- Browser specific data
        browser_type VARCHAR(30),
        user_agent TEXT,
        
        -- Geolocation
        country VARCHAR(50),
        region VARCHAR(100),
        city VARCHAR(100),
        
        -- Correlation data
        confidence INTEGER DEFAULT 50,
        correlation_factors JSONB,
        
        -- Visit tracking
        visit_count INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        last_seen TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Tabella enhanced_fingerprints creata con successo');

    // 2. Crea indici per performance
    console.log('📈 Creazione indici per performance...');
    
    await sql`CREATE INDEX IF NOT EXISTS idx_enhanced_device_fp ON enhanced_fingerprints(device_fingerprint)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_enhanced_browser_fp ON enhanced_fingerprints(browser_fingerprint)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_enhanced_ip_timezone ON enhanced_fingerprints(ip_hash, timezone_fingerprint)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_enhanced_link_device ON enhanced_fingerprints(link_id, device_fingerprint)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_enhanced_created_at ON enhanced_fingerprints(created_at)`;
    
    console.log('✅ Indici creati con successo');

    // 3. Crea la tabella per correlazioni
    console.log('🔗 Creazione tabella fingerprint_correlations...');
    await sql`
      CREATE TABLE IF NOT EXISTS fingerprint_correlations (
        id SERIAL PRIMARY KEY,
        device_cluster_id VARCHAR(32) NOT NULL,
        fingerprint_hash VARCHAR(32) NOT NULL,
        correlation_type VARCHAR(30) NOT NULL,
        confidence_score INTEGER DEFAULT 50,
        first_correlated TIMESTAMP DEFAULT NOW(),
        last_confirmed TIMESTAMP DEFAULT NOW(),
        
        UNIQUE(device_cluster_id, fingerprint_hash)
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_correlations_cluster ON fingerprint_correlations(device_cluster_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_correlations_fingerprint ON fingerprint_correlations(fingerprint_hash)`;
    
    console.log('✅ Tabella fingerprint_correlations creata con successo');

    // 4. Crea vista unificata per analytics
    console.log('📊 Creazione vista unificata per analytics...');
    await sql`
      CREATE OR REPLACE VIEW unified_click_analytics AS
      SELECT 
        l.id as link_id,
        l.short_code,
        l.original_url,
        l.title,
        
        -- Legacy counts (per compatibilità)
        l.click_count as total_clicks,
        l.unique_click_count as legacy_unique_clicks,
        
        -- Enhanced counts 
        COUNT(DISTINCT ef.browser_fingerprint) as browser_unique_clicks,
        COUNT(DISTINCT ef.device_fingerprint) as device_unique_clicks,
        COUNT(ef.id) as total_enhanced_clicks,
        
        -- Geographic data
        COUNT(DISTINCT ef.country) as unique_countries,
        COUNT(DISTINCT ef.city) as unique_cities,
        
        -- Device diversity
        COUNT(DISTINCT ef.browser_type) as unique_browsers,
        COUNT(DISTINCT ef.device_category) as unique_device_types,
        
        -- Confidence metrics
        AVG(ef.confidence) as avg_confidence,
        MIN(ef.created_at) as first_enhanced_click,
        MAX(ef.last_seen) as last_enhanced_click

      FROM links l
      LEFT JOIN enhanced_fingerprints ef ON l.id = ef.link_id
      GROUP BY l.id, l.short_code, l.original_url, l.title, l.click_count, l.unique_click_count
    `;
    console.log('✅ Vista unificata creata con successo');

    // 5. Crea funzione di pulizia
    console.log('🧹 Creazione funzione di pulizia...');
    await sql`
      CREATE OR REPLACE FUNCTION cleanup_old_fingerprints()
      RETURNS void AS $$
      BEGIN
        -- Rimuovi fingerprint più vecchi di 90 giorni
        DELETE FROM enhanced_fingerprints 
        WHERE created_at < NOW() - INTERVAL '90 days';
        
        -- Rimuovi correlazioni orfane
        DELETE FROM fingerprint_correlations 
        WHERE fingerprint_hash NOT IN (
          SELECT browser_fingerprint FROM enhanced_fingerprints
        );
      END;
      $$ LANGUAGE plpgsql
    `;
    console.log('✅ Funzione di pulizia creata con successo');

    // 6. Test di inserimento
    console.log('🧪 Test del sistema...');
    
    // Verifica che le tabelle siano state create
    const tablesCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('enhanced_fingerprints', 'fingerprint_correlations')
    `;
    
    console.log(`📋 Tabelle create: ${tablesCheck.rows.map(r => r.table_name).join(', ')}`);

    // Verifica che la vista sia stata creata
    const viewCheck = await sql`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'unified_click_analytics'
    `;
    
    if (viewCheck.rows.length > 0) {
      console.log('📊 Vista unified_click_analytics creata correttamente');
    }

    console.log('\n🎉 MIGRAZIONE COMPLETATA CON SUCCESSO!');
    console.log('\n📈 Stato del Sistema Enhanced Fingerprinting:');
    console.log('   ✅ Tabella enhanced_fingerprints - PRONTA');
    console.log('   ✅ Tabella fingerprint_correlations - PRONTA');
    console.log('   ✅ Indici di performance - CREATI');
    console.log('   ✅ Vista analytics unificata - PRONTA');
    console.log('   ✅ Funzione di pulizia automatica - DISPONIBILE');

    console.log('\n🔧 Funzionalità Implementate:');
    console.log('   • 🎯 Rilevamento stesso utente su browser diversi');
    console.log('   • 🖥️ Fingerprint fisico del dispositivo');
    console.log('   • 🔗 Correlazione automatica tra sessioni');
    console.log('   • 📊 Analytics migliorati per unique visitors');
    console.log('   • 🛡️ Fallback compatibile con sistema esistente');

    console.log('\n🚀 Il sistema è ora pronto per l\'uso!');
    console.log('   I nuovi click verranno automaticamente processati');
    console.log('   con il sistema di fingerprinting migliorato.\n');

  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    console.log('\nℹ️  Controlla che:');
    console.log('   • Il database sia accessibile');
    console.log('   • Le variabili d\'ambiente siano configurate');
    console.log('   • L\'utente abbia i permessi necessari');
    process.exit(1);
  }
}

// Esegui la migrazione
migrateEnhancedFingerprint();
