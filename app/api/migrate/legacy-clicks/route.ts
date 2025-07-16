import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST() {
  try {
    // 1. Migra i click esistenti dalla tabella clicks a advanced_fingerprints
    const existingClicks = await sql`
      SELECT 
        c.link_id,
        c.user_fingerprint as fingerprint_hash,
        c.country,
        c.browser_name,
        c.device_type,
        c.clicked_at_rome as first_seen,
        COUNT(*) as visit_count
      FROM clicks c
      WHERE c.user_fingerprint IS NOT NULL
      GROUP BY c.link_id, c.user_fingerprint, c.country, c.browser_name, c.device_type, c.clicked_at_rome
    `;

    let migratedCount = 0;

    for (const click of existingClicks.rows) {
      try {
        // Controlla se già esiste in advanced_fingerprints
        const existing = await sql`
          SELECT id FROM advanced_fingerprints 
          WHERE link_id = ${click.link_id} AND fingerprint_hash = ${click.fingerprint_hash}
        `;

        if (existing.rows.length === 0) {
          // Inserisci come record retroattivo
          await sql`
            INSERT INTO advanced_fingerprints (
              link_id,
              fingerprint_hash,
              country,
              browser_name,
              device_type,
              first_seen,
              last_seen,
              visit_count,
              user_agent
            ) VALUES (
              ${click.link_id},
              ${click.fingerprint_hash},
              ${click.country},
              ${click.browser_name},
              ${click.device_type},
              ${click.first_seen},
              ${click.first_seen},
              ${click.visit_count},
              'Migrated from legacy clicks'
            )
          `;
          migratedCount++;
        }
      } catch (error) {
        console.error('Error migrating click:', error);
      }
    }

    // 2. Aggiorna le statistiche giornaliere retroattive
    await sql`
      INSERT INTO daily_fingerprint_stats (
        date,
        total_clicks,
        unique_fingerprints,
        canvas_fingerprint_coverage
      )
      SELECT 
        first_seen::DATE as date,
        SUM(visit_count) as total_clicks,
        COUNT(DISTINCT fingerprint_hash) as unique_fingerprints,
        0 as canvas_fingerprint_coverage
      FROM advanced_fingerprints
      WHERE first_seen IS NOT NULL
      GROUP BY first_seen::DATE
      ON CONFLICT (date) DO UPDATE SET
        total_clicks = GREATEST(daily_fingerprint_stats.total_clicks, EXCLUDED.total_clicks),
        unique_fingerprints = GREATEST(daily_fingerprint_stats.unique_fingerprints, EXCLUDED.unique_fingerprints);
    `;

    return NextResponse.json({
      status: 'success',
      message: 'Legacy data migrated successfully',
      migrated_records: migratedCount,
      total_legacy_clicks: existingClicks.rows.length
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      status: 'error',
      error: errorMessage
    }, { status: 500 });
  }
}
