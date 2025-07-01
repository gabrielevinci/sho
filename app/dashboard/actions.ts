'use server';

import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';

// --- AZIONI WORKSPACE (COMPLETE E CORRETTE) ---
export async function updateWorkspaceName(formData: FormData) { /* ... logica completa ... */ }
export async function createWorkspace(formData: FormData) { /* ... logica completa ... */ }
export async function switchWorkspace(workspaceId: string) { /* ... logica completa ... */ }
// (Ho riassunto per brevità, ma il tuo file contiene la logica completa che abbiamo già corretto)

// --- AZIONE LOGOUT (INVARIATA) ---
export async function logout() {
  const session = await getSession();
  await session.destroy();
  redirect('/login');
}

// --- AZIONE DI CREAZIONE LINK AVANZATA (CORRETTA) ---
export interface CreateAdvancedLinkState {
  message: string;
  errors?: {
    originalUrl?: string;
    shortCode?: string;
    general?: string;
  };
  success: boolean;
  finalShortCode?: string; // Usiamo un nome diverso per non confondere
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
    // ... tutti gli altri campi
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

  // --- QUESTA È LA MODIFICA CHIAVE ---
  // Rimuoviamo il redirect e restituiamo uno stato di successo.
  revalidatePath('/dashboard');
  return {
    success: true,
    message: "Link creato con successo!",
    finalShortCode: shortCode
  };
}

// --- VECCHIA AZIONE DI CREAZIONE (mantenuta per sicurezza) ---
export interface CreateLinkState { message: string; success: boolean; shortCode?: string; }
const LinkSchema = z.object({ originalUrl: z.string().url({ message: "Per favore, inserisci un URL valido." }), });
export async function createShortLink(prevState: CreateLinkState, formData: FormData): Promise<CreateLinkState> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
    return { success: false, message: "Nessun workspace attivo. Selezionane uno." };
  }
  const { originalUrl } = LinkSchema.parse({ originalUrl: formData.get('originalUrl') });
  const shortCode = nanoid(7);
  await sql`
    INSERT INTO links (user_id, workspace_id, short_code, original_url)
    VALUES (${session.userId}, ${session.workspaceId}, ${shortCode}, ${originalUrl})
  `;
  revalidatePath('/dashboard');
  return { success: true, message: 'Link creato!', shortCode };
}