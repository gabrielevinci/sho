#!/usr/bin/env node

/**
 * Script per aggiornare tutte le query rimanenti per usare enhanced_fingerprints
 */

console.log('🔄 AGGIORNAMENTO FINALE DELLE QUERY ANALYTICS...\n');

const fs = require('fs');
const path = require('path');

// File da aggiornare
const files = [
  'app/api/analytics/workspace/route.ts'
];

// Aggiornamenti da applicare
const updates = [
  // 1. Aggiorna click_stats in workspace analytics
  {
    from: `        click_stats AS (
          SELECT 
            COUNT(*) as total_clicks,
            COUNT(DISTINCT user_fingerprint) as unique_clicks,
            COUNT(DISTINCT country) as unique_countries,
            COUNT(DISTINCT referrer) as unique_referrers,
            COUNT(DISTINCT device_type) as unique_devices,
            -- Usa clicked_at_rome che è già nel fuso orario italiano
            COUNT(CASE WHEN clicked_at_rome::date = (NOW() AT TIME ZONE 'Europe/Rome')::date THEN 1 END) as clicks_today,
            COUNT(CASE WHEN clicked_at_rome >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '7 days') THEN 1 END) as clicks_this_week,
            COUNT(CASE WHEN clicked_at_rome >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '30 days') THEN 1 END) as clicks_this_month,
            COUNT(DISTINCT CASE WHEN clicked_at_rome::date = (NOW() AT TIME ZONE 'Europe/Rome')::date THEN user_fingerprint END) as unique_clicks_today,
            COUNT(DISTINCT CASE WHEN clicked_at_rome >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '7 days') THEN user_fingerprint END) as unique_clicks_this_week,
            COUNT(DISTINCT CASE WHEN clicked_at_rome >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '30 days') THEN user_fingerprint END) as unique_clicks_this_month
          FROM clicks c`,
    to: `        click_stats AS (
          SELECT 
            COUNT(ef.id) as total_clicks,
            COUNT(DISTINCT ef.device_fingerprint) as unique_clicks,
            COUNT(DISTINCT ef.country) as unique_countries,
            COUNT(DISTINCT c.referrer) as unique_referrers,
            COUNT(DISTINCT ef.device_category) as unique_devices,
            -- Usa created_at convertito al fuso orario italiano
            COUNT(CASE WHEN (ef.created_at AT TIME ZONE 'Europe/Rome')::date = (NOW() AT TIME ZONE 'Europe/Rome')::date THEN 1 END) as clicks_today,
            COUNT(CASE WHEN ef.created_at >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '7 days') THEN 1 END) as clicks_this_week,
            COUNT(CASE WHEN ef.created_at >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '30 days') THEN 1 END) as clicks_this_month,
            COUNT(DISTINCT CASE WHEN (ef.created_at AT TIME ZONE 'Europe/Rome')::date = (NOW() AT TIME ZONE 'Europe/Rome')::date THEN ef.device_fingerprint END) as unique_clicks_today,
            COUNT(DISTINCT CASE WHEN ef.created_at >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '7 days') THEN ef.device_fingerprint END) as unique_clicks_this_week,
            COUNT(DISTINCT CASE WHEN ef.created_at >= ((NOW() AT TIME ZONE 'Europe/Rome')::date - INTERVAL '30 days') THEN ef.device_fingerprint END) as unique_clicks_this_month
          FROM enhanced_fingerprints ef
          LEFT JOIN clicks c ON c.user_fingerprint = ef.browser_fingerprint AND c.link_id = ef.link_id`
  },
  
  // 2. Aggiorna TOP_STATS
  {
    from: `        top_stats AS (
          SELECT 
            (SELECT referrer FROM clicks c JOIN workspace_links wl ON c.link_id = wl.id 
             WHERE referrer != 'Direct' GROUP BY referrer ORDER BY COUNT(*) DESC LIMIT 1) as top_referrer,
            (SELECT browser_name FROM clicks c JOIN workspace_links wl ON c.link_id = wl.id 
             GROUP BY browser_name ORDER BY COUNT(*) DESC LIMIT 1) as most_used_browser,
            (SELECT device_type FROM clicks c JOIN workspace_links wl ON c.link_id = wl.id 
             GROUP BY device_type ORDER BY COUNT(*) DESC LIMIT 1) as most_used_device,
            (SELECT wl.short_code FROM clicks c JOIN workspace_links wl ON c.link_id = wl.id 
             GROUP BY wl.short_code ORDER BY COUNT(*) DESC LIMIT 1) as most_clicked_link,
            (SELECT COUNT(*) FROM clicks c JOIN workspace_links wl ON c.link_id = wl.id 
             GROUP BY wl.short_code ORDER BY COUNT(*) DESC LIMIT 1) as most_clicked_link_count`,
    to: `        top_stats AS (
          SELECT 
            (SELECT c.referrer FROM enhanced_fingerprints ef 
             LEFT JOIN clicks c ON c.user_fingerprint = ef.browser_fingerprint AND c.link_id = ef.link_id
             JOIN workspace_links wl ON ef.link_id = wl.id 
             WHERE c.referrer != 'Direct' GROUP BY c.referrer ORDER BY COUNT(*) DESC LIMIT 1) as top_referrer,
            (SELECT ef.browser_type FROM enhanced_fingerprints ef JOIN workspace_links wl ON ef.link_id = wl.id 
             GROUP BY ef.browser_type ORDER BY COUNT(*) DESC LIMIT 1) as most_used_browser,
            (SELECT ef.device_category FROM enhanced_fingerprints ef JOIN workspace_links wl ON ef.link_id = wl.id 
             GROUP BY ef.device_category ORDER BY COUNT(*) DESC LIMIT 1) as most_used_device,
            (SELECT wl.short_code FROM enhanced_fingerprints ef JOIN workspace_links wl ON ef.link_id = wl.id 
             GROUP BY wl.short_code ORDER BY COUNT(*) DESC LIMIT 1) as most_clicked_link,
            (SELECT COUNT(*) FROM enhanced_fingerprints ef JOIN workspace_links wl ON ef.link_id = wl.id 
             GROUP BY wl.short_code ORDER BY COUNT(*) DESC LIMIT 1) as most_clicked_link_count`
  },

  // 3. Aggiorna getTopLinks
  {
    from: `        COALESCE(COUNT(DISTINCT c.user_fingerprint), 0) as unique_click_count
      FROM links l
      LEFT JOIN clicks c ON c.link_id = l.id`,
    to: `        COALESCE(COUNT(DISTINCT ef.device_fingerprint), 0) as unique_click_count
      FROM links l
      LEFT JOIN enhanced_fingerprints ef ON ef.link_id = l.id`
  },

  // 4. Altri aggiornamenti multipli
  {
    from: 'COUNT(DISTINCT user_fingerprint)',
    to: 'COUNT(DISTINCT ef.device_fingerprint)'
  },
  {
    from: 'FROM clicks c',
    to: 'FROM enhanced_fingerprints ef'
  },
  {
    from: 'c.user_fingerprint',
    to: 'ef.device_fingerprint'
  }
];

// Funzione per applicare gli aggiornamenti
function applyUpdates() {
  files.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ File non trovato: ${filePath}`);
      return;
    }

    console.log(`🔧 Aggiornamento: ${filePath}`);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    updates.forEach((update, index) => {
      if (content.includes(update.from)) {
        content = content.replace(update.from, update.to);
        console.log(`  ✅ Aggiornamento ${index + 1} applicato`);
      }
    });
    
    fs.writeFileSync(fullPath, content);
    console.log(`  💾 File salvato\n`);
  });
}

console.log('📝 NOTA: Questo script automatizza gli ultimi aggiornamenti');
console.log('   per convertire tutte le query da clicks+user_fingerprint');
console.log('   a enhanced_fingerprints+device_fingerprint\n');

console.log('⚡ Applicazione aggiornamenti...\n');
applyUpdates();

console.log('✅ AGGIORNAMENTI COMPLETATI!');
console.log('🎯 Ora TUTTE le statistiche dovrebbero mostrare i dati corretti');
console.log('   basati su device_fingerprint per i visitatori unici.\n');

console.log('🚀 Ricarica le pagine analytics per vedere i cambiamenti!');
