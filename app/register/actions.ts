'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { db } from '@vercel/postgres'; // <-- Importiamo il client per le transazioni

// ... (RegisterState, RegisterSchema rimangono invariati)
export interface RegisterState {
  message: string;
  success: boolean;
}

const RegisterSchema = z.object({
  email: z.string().email({ message: "Inserisci un'email valida." }),
  password: z.string().min(8, { message: 'La password deve contenere almeno 8 caratteri.' }),
});

export async function register(prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const validatedFields = RegisterSchema.safeParse({
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
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Usiamo una transazione per garantire l'atomicità
  const client = await db.connect();
  try {
    await client.query('BEGIN'); // Inizia la transazione

    // 1. Inserisci il nuovo utente e recupera il suo ID
    const userResult = await client.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email, hashedPassword]
    );
    const userId = userResult.rows[0].id;

    // 2. Crea il workspace di default per il nuovo utente
    await client.query(
      `INSERT INTO workspaces (user_id, name) VALUES ($1, 'Il mio Workspace')`,
      [userId]
    );

    await client.query('COMMIT'); // Conferma la transazione
  } catch (error) {
    await client.query('ROLLBACK'); // Annulla la transazione in caso di errore
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return {
        message: 'Un utente con questa email esiste già.',
        success: false,
      };
    }
    console.error('Database Transaction Error:', error);
    return {
      message: 'Errore del database. Riprova più tardi.',
      success: false,
    };
  } finally {
    client.release(); // Rilascia il client al pool di connessioni
  }

  redirect('/login');
}