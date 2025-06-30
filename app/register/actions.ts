'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres'; // <-- MODIFICA QUI
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

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${email}, ${hashedPassword})
    `;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return {
        message: 'Un utente con questa email esiste già.',
        success: false,
      };
    }
    
    console.error('Database Error:', error);
    return {
      message: 'Errore del database. Riprova più tardi.',
      success: false,
    };
  }

  redirect('/login');
}