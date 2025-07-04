'use server';

import { getSession } from '@/app/lib/session';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';

// Azione per eliminare un link
export async function deleteLink(shortCode: string) {
  const session = await getSession();
  
  if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
    throw new Error('Non autorizzato');
  }

  try {
    // Prima eliminiamo tutti i click associati al link
    await sql`
      DELETE FROM clicks 
      WHERE link_id IN (
        SELECT id FROM links 
        WHERE user_id = ${session.userId} 
        AND workspace_id = ${session.workspaceId} 
        AND short_code = ${shortCode}
      )
    `;

    // Poi eliminiamo il link
    const result = await sql`
      DELETE FROM links 
      WHERE user_id = ${session.userId} 
      AND workspace_id = ${session.workspaceId} 
      AND short_code = ${shortCode}
    `;

    if (result.rowCount === 0) {
      throw new Error('Link non trovato');
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Errore durante l\'eliminazione del link:', error);
    throw new Error('Errore durante l\'eliminazione del link');
  }
}

// Azione per resettare i dati dei click di un link
export async function resetLinkStats(shortCode: string) {
  const session = await getSession();
  
  if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
    throw new Error('Non autorizzato');
  }

  try {
    // Eliminiamo tutti i click associati al link
    await sql`
      DELETE FROM clicks 
      WHERE link_id IN (
        SELECT id FROM links 
        WHERE user_id = ${session.userId} 
        AND workspace_id = ${session.workspaceId} 
        AND short_code = ${shortCode}
      )
    `;

    // Aggiorniamo il contatore dei click nel link a 0
    const result = await sql`
      UPDATE links 
      SET click_count = 0 
      WHERE user_id = ${session.userId} 
      AND workspace_id = ${session.workspaceId} 
      AND short_code = ${shortCode}
    `;

    if (result.rowCount === 0) {
      throw new Error('Link non trovato');
    }

    revalidatePath(`/dashboard/analytics/${shortCode}`);
    return { success: true };
  } catch (error) {
    console.error('Errore durante il reset delle statistiche:', error);
    throw new Error('Errore durante il reset delle statistiche');
  }
}

// Azione per aggiornare un link
export async function updateLink(
  shortCode: string, 
  data: {
    title?: string;
    description?: string;
    original_url?: string;
  }
) {
  const session = await getSession();
  
  if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
    throw new Error('Non autorizzato');
  }

  try {
    const result = await sql`
      UPDATE links 
      SET 
        title = ${data.title || null},
        description = ${data.description || null},
        original_url = ${data.original_url || null}
      WHERE user_id = ${session.userId} 
      AND workspace_id = ${session.workspaceId} 
      AND short_code = ${shortCode}
    `;

    if (result.rowCount === 0) {
      throw new Error('Link non trovato');
    }

    revalidatePath(`/dashboard/analytics/${shortCode}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Errore durante l\'aggiornamento del link:', error);
    throw new Error('Errore durante l\'aggiornamento del link');
  }
}
