import { sql } from '@vercel/postgres';
import { unstable_cache } from 'next/cache';

export type Workspace = {
  id: string;
  name: string;
};

export type LinkFromDB = {
  short_code: string;
  original_url: string;
  created_at: Date;
  title: string | null;
  description: string | null;
  click_count: number;
};

// Cache per le workspace dell'utente - cache per 5 minuti
export const getCachedWorkspacesForUser = unstable_cache(
  async (userId: string): Promise<Workspace[]> => {
    try {
      const { rows } = await sql<Workspace>`
        SELECT id, name FROM workspaces WHERE user_id = ${userId} ORDER BY name ASC
      `;
      return rows;
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
      return [];
    }
  },
  ['workspaces-user'],
  {
    revalidate: 300, // 5 minuti
    tags: ['workspaces']
  }
);

// Cache per i link di un workspace - cache per 2 minuti
export const getCachedLinksForWorkspace = unstable_cache(
  async (userId: string, workspaceId: string): Promise<LinkFromDB[]> => {
    try {
      const { rows } = await sql<LinkFromDB>`
        SELECT short_code, original_url, created_at, title, description, click_count
        FROM links
        WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
        ORDER BY created_at DESC
      `;
      return rows;
    } catch (error) {
      console.error("Failed to fetch links:", error);
      return [];
    }
  },
  ['links-workspace'],
  {
    revalidate: 120, // 2 minuti
    tags: ['links']
  }
);

// Cache per i dati di un singolo link - cache per 1 minuto
export const getCachedLinkData = unstable_cache(
  async (shortCode: string, userId: string) => {
    try {
      const { rows } = await sql`
        SELECT short_code, original_url, title, description, click_count, created_at
        FROM links
        WHERE short_code = ${shortCode} AND user_id = ${userId}
      `;
      return rows[0] || null;
    } catch (error) {
      console.error("Failed to fetch link data:", error);
      return null;
    }
  },
  ['link-data'],
  {
    revalidate: 60, // 1 minuto
    tags: ['link-data']
  }
);

