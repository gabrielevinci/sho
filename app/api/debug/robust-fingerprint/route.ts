/**
 * API endpoint per il debug e monitoraggio del sistema di fingerprinting robusto
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { generateRobustFingerprint } from '@/lib/robust-fingerprinting';
import { getRobustFingerprintStats } from '@/database/migrations/create-robust-fingerprints-table';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const linkId = url.searchParams.get('linkId');

    switch (action) {
      case 'test':
        return await testFingerprinting(request);
      
      case 'stats':
        return await getFingerprintingStats(linkId ? parseInt(linkId) : undefined);
      
      case 'recent':
        return await getRecentFingerprints(linkId ? parseInt(linkId) : undefined);
      
      case 'correlations':
        return await getCorrelations(linkId ? parseInt(linkId) : undefined);
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          availableActions: ['test', 'stats', 'recent', 'correlations']
        });
    }
  } catch (error) {
    console.error('❌ Error in robust fingerprint debug API:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Testa il sistema di fingerprinting robusto
 */
async function testFingerprinting(request: NextRequest) {
  try {
    const fingerprint = await generateRobustFingerprint(request);
    
    return NextResponse.json({
      success: true,
      fingerprint: {
        primaryFingerprint: fingerprint.primaryFingerprint,
        deviceStableHash: fingerprint.deviceStableHash,
        sessionHash: fingerprint.sessionHash,
        correlationKey: fingerprint.correlationKey,
        confidence: fingerprint.confidence,
        sources: fingerprint.sources,
        geoInfo: {
          country: fingerprint.geoInfo.country,
          region: fingerprint.geoInfo.region,
          city: fingerprint.geoInfo.city,
          confidence: fingerprint.geoInfo.confidence,
          source: fingerprint.geoInfo.source,
          ip: fingerprint.geoInfo.ip.substring(0, 8) + '...' // Mascherato per privacy
        },
        components: {
          ipComponent: fingerprint.ipComponent,
          geoComponent: fingerprint.geoComponent,
          deviceComponent: fingerprint.deviceComponent,
          browserComponent: fingerprint.browserComponent
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Ottiene statistiche del sistema di fingerprinting
 */
async function getFingerprintingStats(linkId?: number) {
  try {
    const robustStats = await getRobustFingerprintStats(linkId);
    
    // Ottieni anche statistiche legacy per confronto
    const legacyStatsQuery = linkId ? 
      `WHERE c.link_id = ${linkId}` : '';
    
    const legacyStats = await sql`
      SELECT 
        COUNT(*) as total_clicks,
        COUNT(DISTINCT click_fingerprint_hash) as unique_legacy_fingerprints,
        COUNT(DISTINCT country) as unique_countries,
        COUNT(DISTINCT region) as unique_regions,
        COUNT(DISTINCT city) as unique_cities,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM clicks c
      ${legacyStatsQuery}
    `;
    
    return NextResponse.json({
      success: true,
      stats: {
        robust: robustStats,
        legacy: legacyStats.rows[0],
        comparison: {
          robustVsLegacyRatio: robustStats ? 
            (robustStats.total_fingerprints / legacyStats.rows[0].total_clicks) : 0,
          avgConfidenceImprovement: robustStats ? 
            robustStats.avg_confidence - 50 : 0 // 50 è la baseline legacy
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Ottiene fingerprint recenti
 */
async function getRecentFingerprints(linkId?: number) {
  try {
    const whereClause = linkId ? `WHERE c.link_id = ${linkId}` : '';
    
    const recentFingerprints = await sql`
      SELECT 
        c.id as click_id,
        c.clicked_at,
        c.country,
        c.region,
        c.city,
        c.browser_name,
        c.device_type,
        c.ip_address,
        rf.primary_fingerprint,
        rf.device_stable_hash,
        rf.correlation_key,
        rf.overall_confidence,
        rf.geo_confidence,
        rf.geo_source,
        rf.sources
      FROM clicks c
      LEFT JOIN robust_fingerprints rf ON c.id = rf.click_id
      ${whereClause}
      ORDER BY c.clicked_at DESC
      LIMIT 50
    `;
    
    return NextResponse.json({
      success: true,
      recentFingerprints: recentFingerprints.rows.map(row => ({
        ...row,
        ip_address: row.ip_address.substring(0, 8) + '...' // Maschera IP per privacy
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Analizza correlazioni tra fingerprint
 */
async function getCorrelations(linkId?: number) {
  try {
    const whereClause = linkId ? `WHERE c.link_id = ${linkId}` : '';
    
    // Trova gruppi di fingerprint correlati
    const correlations = await sql`
      SELECT 
        rf.device_stable_hash,
        rf.correlation_key,
        COUNT(*) as click_count,
        COUNT(DISTINCT rf.primary_fingerprint) as unique_sessions,
        COUNT(DISTINCT c.country) as countries_visited,
        COUNT(DISTINCT rf.geo_source) as geo_sources_used,
        AVG(rf.overall_confidence) as avg_confidence,
        MIN(c.clicked_at) as first_seen,
        MAX(c.clicked_at) as last_seen,
        array_agg(DISTINCT c.browser_name) as browsers_used,
        array_agg(DISTINCT c.device_type) as device_types_used
      FROM robust_fingerprints rf
      JOIN clicks c ON rf.click_id = c.id
      ${whereClause}
      GROUP BY rf.device_stable_hash, rf.correlation_key
      HAVING COUNT(*) > 1
      ORDER BY click_count DESC, avg_confidence DESC
      LIMIT 30
    `;
    
    // Trova potenziali problemi di geolocalizzazione
    const geoProblems = await sql`
      SELECT 
        rf.device_stable_hash,
        COUNT(DISTINCT c.country) as country_variations,
        COUNT(DISTINCT c.region) as region_variations,
        COUNT(DISTINCT c.city) as city_variations,
        COUNT(DISTINCT rf.geo_source) as source_variations,
        array_agg(DISTINCT c.country || ', ' || c.region || ', ' || c.city) as locations,
        array_agg(DISTINCT rf.geo_source) as sources,
        AVG(rf.geo_confidence) as avg_geo_confidence
      FROM robust_fingerprints rf
      JOIN clicks c ON rf.click_id = c.id
      ${whereClause}
      GROUP BY rf.device_stable_hash
      HAVING COUNT(DISTINCT c.country) > 1 OR COUNT(DISTINCT c.region) > 2
      ORDER BY country_variations DESC, region_variations DESC
      LIMIT 20
    `;
    
    return NextResponse.json({
      success: true,
      correlations: {
        deviceGroups: correlations.rows,
        geoInconsistencies: geoProblems.rows
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
