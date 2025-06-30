'use server';

import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';

// Azione di Logout
export async function logout() {
  const session = await getSession();
  await session.destroy();
  redirect('/login');
}

// Interfaccia per lo stato di ritorno dell'azione
export interface CreateLinkState {
  message: string;
  success: boolean;
  shortUrl?: string; // Modificato per restituire l'URL completo
}

// Schema di validazione per l'URL
const LinkSchema = z.object({
  originalUrl: z.string().url({ message: "Per favore, inserisci un URL valido." }),
});

// Azione per la creazione del link
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
  const MAX_RETRIES = 5;
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    const shortCode = nanoid(7);
    try {
      await sql`
        INSERT INTO links (user_id, short_code, original_url)
        VALUES (${session.userId}, ${shortCode}, ${originalUrl})
      `;

      // --- Costruzione Dinamica dell'URL ---
      // Vercel imposta VERCELL_URL in produzione. In locale, usiamo localhost.
      // Assicuriamoci che il protocollo sia sempre https.
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
      
      const shortUrl = `${baseUrl}/${shortCode}`;

      revalidatePath('/dashboard');

      return {
        success: true,
        message: `Link creato con successo!`,
        shortUrl: shortUrl, // Restituiamo l'URL completo
      };

    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        attempt++;
        console.warn(`Collision detected for shortCode ${shortCode}. Retrying... (Attempt ${attempt})`);
      } else {
        console.error('Database Error:', error);
        return { success: false, message: "Errore del database durante la creazione del link." };
      }
    }
  }

  return { success: false, message: "Impossibile creare un link unico. Riprova più tardi." };
}