// Cache per le statistiche complete di un link - cache per 5 minuti
export const getCachedStatsData = unstable_cache(
  async (shortCode: string, userId: string) => {
    try {
      // Prima verifica che il link appartenga all'utente
      const linkResult = await sql`
        SELECT id, original_url, title, description, created_at
        FROM links 
        WHERE short_code = ${shortCode} AND user_id = ${userId}
      `;

      if (linkResult.rowCount === 0) {
        return null;
      }

      const link = linkResult.rows[0];

      // Recupera le statistiche complete
      const statsResult = await sql`
        SELECT 
          COALESCE(click_totali_sempre, 0) as click_totali_sempre,
          COALESCE(click_totali_24h, 0) as click_totali_24h,
          COALESCE(click_totali_7d, 0) as click_totali_7d,
          COALESCE(click_totali_30d, 0) as click_totali_30d,
          COALESCE(click_totali_90d, 0) as click_totali_90d,
          COALESCE(click_totali_365d, 0) as click_totali_365d,
          COALESCE(click_unici_sempre, 0) as click_unici_sempre,
          COALESCE(click_unici_24h, 0) as click_unici_24h,
          COALESCE(click_unici_7d, 0) as click_unici_7d,
          COALESCE(click_unici_30d, 0) as click_unici_30d,
          COALESCE(click_unici_90d, 0) as click_unici_90d,
          COALESCE(click_unici_365d, 0) as click_unici_365d,
          COALESCE(referrer_sempre, 0) as referrer_sempre,
          COALESCE(referrer_24h, 0) as referrer_24h,
          COALESCE(referrer_7d, 0) as referrer_7d,
          COALESCE(referrer_30d, 0) as referrer_30d,
          COALESCE(referrer_90d, 0) as referrer_90d,
          COALESCE(referrer_365d, 0) as referrer_365d,
          COALESCE(country_sempre, 0) as country_sempre,
          COALESCE(country_24h, 0) as country_24h,
          COALESCE(country_7d, 0) as country_7d,
          COALESCE(country_30d, 0) as country_30d,
          COALESCE(country_90d, 0) as country_90d,
          COALESCE(country_365d, 0) as country_365d,
          COALESCE(city_sempre, 0) as city_sempre,
          COALESCE(city_24h, 0) as city_24h,
          COALESCE(city_7d, 0) as city_7d,
          COALESCE(city_30d, 0) as city_30d,
          COALESCE(city_90d, 0) as city_90d,
          COALESCE(city_365d, 0) as city_365d,
          COALESCE(browser_sempre, 0) as browser_sempre,
          COALESCE(browser_24h, 0) as browser_24h,
          COALESCE(browser_7d, 0) as browser_7d,
          COALESCE(browser_30d, 0) as browser_30d,
          COALESCE(browser_90d, 0) as browser_90d,
          COALESCE(browser_365d, 0) as browser_365d,
          COALESCE(lingua_sempre, 0) as lingua_sempre,
          COALESCE(lingua_24h, 0) as lingua_24h,
          COALESCE(lingua_7d, 0) as lingua_7d,
          COALESCE(lingua_30d, 0) as lingua_30d,
          COALESCE(lingua_90d, 0) as lingua_90d,
          COALESCE(lingua_365d, 0) as lingua_365d,
          COALESCE(dispositivo_sempre, 0) as dispositivo_sempre,
          COALESCE(dispositivo_24h, 0) as dispositivo_24h,
          COALESCE(dispositivo_7d, 0) as dispositivo_7d,
          COALESCE(dispositivo_30d, 0) as dispositivo_30d,
          COALESCE(dispositivo_90d, 0) as dispositivo_90d,
          COALESCE(dispositivo_365d, 0) as dispositivo_365d,
          COALESCE(sistema_operativo_sempre, 0) as sistema_operativo_sempre,
          COALESCE(sistema_operativo_24h, 0) as sistema_operativo_24h,
          COALESCE(sistema_operativo_7d, 0) as sistema_operativo_7d,
          COALESCE(sistema_operativo_30d, 0) as sistema_operativo_30d,
          COALESCE(sistema_operativo_90d, 0) as sistema_operativo_90d,
          COALESCE(sistema_operativo_365d, 0) as sistema_operativo_365d
        FROM statistiche_link 
        WHERE link_id = ${link.id}
      `;
      
      let allStats;
      if (statsResult.rowCount === 0) {
        // Dati vuoti se non ci sono statistiche
        allStats = {
          click_totali_sempre: 0, click_totali_24h: 0, click_totali_7d: 0,
          click_totali_30d: 0, click_totali_90d: 0, click_totali_365d: 0,
          click_unici_sempre: 0, click_unici_24h: 0, click_unici_7d: 0,
          click_unici_30d: 0, click_unici_90d: 0, click_unici_365d: 0,
          referrer_sempre: 0, referrer_24h: 0, referrer_7d: 0,
          referrer_30d: 0, referrer_90d: 0, referrer_365d: 0,
          country_sempre: 0, country_24h: 0, country_7d: 0,
          country_30d: 0, country_90d: 0, country_365d: 0,
          city_sempre: 0, city_24h: 0, city_7d: 0,
          city_30d: 0, city_90d: 0, city_365d: 0,
          browser_sempre: 0, browser_24h: 0, browser_7d: 0,
          browser_30d: 0, browser_90d: 0, browser_365d: 0,
          lingua_sempre: 0, lingua_24h: 0, lingua_7d: 0,
          lingua_30d: 0, lingua_90d: 0, lingua_365d: 0,
          dispositivo_sempre: 0, dispositivo_24h: 0, dispositivo_7d: 0,
          dispositivo_30d: 0, dispositivo_90d: 0, dispositivo_365d: 0,
          sistema_operativo_sempre: 0, sistema_operativo_24h: 0, sistema_operativo_7d: 0,
          sistema_operativo_30d: 0, sistema_operativo_90d: 0, sistema_operativo_365d: 0
        };
      } else {
        allStats = statsResult.rows[0];
      }

      // Helper function per convertire in numero
      const toNumber = (value: string | number): number => {
        if (typeof value === 'number') return value;
        return parseInt(String(value)) || 0;
      };
      
      // Converte tutti i valori in numeri
      const convertedStats = Object.fromEntries(
        Object.entries(allStats).map(([key, value]) => [key, toNumber(value)])
      );

      return {
        link: {
          id: link.id,
          shortCode,
          originalUrl: link.original_url,
          title: link.title,
          description: link.description,
          createdAt: link.created_at
        },
        allStats: convertedStats
      };
    } catch (error) {
      console.error("Failed to fetch stats data:", error);
      return null;
    }
  },
  ['stats-data'],
  {
    revalidate: 300, // 5 minuti
    tags: ['stats']
  }
);

// Funzioni per invalidare la cache quando necessario
export const invalidateWorkspacesCache = async () => {
  const { revalidateTag } = await import('next/cache');
  revalidateTag('workspaces');
};

export const invalidateLinksCache = async () => {
  const { revalidateTag } = await import('next/cache');
  revalidateTag('links');
};

export const invalidateLinkDataCache = async () => {
  const { revalidateTag } = await import('next/cache');
  revalidateTag('link-data');
};

export const invalidateStatsCache = async () => {
  const { revalidateTag } = await import('next/cache');
  revalidateTag('stats');
};

// Funzione per invalidare tutte le cache
export const invalidateAllCaches = async () => {
  const { revalidateTag } = await import('next/cache');
  revalidateTag('workspaces');
  revalidateTag('links');
  revalidateTag('link-data');
  revalidateTag('stats');
};