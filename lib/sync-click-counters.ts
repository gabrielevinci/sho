/**
 * Utility per sincronizzare i contatori click nella tabella links
 * con i dati reali nella tabella clicks
 */

import { sql } from '@vercel/postgres';

export async function syncClickCounters(linkId?: string) {
  try {
    let query;
    
    if (linkId) {
      // Sincronizza un singolo link
      query = sql`
        UPDATE links 
        SET 
          click_count = COALESCE(click_stats.total_clicks, 0),
          unique_click_count = COALESCE(click_stats.unique_clicks, 0)
        FROM (
          SELECT 
            link_id,
            COUNT(*) as total_clicks,
            COUNT(DISTINCT click_fingerprint_hash) as unique_clicks
          FROM clicks 
          WHERE link_id = ${linkId}
          GROUP BY link_id
        ) as click_stats
        WHERE links.id = click_stats.link_id
      `;
    } else {
      // Sincronizza tutti i link
      query = sql`
        UPDATE links 
        SET 
          click_count = COALESCE(click_stats.total_clicks, 0),
          unique_click_count = COALESCE(click_stats.unique_clicks, 0)
        FROM (
          SELECT 
            link_id,
            COUNT(*) as total_clicks,
            COUNT(DISTINCT click_fingerprint_hash) as unique_clicks
          FROM clicks 
          GROUP BY link_id
        ) as click_stats
        WHERE links.id = click_stats.link_id
      `;
    }

    const result = await query;
    console.log(`✅ Sincronizzati contatori per ${result.rowCount || 0} link`);
    
    return { success: true, count: result.rowCount || 0 };
  } catch (error) {
    console.error('❌ Errore durante la sincronizzazione:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' };
  }
}

export async function resetZeroCounters() {
  try {
    // Azzera i contatori per i link che non hanno click nella tabella clicks
    const result = await sql`
      UPDATE links 
      SET click_count = 0, unique_click_count = 0
      WHERE id NOT IN (
        SELECT DISTINCT link_id FROM clicks
      )
      AND (click_count > 0 OR unique_click_count > 0)
    `;
    
    console.log(`✅ Azzerati contatori per ${result.rowCount || 0} link senza click`);
    return { success: true, count: result.rowCount || 0 };
  } catch (error) {
    console.error('❌ Errore durante l\'azzeramento:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' };
  }
}
