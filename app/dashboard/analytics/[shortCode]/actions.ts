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
    // Usa la logica condivisa per il reset
    const { resetLinkClicks } = await import('@/lib/reset-clicks-shared');
    const result = await resetLinkClicks(shortCode, session.userId, session.workspaceId);

    if (!result.success) {
      throw new Error(result.error || 'Errore durante il reset');
    }

    revalidatePath(`/dashboard/analytics/${shortCode}`);
    return { success: true, message: result.message };
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
    new_short_code?: string;
  }
) {
  const session = await getSession();
  
  if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
    throw new Error('Non autorizzato');
  }

  try {
    // Se viene fornito un nuovo short code, verifichiamo che non sia già in uso
    if (data.new_short_code && data.new_short_code !== shortCode) {
      const existingLink = await sql`
        SELECT id FROM links 
        WHERE short_code = ${data.new_short_code}
        AND user_id = ${session.userId}
        AND workspace_id = ${session.workspaceId}
      `;
      
      if (existingLink.rows.length > 0) {
        throw new Error('Questo short code è già in uso');
      }
    }

    const result = await sql`
      UPDATE links 
      SET 
        title = ${data.title || null},
        description = ${data.description || null},
        original_url = ${data.original_url || null},
        short_code = ${data.new_short_code || shortCode}
      WHERE user_id = ${session.userId} 
      AND workspace_id = ${session.workspaceId} 
      AND short_code = ${shortCode}
    `;

    if (result.rowCount === 0) {
      throw new Error('Link non trovato');
    }

    revalidatePath(`/dashboard/analytics/${data.new_short_code || shortCode}`);
    revalidatePath('/dashboard');
    return { success: true, newShortCode: data.new_short_code || shortCode };
  } catch (error) {
    console.error('Errore durante l\'aggiornamento del link:', error);
    throw new Error(error instanceof Error ? error.message : 'Errore durante l\'aggiornamento del link');
  }
}
