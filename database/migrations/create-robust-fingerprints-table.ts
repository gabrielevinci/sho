/**
 * Migrazione per aggiungere la tabella robust_fingerprints
 * che memorizza informazioni dettagliate sui fingerprint robusti
 */

import { sql } from '@vercel/postgres';

export async function createRobustFingerprintsTable() {
  try {
    console.log('🔄 Creating robust_fingerprints table...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS robust_fingerprints (
        id SERIAL PRIMARY KEY,
        click_id INTEGER REFERENCES clicks(id) ON DELETE CASCADE,
        
        -- Identificatori del fingerprint robusto
        primary_fingerprint VARCHAR(32) NOT NULL,
        device_stable_hash VARCHAR(20) NOT NULL,
        session_hash VARCHAR(20) NOT NULL,
        correlation_key VARCHAR(16) NOT NULL,
        
        -- Componenti del fingerprint
        ip_component VARCHAR(16),
        geo_component VARCHAR(16),
        device_component VARCHAR(16), 
        browser_component VARCHAR(16),
        
        -- Informazioni geografiche dettagliate
        geo_confidence INTEGER DEFAULT 0,
        geo_source VARCHAR(50),
        detailed_ip VARCHAR(100),
        ip_hash VARCHAR(20),
        
        -- Metadati
        overall_confidence INTEGER DEFAULT 0,
        sources TEXT[], -- Array delle fonti usate
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT NOW(),
        
        -- Indici per performance
        INDEX idx_primary_fingerprint (primary_fingerprint),
        INDEX idx_device_stable_hash (device_stable_hash),
        INDEX idx_correlation_key (correlation_key),
        INDEX idx_click_id (click_id),
        INDEX idx_created_at (created_at)
      );
    `;
    
    console.log('✅ robust_fingerprints table created successfully');
    
    // Crea indici aggiuntivi per query complesse
    await sql`
      CREATE INDEX IF NOT EXISTS idx_robust_fingerprints_composite_device 
      ON robust_fingerprints (device_stable_hash, correlation_key);
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_robust_fingerprints_composite_geo 
      ON robust_fingerprints (geo_component, geo_confidence);
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_robust_fingerprints_confidence 
      ON robust_fingerprints (overall_confidence) WHERE overall_confidence >= 70;
    `;
    
    console.log('✅ Additional indexes created for robust_fingerprints table');
    
  } catch (error) {
    console.error('❌ Error creating robust_fingerprints table:', error);
    throw error;
  }
}

/**
 * Salva un fingerprint robusto nel database
 */
export async function saveRobustFingerprint(clickId: number, fingerprint: any) {
  try {
    await sql`
      INSERT INTO robust_fingerprints (
        click_id,
        primary_fingerprint,
        device_stable_hash,
        session_hash,
        correlation_key,
        ip_component,
        geo_component,
        device_component,
        browser_component,
        geo_confidence,
        geo_source,
        detailed_ip,
        ip_hash,
        overall_confidence,
        sources
      ) VALUES (
        ${clickId},
        ${fingerprint.primaryFingerprint},
        ${fingerprint.deviceStableHash},
        ${fingerprint.sessionHash},
        ${fingerprint.correlationKey},
        ${fingerprint.ipComponent},
        ${fingerprint.geoComponent},
        ${fingerprint.deviceComponent},
        ${fingerprint.browserComponent},
        ${fingerprint.geoInfo.confidence},
        ${fingerprint.geoInfo.source},
        ${fingerprint.geoInfo.ip},
        ${fingerprint.geoInfo.ipHash},
        ${fingerprint.confidence},
        ${fingerprint.sources}
      )
    `;
    
    console.log('💾 Robust fingerprint saved for click:', clickId);
  } catch (error) {
    console.error('❌ Error saving robust fingerprint:', error);
    // Non bloccare il processo se il salvataggio del fingerprint robusto fallisce
  }
}

/**
 * Trova click correlati basandosi sui fingerprint robusti
 */
export async function findCorrelatedClicks(fingerprint: any, linkId: number, timeWindow: number = 24) {
  try {
    const result = await sql`
      SELECT 
        c.id,
        c.clicked_at,
        rf.primary_fingerprint,
        rf.device_stable_hash,
        rf.session_hash,
        rf.correlation_key,
        rf.overall_confidence,
        rf.geo_confidence
      FROM clicks c
      JOIN robust_fingerprints rf ON c.id = rf.click_id
      WHERE c.link_id = ${linkId}
        AND rf.created_at >= NOW() - INTERVAL '${timeWindow} hours'
        AND (
          rf.device_stable_hash = ${fingerprint.deviceStableHash}
          OR rf.correlation_key = ${fingerprint.correlationKey}
          OR rf.primary_fingerprint = ${fingerprint.primaryFingerprint}
        )
      ORDER BY rf.overall_confidence DESC, c.clicked_at DESC
      LIMIT 50
    `;
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error finding correlated clicks:', error);
    return [];
  }
}

/**
 * Ottiene statistiche sui fingerprint robusti
 */
export async function getRobustFingerprintStats(linkId?: number) {
  try {
    const whereClause = linkId ? `WHERE c.link_id = ${linkId}` : '';
    
    const result = await sql`
      SELECT 
        COUNT(*) as total_fingerprints,
        AVG(rf.overall_confidence) as avg_confidence,
        AVG(rf.geo_confidence) as avg_geo_confidence,
        COUNT(DISTINCT rf.device_stable_hash) as unique_devices,
        COUNT(DISTINCT rf.correlation_key) as unique_correlations,
        COUNT(DISTINCT rf.geo_component) as unique_geo_components,
        array_agg(DISTINCT rf.geo_source) as geo_sources_used
      FROM robust_fingerprints rf
      JOIN clicks c ON rf.click_id = c.id
      ${whereClause}
    `;
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error getting robust fingerprint stats:', error);
    return null;
  }
}
