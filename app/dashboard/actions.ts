'use server';

import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';

// Azione di Logout (già esistente)
export async function logout() {
  const session = await getSession();
  await session.destroy();
  redirect('/login');
}

// --- Nuova Azione: Creazione Link ---

export interface CreateLinkState {
  message: string;
  success: boolean;
  shortCode?: string;
}

const LinkSchema = z.object({
  originalUrl: z.string().url({ message: "Per favore, inserisci un URL valido." }),
});


export async function createShortLink(prevState: CreateLinkState, formData: FormData): Promise<CreateLinkState> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return { success: false, message: "Autenticazione richiesta." };
  }

  const validatedFields = LinkSchema.safeParse({
    originalUrl: formData.get('originalUrl'),
  });

  if (!validatedFields.success) {
    return { success: false, message: validatedFields.error.errors[0].message };
  }
  const { originalUrl } = validatedFields.data;

  // --- Logica di Inserimento Robusta con Gestione delle Collisioni ---
  const MAX_RETRIES = 5; // Numero massimo di tentativi per trovare un codice unico
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    const shortCode = nanoid(7);
    try {
      await sql`
        INSERT INTO links (user_id, short_code, original_url)
        VALUES (${session.userId}, ${shortCode}, ${originalUrl})
      `;

      revalidatePath('/dashboard');

      return {
        success: true,
        message: `Link creato con successo! Il tuo short link è: sho.com/${shortCode}`,
        shortCode: shortCode,
      };
    } catch (error) {
      // Controlla se l'errore è una violazione del vincolo UNIQUE (collisione)
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        // Collisione rilevata. Il loop continuerà per un altro tentativo.
        attempt++;
        console.warn(`Collision detected for shortCode ${shortCode}. Retrying... (Attempt ${attempt})`);
      } else {
        // Errore del database non correlato a una collisione
        console.error('Database Error:', error);
        return { success: false, message: "Errore del database durante la creazione del link." };
      }
    }
  }

  // Se usciamo dal loop, significa che non siamo riusciti a trovare un codice unico.
  return { success: false, message: "Impossibile creare un link unico. Riprova più tardi." };
}