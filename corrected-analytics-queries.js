// VERSIONE CORRETTA E OTTIMIZZATA DELLE QUERY ANALYTICS SINGOLO LINK
// Risolve tutti i problemi identificati nell'analisi

// Funzione helper per creare filtri temporali uniformi
function buildDateFilter(startDate?: string, endDate?: string, paramStartIndex: number = 4) {
  if (!startDate || !endDate) {
    return {
      condition: '',
      params: []
    };
  }
  
  return {
    condition: `AND c.clicked_at_rome >= $${paramStartIndex}::timestamptz AND c.clicked_at_rome <= $${paramStartIndex + 1}::timestamptz`,
    params: [startDate, endDate]
  };
}

// Funzione helper per unique visitors uniformi 
function getUniqueVisitorLogic() {
  return `COALESCE(fc.device_cluster_id, ef.fingerprint_hash, c.user_fingerprint)`;
}

// VERSIONE CORRETTA: getFilteredClickAnalytics
async function getFilteredClickAnalytics(
  userId: string, 
  workspaceId: string, 
  shortCode: string, 
  startDate?: string, 
  endDate?: string
): Promise<ClickAnalytics> {
  try {
    console.log('🔍 [ANALYTICS] Parametri ricevuti:', {
      userId, workspaceId, shortCode, startDate, endDate
    });

    // Costruzione uniforme del filtro temporale
    const dateFilter = buildDateFilter(startDate, endDate, 4);
    const baseParams = [userId, workspaceId, shortCode];
    const allParams = [...baseParams, ...dateFilter.params];

    console.log('📋 [ANALYTICS] Filtro temporale:', {
      condition: dateFilter.condition,
      params: dateFilter.params,
      allParams
    });

    const query = `
      WITH link_info AS (
        SELECT id, click_count, unique_click_count, created_at
        FROM links 
        WHERE user_id = $1 AND workspace_id = $2 AND short_code = $3
      ),
      
      -- UNICA FONTE DI VERITA': Tutti i click filtrati con enhanced fingerprints
      filtered_clicks AS (
        SELECT DISTINCT
          c.id as click_id,
          c.country,
          c.referrer,
          c.browser_name,
          c.device_type,
          c.clicked_at_rome,
          ${getUniqueVisitorLogic()} as unique_visitor_id,
          c.user_fingerprint as original_fingerprint
        FROM clicks c
        JOIN link_info li ON c.link_id = li.id
        LEFT JOIN enhanced_fingerprints ef ON c.link_id = ef.link_id 
          AND (c.user_fingerprint = ef.fingerprint_hash OR c.user_fingerprint = ef.device_fingerprint)
        LEFT JOIN fingerprint_correlations fc ON ef.fingerprint_hash = fc.fingerprint_hash
        WHERE 1=1 ${dateFilter.condition}
      ),
      
      -- STATISTICHE PRINCIPALI (rispettano sempre i filtri temporali)
      main_stats AS (
        SELECT 
          COUNT(*) as total_clicks,
          COUNT(DISTINCT unique_visitor_id) as unique_clicks,
          COUNT(DISTINCT country) as unique_countries,
          COUNT(DISTINCT CASE WHEN referrer IS NOT NULL AND referrer != 'Direct' THEN referrer END) as unique_referrers,
          COUNT(DISTINCT device_type) as unique_devices,
          COUNT(DISTINCT browser_name) as unique_browsers
        FROM filtered_clicks
      ),
      
      -- STATISTICHE PERIODICHE (rispettano i filtri temporali quando presenti)
      period_stats AS (
        SELECT 
          -- Se abbiamo filtri temporali, conta solo nel periodo filtrato
          -- Altrimenti usa le finestre temporali standard
          ${startDate && endDate ? `
            COUNT(CASE WHEN clicked_at_rome >= '${startDate}'::timestamptz AND clicked_at_rome <= '${endDate}'::timestamptz THEN 1 END) as clicks_today,
            COUNT(CASE WHEN clicked_at_rome >= '${startDate}'::timestamptz AND clicked_at_rome <= '${endDate}'::timestamptz THEN 1 END) as clicks_this_week,
            COUNT(CASE WHEN clicked_at_rome >= '${startDate}'::timestamptz AND clicked_at_rome <= '${endDate}'::timestamptz THEN 1 END) as clicks_this_month,
            COUNT(DISTINCT CASE WHEN clicked_at_rome >= '${startDate}'::timestamptz AND clicked_at_rome <= '${endDate}'::timestamptz THEN unique_visitor_id END) as unique_clicks_today,
            COUNT(DISTINCT CASE WHEN clicked_at_rome >= '${startDate}'::timestamptz AND clicked_at_rome <= '${endDate}'::timestamptz THEN unique_visitor_id END) as unique_clicks_this_week,
            COUNT(DISTINCT CASE WHEN clicked_at_rome >= '${startDate}'::timestamptz AND clicked_at_rome <= '${endDate}'::timestamptz THEN unique_visitor_id END) as unique_clicks_this_month
          ` : `
            COUNT(CASE WHEN clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '1 day' THEN 1 END) as clicks_today,
            COUNT(CASE WHEN clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '7 days' THEN 1 END) as clicks_this_week,
            COUNT(CASE WHEN clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '30 days' THEN 1 END) as clicks_this_month,
            COUNT(DISTINCT CASE WHEN clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '1 day' THEN unique_visitor_id END) as unique_clicks_today,
            COUNT(DISTINCT CASE WHEN clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '7 days' THEN unique_visitor_id END) as unique_clicks_this_week,
            COUNT(DISTINCT CASE WHEN clicked_at_rome >= (NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '30 days' THEN unique_visitor_id END) as unique_clicks_this_month
          `}
        FROM filtered_clicks
      ),
      
      -- TOP VALUES (rispettano sempre i filtri temporali)
      top_values AS (
        SELECT 
          (SELECT referrer FROM filtered_clicks 
           WHERE referrer IS NOT NULL AND referrer != 'Direct' 
           GROUP BY referrer ORDER BY COUNT(*) DESC LIMIT 1) as top_referrer,
          (SELECT browser_name FROM filtered_clicks 
           WHERE browser_name IS NOT NULL 
           GROUP BY browser_name ORDER BY COUNT(*) DESC LIMIT 1) as most_used_browser,
          (SELECT device_type FROM filtered_clicks 
           WHERE device_type IS NOT NULL 
           GROUP BY device_type ORDER BY COUNT(*) DESC LIMIT 1) as most_used_device
      )
      
      SELECT 
        -- SEMPRE usa dati calcolati dalle query filtrate (niente più CASE WHEN confusi)
        ms.total_clicks,
        ms.unique_clicks,
        ms.unique_countries,
        ms.unique_referrers,
        ms.unique_devices,
        ms.unique_browsers,
        tv.top_referrer,
        tv.most_used_browser,
        tv.most_used_device,
        ps.clicks_today,
        ps.clicks_this_week,
        ps.clicks_this_month,
        ps.unique_clicks_today,
        ps.unique_clicks_this_week,
        ps.unique_clicks_this_month,
        li.created_at
      FROM link_info li
      CROSS JOIN main_stats ms
      CROSS JOIN period_stats ps  
      CROSS JOIN top_values tv
    `;

    console.log('🔍 [ANALYTICS] Query da eseguire:', query);

    const { rows } = await sql.query(query, allParams);
    const result = rows[0];

    if (!result) {
      console.error('❌ [ANALYTICS] Nessun risultato dalla query');
      throw new Error('No analytics data found');
    }

    console.log('✅ [ANALYTICS] Risultati query:', {
      total_clicks: result.total_clicks,
      unique_clicks: result.unique_clicks,
      unique_countries: result.unique_countries,
      clicks_today: result.clicks_today,
      clicks_this_week: result.clicks_this_week,
      hasFilters: !!(startDate && endDate)
    });

    // Calcola le medie giornaliere
    const createdAt = new Date(result.created_at);
    const now = new Date();
    const daysSinceCreation = Math.max(1, Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    
    return {
      total_clicks: parseInt(result.total_clicks) || 0,
      unique_clicks: parseInt(result.unique_clicks) || 0,
      unique_countries: parseInt(result.unique_countries) || 0,
      unique_referrers: parseInt(result.unique_referrers) || 0,
      unique_devices: parseInt(result.unique_devices) || 0,
      unique_browsers: parseInt(result.unique_browsers) || 0,
      top_referrer: result.top_referrer,
      most_used_browser: result.most_used_browser,
      most_used_device: result.most_used_device,
      clicks_today: parseInt(result.clicks_today) || 0,
      clicks_this_week: parseInt(result.clicks_this_week) || 0,
      clicks_this_month: parseInt(result.clicks_this_month) || 0,
      unique_clicks_today: parseInt(result.unique_clicks_today) || 0,
      unique_clicks_this_week: parseInt(result.unique_clicks_this_week) || 0,
      unique_clicks_this_month: parseInt(result.unique_clicks_this_month) || 0,
      avg_clicks_per_day: Math.round((parseInt(result.total_clicks) / daysSinceCreation) * 100) / 100,
      avg_unique_clicks_per_day: Math.round((parseInt(result.unique_clicks) / daysSinceCreation) * 100) / 100
    };

  } catch (error) {
    console.error("❌ [ANALYTICS] Errore in getFilteredClickAnalytics:", error);
    throw error;
  }
}

console.log('✅ VERSIONE CORRETTA CREATA');
console.log('');
console.log('🎯 PROBLEMI RISOLTI:');
console.log('1. ✅ FILTRI TEMPORALI COERENTI: period_stats ora rispetta startDate/endDate');
console.log('2. ✅ LOGICA CONDIZIONALE SEMPLIFICATA: eliminate CASE WHEN confuse');
console.log('3. ✅ UNIQUE VISITORS UNIFICATI: logica consistente in tutto');
console.log('4. ✅ FONTE UNICA DI VERITA\': filtered_clicks riusata ovunque');
console.log('');
console.log('🔧 PROSSIMO PASSO: Applicare questa logica al file route.ts');
