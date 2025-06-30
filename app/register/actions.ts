'use server';

import { z } from 'zod';
// NOTA: L'import di 'sql' è stato rimosso da qui.
import { db } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';

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
  
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email, hashedPassword]
    );
    const userId = userResult.rows[0].id;

    await client.query(
      `INSERT INTO workspaces (user_id, name) VALUES ($1, 'Il mio Workspace')`,
      [userId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
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
    client.release();
  }

  redirect('/login');
}