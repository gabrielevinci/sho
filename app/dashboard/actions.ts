'use server';

import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';

// --- AZIONI WORKSPACE (COMPLETE E FUNZIONANTI) ---
export async function updateWorkspaceName(formData: FormData) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    throw new Error('Not authenticated');
  }
  const workspaceId = formData.get('workspaceId') as string;
  const newName = formData.get('newName') as string;
  if (!workspaceId || !newName || newName.trim().length < 2) {
    throw new Error('Invalid data provided.');
  }
  await sql`
    UPDATE workspaces
    SET name = ${newName}
    WHERE id = ${workspaceId} AND user_id = ${session.userId}
  `;
  revalidatePath('/dashboard');
}

export async function createWorkspace(formData: FormData) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    throw new Error('Not authenticated');
  }
  const name = formData.get('name') as string;
  if (!name || name.trim().length === 0) {
    throw new Error('Workspace name cannot be empty');
  }
  await sql`
    INSERT INTO workspaces (user_id, name) VALUES (${session.userId}, ${name})
  `;
  revalidatePath('/dashboard');
}

export async function switchWorkspace(workspaceId: string) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    throw new Error('Not authenticated');
  }
  const { rows } = await sql`
    SELECT id FROM workspaces WHERE id = ${workspaceId} AND user_id = ${session.userId}
  `;
  if (rows.length === 0) {
    throw new Error('Workspace not found or access denied');
  }
  session.workspaceId = workspaceId; 
  await session.save();
  revalidatePath('/dashboard');
  redirect('/dashboard');
}

// --- AZIONE LOGOUT (INVARIATA) ---
export async function logout() {
  const session = await getSession();
  await session.destroy();
  redirect('/login');
}

// --- AZIONE DI CREAZIONE LINK AVANZATA (UNICA E CORRETTA) ---
export interface CreateAdvancedLinkState {
  message: string;
  errors?: {
    originalUrl?: string;
    shortCode?: string;
    general?: string;
  };
  success: boolean;
  finalShortCode?: string;
}

const AdvancedLinkSchema = z.object({
  originalUrl: z.string().url({ message: "L'URL di destinazione deve essere un URL valido." }),
  shortCode: z.string().optional().transform(val => val || '').refine(val => /^[a-zA-Z0-9_-]*$/.test(val), {
    message: "Lo short code può contenere solo lettere, numeri, trattini (-) e underscore (_)."
  }),
  title: z.string().optional(),
  description: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
});

export async function createAdvancedLink(prevState: CreateAdvancedLinkState, formData: FormData): Promise<CreateAdvancedLinkState> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
    return { success: false, message: '', errors: { general: "Autenticazione richiesta o workspace non valido." } };
  }
  const { userId, workspaceId } = session;

  const validatedFields = AdvancedLinkSchema.safeParse({
    originalUrl: formData.get('originalUrl'),
    shortCode: formData.get('shortCode'),
    title: formData.get('title'),
    description: formData.get('description'),
    utm_source: formData.get('utm_source'),
    utm_medium: formData.get('utm_medium'),
    utm_campaign: formData.get('utm_campaign'),
    utm_term: formData.get('utm_term'),
    utm_content: formData.get('utm_content'),
  });

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Errore di validazione. Controlla i campi.",
      errors: {
        originalUrl: fieldErrors.originalUrl?.[0],
        shortCode: fieldErrors.shortCode?.[0],
      }
    };
  }
  
  const { originalUrl, title, description, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = validatedFields.data;
  let shortCode = validatedFields.data.shortCode;

  if (shortCode) {
    const { rows } = await sql`SELECT id FROM links WHERE short_code = ${shortCode}`;
    if (rows.length > 0) {
      return { success: false, message: '', errors: { shortCode: "Questo short code è già in uso. Scegline un altro." } };
    }
  } else {
    shortCode = nanoid(7);
  }
  
  try {
    await sql`
      INSERT INTO links (
        user_id, workspace_id, original_url, short_code, title, description, 
        utm_source, utm_medium, utm_campaign, utm_term, utm_content
      )
      VALUES (
        ${userId}, ${workspaceId}, ${originalUrl}, ${shortCode}, ${title}, ${description},
        ${utm_source}, ${utm_medium}, ${utm_campaign}, ${utm_term}, ${utm_content}
      )
    `;
  } catch (error) {
    console.error("Database error during advanced link creation:", error);
    return { success: false, message: '', errors: { general: "Si è verificato un errore del database. Riprova." } };
  }

  revalidatePath('/dashboard');
  return {
    success: true,
    message: "Link creato con successo!",
    finalShortCode: shortCode
  };
}