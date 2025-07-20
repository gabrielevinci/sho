// Utility per gestire problemi di connessione database
// Soluzioni temporanee per errori di rete

import { sql } from '@vercel/postgres';

export async function retryDatabaseQuery<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Tentativo connessione database ${attempt}/${maxRetries}`);
      const result = await queryFn();
      console.log(`✅ Connessione database riuscita al tentativo ${attempt}`);
      return result;
    } catch (error) {
      lastError = error as Error;
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      console.log(`❌ Tentativo ${attempt} fallito:`, errorMessage);
      
      if (attempt < maxRetries) {
        console.log(`⏱️  Attendo ${delay}ms prima del prossimo tentativo...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError!;
}

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await retryDatabaseQuery(async () => {
      const { rows } = await sql`SELECT 1 as test`;
      return rows;
    });
    return true;
  } catch (error) {
    console.error('💥 Connessione database fallita definitivamente:', error);
    return false;
  }
}

// Mock data per quando il database non è disponibile
export const mockAnalyticsData = {
  linkData: {
    short_code: 'OFFLINE',
    original_url: 'https://example.com',
    title: 'Database offline',
    description: 'Il database non è attualmente raggiungibile',
    click_count: 0,
    created_at: new Date()
  },
  clickAnalytics: {
    total_clicks: 0,
    unique_clicks: 0,
    unique_countries: 0,
    unique_referrers: 0,
    unique_devices: 0,
    unique_browsers: 0,
    top_referrer: null,
    most_used_browser: null,
    most_used_device: null,
    clicks_today: 0,
    clicks_this_week: 0,
    clicks_this_month: 0,
    unique_clicks_today: 0,
    unique_clicks_this_week: 0,
    unique_clicks_this_month: 0,
    avg_total_clicks_per_period: 0,
    avg_unique_clicks_per_period: 0
  },
  geographicData: [],
  deviceData: [],
  browserData: [],
  referrerData: [],
  timeSeriesData: [],
  monthlyData: [],
  weeklyData: []
};

console.log('🔧 Database utilities caricate');
