'use server';

import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';

// --- NUOVA AZIONE: MODIFICA NOME WORKSPACE ---

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

  // Query di aggiornamento sicura: include user_id nella clausola WHERE.
  // Questo garantisce che un utente possa modificare SOLO i propri workspace.
  await sql`
    UPDATE workspaces
    SET name = ${newName}
    WHERE id = ${workspaceId} AND user_id = ${session.userId}
  `;

  revalidatePath('/dashboard');
}

// --- AZIONI WORKSPACE ESISTENTI ---

export async function createWorkspace(formData: FormData) {
  // ... (codice invariato)
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
  // ... (codice invariato)
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

// ... (resto del file 'logout' e 'createShortLink' invariato)
export async function logout() {
  const session = await getSession();
  await session.destroy();
  redirect('/login');
}
export interface CreateLinkState {
  message: string;
  success: boolean;
  shortUrl?: string;
}
const LinkSchema = z.object({
  originalUrl: z.string().url({ message: "Per favore, inserisci un URL valido." }),
});
export async function createShortLink(prevState: CreateLinkState, formData: FormData): Promise<CreateLinkState> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
    return { success: false, message: "Workspace non valido o autenticazione richiesta." };
  }
  const validatedFields = LinkSchema.safeParse({
    originalUrl: formData.get('originalUrl'),
  });
  if (!validatedFields.success) {
    return { success: false, message: validatedFields.error.errors[0].message };
  }
  const { originalUrl } = validatedFields.data;
  const MAX_RETRIES = 5;
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    const shortCode = nanoid(7);
    try {
      await sql`
        INSERT INTO links (user_id, workspace_id, short_code, original_url)
        VALUES (${session.userId}, ${session.workspaceId}, ${shortCode}, ${originalUrl})
      `;
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
      const shortUrl = `${baseUrl}/${shortCode}`;
      revalidatePath('/dashboard');
      return { success: true, message: `Link creato con successo!`, shortUrl };
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        attempt++;
        console.warn(`Collision detected... Retrying...`);
      } else {
        console.error('Database Error:', error);
        return { success: false, message: "Errore del database." };
      }
    }
  }
  return { success: false, message: "Impossibile creare un link unico." };
}