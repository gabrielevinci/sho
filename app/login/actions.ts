'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { getSession, SessionData } from '@/app/lib/session'; // Usiamo l'alias @ che Next.js configura

// Definiamo un tipo per l'utente recuperato dal DB, escludendo l'hash della password
// Non vogliamo mai far circolare l'hash della password nell'applicazione.
type User = {
  id: string;
  email: string;
};

export interface LoginState {
  message: string;
  success: boolean;
}

// Schema di validazione per il login
const LoginSchema = z.object({
  email: z.string().email({ message: "Inserisci un'email valida." }),
  password: z.string().min(1, { message: 'La password è richiesta.' }), // Basta che non sia vuota
});

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
  // 1. Validazione dei dati
  const validatedFields = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      message: validatedFields.error.errors[0].message,
      success: false,
    };
  }

  const { email, password } = validatedFields.data;
  
  try {
    // 2. Cerca l'utente nel database
    const result = await sql<User>`SELECT id, email, password_hash FROM users WHERE email = ${email}`;
    const user = result.rows[0];

    if (!user) {
      return { message: 'Credenziali non valide.', success: false };
    }

    // 3. Confronta le password
    const passwordsMatch = await bcrypt.compare(password, (user as any).password_hash);

    if (!passwordsMatch) {
      return { message: 'Credenziali non valide.', success: false };
    }

    // 4. Se le credenziali sono corrette, crea la sessione
    const session = await getSession();
    session.userId = user.id;
    session.isLoggedIn = true;
    await session.save(); // Salva i dati nel cookie crittografato

  } catch (error) {
    console.error('Login Error:', error);
    return { message: 'Si è verificato un errore. Riprova.', success: false };
  }

  // 5. Reindirizza alla dashboard
  redirect('/dashboard');
}