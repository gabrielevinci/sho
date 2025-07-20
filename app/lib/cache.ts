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

// Funzione per invalidare tutte le cache
export const invalidateAllCaches = async () => {
  const { revalidateTag } = await import('next/cache');
  revalidateTag('workspaces');
  revalidateTag('links');
  revalidateTag('link-data');
};