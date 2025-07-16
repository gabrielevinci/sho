/**
 * Test script to debug Opera fingerprinting issue
 */

import { sql } from '@vercel/postgres';

async function debugFingerprintIssue() {
  console.log('🔍 Debugging Opera fingerprint issue...\n');

  try {
    // 1. Controlla quanti click totali abbiamo
    const totalClicks = await sql`
      SELECT link_id, COUNT(*) as total_clicks 
      FROM clicks 
      GROUP BY link_id 
      ORDER BY link_id
    `;
    
    console.log('📊 Total clicks per link:');
    totalClicks.rows.forEach(row => {
      console.log(`  Link ${row.link_id}: ${row.total_clicks} clicks`);
    });
    console.log('');

    // 2. Controlla i fingerprint migliorati
    const enhancedFingerprints = await sql`
      SELECT 
        link_id,
        browser_type,
        device_fingerprint,
        browser_fingerprint,
        user_agent,
        created_at,
        visit_count
      FROM enhanced_fingerprints 
      ORDER BY link_id, created_at
    `;
    
    console.log('🔑 Enhanced fingerprints:');
    enhancedFingerprints.rows.forEach(row => {
      console.log(`  Link ${row.link_id} - ${row.browser_type}:`);
      console.log(`    Device FP: ${row.device_fingerprint}`);
      console.log(`    Browser FP: ${row.browser_fingerprint}`);
      console.log(`    User Agent: ${row.user_agent?.substring(0, 80)}...`);
      console.log(`    Visit Count: ${row.visit_count}`);
      console.log(`    Created: ${row.created_at}`);
      console.log('');
    });

    // 3. Controlla le correlazioni
    const correlations = await sql`
      SELECT 
        device_cluster_id,
        fingerprint_hash,
        correlation_type,
        confidence_score,
        first_correlated,
        last_confirmed
      FROM fingerprint_correlations 
      ORDER BY device_cluster_id, first_correlated
    `;
    
    console.log('🔗 Fingerprint correlations:');
    if (correlations.rows.length === 0) {
      console.log('  No correlations found!');
    } else {
      correlations.rows.forEach(row => {
        console.log(`  Cluster: ${row.device_cluster_id}`);
        console.log(`    Fingerprint: ${row.fingerprint_hash}`);
        console.log(`    Type: ${row.correlation_type}, Confidence: ${row.confidence_score}`);
        console.log(`    First: ${row.first_correlated}, Last: ${row.last_confirmed}`);
        console.log('');
      });
    }

    // 4. Controlla i contatori unici sui link
    const linkStats = await sql`
      SELECT 
        id,
        short_code,
        click_count,
        unique_click_count,
        original_url
      FROM links 
      ORDER BY id
    `;
    
    console.log('📈 Link statistics:');
    linkStats.rows.forEach(row => {
      console.log(`  ${row.short_code} (ID: ${row.id}):`);
      console.log(`    Total clicks: ${row.click_count}`);
      console.log(`    Unique clicks: ${row.unique_click_count}`);
      console.log(`    URL: ${row.original_url}`);
      console.log('');
    });

    // 5. Analizza potenziali problemi
    console.log('🔎 Analysis:');
    
    // Controlla se abbiamo browser che dovrebbero essere correlati
    const deviceGroups = new Map();
    enhancedFingerprints.rows.forEach(row => {
      const deviceFp = row.device_fingerprint;
      if (!deviceGroups.has(deviceFp)) {
        deviceGroups.set(deviceFp, []);
      }
      deviceGroups.get(deviceFp).push(row);
    });

    deviceGroups.forEach((browsers, deviceFp) => {
      if (browsers.length > 1) {
        console.log(`  Device ${deviceFp} has ${browsers.length} browsers:`);
        browsers.forEach(b => {
          console.log(`    - ${b.browser_type} (${b.browser_fingerprint})`);
        });
        console.log('');
      }
    });

  } catch (error) {
    console.error('❌ Error in debug script:', error);
  }
}

// Esegui il debug
debugFingerprintIssue().then(() => {
  console.log('✅ Debug completed');
}).catch(console.error);
