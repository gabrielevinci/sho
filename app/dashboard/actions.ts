'use server';

import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';

// --- AZIONI WORKSPACE (INVARIATE) ---
export async function updateWorkspaceName(formData: FormData) { /* ... */ }
export async function createWorkspace(formData: FormData) { /* ... */ }
export async function switchWorkspace(workspaceId: string) { /* ... */ }
// ... (Ho omesso il corpo delle funzioni workspace per brevità, ma nel tuo file devono esserci)

// --- AZIONE LOGOUT (INVARIATA) ---
export async function logout() {
  const session = await getSession();
  await session.destroy();
  redirect('/login');
}

// --- AZIONE DI CREAZIONE LINK AVANZATA ---

// Definiamo uno stato di ritorno più ricco per gestire errori per campo
export interface CreateAdvancedLinkState {
  message: string;
  errors?: {
    originalUrl?: string;
    shortCode?: string;
    general?: string;
  };
  success: boolean;
}

// Schema di validazione con Zod per tutti i campi del nuovo form
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
  // 1. Autenticazione e validazione sessione
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
    return { success: false, message: '', errors: { general: "Autenticazione richiesta o workspace non valido." } };
  }
  const { userId, workspaceId } = session;

  // 2. Validazione dei dati del form con Zod
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
    // Se la validazione fallisce, mappiamo gli errori per mostrarli nel form
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

  // 3. Gestione dello short code
  if (shortCode) {
    // Se l'utente fornisce uno short code, controlliamo se è già in uso
    const { rows } = await sql`SELECT id FROM links WHERE short_code = ${shortCode}`;
    if (rows.length > 0) {
      return { success: false, message: '', errors: { shortCode: "Questo short code è già in uso. Scegline un altro." } };
    }
  } else {
    // Se non viene fornito, ne generiamo uno casuale
    shortCode = nanoid(7);
  }
  
  // 4. Inserimento nel database
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

  // 5. Successo!
  revalidatePath('/dashboard'); // Invalida la cache della dashboard per aggiornare la lista
  redirect('/dashboard'); // Reindirizza l'utente alla dashboard dopo la creazione
}

// MANTENIAMO LA VECCHIA AZIONE PER NON ROMPERE IL VECCHIO FORM SE ESISTE ANCORA
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