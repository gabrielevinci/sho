/**
 * API endpoint per testare e monitorare il sistema di tracking migliorato
 * NON modifica il database - solo testing e monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReliableGeoInfo, validateAndCleanGeoData, getReliableIP } from '@/lib/improved-click-tracking';
import { geoCache } from '@/lib/geo-cache';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'test':
        return await testImprovedTracking(request);
      
      case 'cache-stats':
        return await getCacheStats();
      
      case 'compare':
        return await compareWithLegacy(request);
      
      case 'ip-test':
        return await testIPExtraction(request);
        
      case 'clear-cache':
        return await clearCache();
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          availableActions: ['test', 'cache-stats', 'compare', 'ip-test', 'clear-cache']
        });
    }
  } catch (error) {
    console.error('❌ Error in improved tracking test API:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Testa il sistema di tracking migliorato
 */
async function testImprovedTracking(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Test raccolta dati migliorata
    const improvedData = await getReliableGeoInfo(request);
    const validatedData = validateAndCleanGeoData(improvedData);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return NextResponse.json({
      success: true,
      performance: {
        duration_ms: duration,
        timestamp: new Date().toISOString()
      },
      data: {
        ip: validatedData.ip.substring(0, 8) + '...', // Mascherato per privacy
        country: validatedData.country,
        region: validatedData.region,
        city: validatedData.city,
        confidence: validatedData.confidence,
        sources: validatedData.sources,
        warnings: validatedData.warnings
      },
      quality: {
        has_country: validatedData.country !== 'Unknown',
        has_region: validatedData.region !== 'Unknown',
        has_city: validatedData.city !== 'Unknown',
        has_valid_ip: validatedData.ip !== 'unknown' && validatedData.ip !== 'localhost',
        confidence_level: validatedData.confidence >= 80 ? 'high' : 
                         validatedData.confidence >= 60 ? 'medium' : 'low'
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Ottiene statistiche della cache
 */
async function getCacheStats() {
  try {
    const stats = geoCache.getStats();
    
    return NextResponse.json({
      success: true,
      cache: {
        ...stats,
        status: stats.size > 0 ? 'active' : 'empty',
        efficiency: stats.hitRate >= 70 ? 'high' : 
                   stats.hitRate >= 40 ? 'medium' : 'low'
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
 * Confronta sistema migliorato con legacy
 */
async function compareWithLegacy(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Test sistema migliorato
    const improvedData = await getReliableGeoInfo(request);
    const improvedTime = Date.now();
    
    // Test sistema legacy
    const { getGeoLocation } = await import('@/lib/database-helpers');
    let legacyData;
    try {
      legacyData = await getGeoLocation(request);
    } catch (error) {
      legacyData = {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown'
      };
    }
    const legacyTime = Date.now();
    
    return NextResponse.json({
      success: true,
      comparison: {
        improved: {
          country: improvedData.country,
          region: improvedData.region,
          city: improvedData.city,
          confidence: improvedData.confidence,
          sources: improvedData.sources,
          warnings: improvedData.warnings,
          duration_ms: improvedTime - startTime
        },
        legacy: {
          country: legacyData.country,
          region: legacyData.region,
          city: legacyData.city,
          confidence: 50, // Legacy system default
          sources: ['legacy'],
          warnings: [],
          duration_ms: legacyTime - improvedTime
        },
        analysis: {
          data_improved: (
            (improvedData.country !== 'Unknown' && legacyData.country === 'Unknown') ||
            (improvedData.region !== 'Unknown' && legacyData.region === 'Unknown') ||
            (improvedData.city !== 'Unknown' && legacyData.city === 'Unknown')
          ),
          same_results: (
            improvedData.country === legacyData.country &&
            improvedData.region === legacyData.region &&
            improvedData.city === legacyData.city
          ),
          confidence_boost: improvedData.confidence - 50
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
 * Testa solo l'estrazione dell'IP
 */
async function testIPExtraction(request: NextRequest) {
  try {
    const ipInfo = getReliableIP(request);
    
    // Estrai tutti gli header IP per debugging
    const allHeaders = {
      'x-vercel-forwarded-for': request.headers.get('x-vercel-forwarded-for'),
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      'x-real-ip': request.headers.get('x-real-ip'),
      'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
      'x-client-ip': request.headers.get('x-client-ip')
    };
    
    return NextResponse.json({
      success: true,
      selected: {
        ip: ipInfo.ip.substring(0, 8) + '...', // Mascherato
        confidence: ipInfo.confidence,
        source: ipInfo.source
      },
      available_headers: Object.fromEntries(
        Object.entries(allHeaders).map(([key, value]) => [
          key, 
          value ? value.substring(0, 8) + '...' : null
        ])
      ),
      analysis: {
        is_private: ipInfo.ip === 'localhost' || 
                   ipInfo.ip.startsWith('192.168.') || 
                   ipInfo.ip.startsWith('10.'),
        is_valid: ipInfo.ip !== 'unknown' && ipInfo.ip.length > 0,
        quality: ipInfo.confidence >= 90 ? 'excellent' :
                ipInfo.confidence >= 80 ? 'good' :
                ipInfo.confidence >= 60 ? 'fair' : 'poor'
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
 * Pulisce la cache
 */
async function clearCache() {
  try {
    geoCache.clear();
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
