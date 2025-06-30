'use server';

import { z } from 'zod';
import { sql } from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/session';

type UserFromDb = {
  id: string;
  email: string;
  password_hash: string;
};

export interface LoginState {
  message: string;
  success: boolean;
}

const LoginSchema = z.object({
  email: z.string().email({ message: "Inserisci un'email valida." }),
  password: z.string().min(1, { message: 'La password è richiesta.' }),
});

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
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
    const result = await sql<UserFromDb>`SELECT id, email, password_hash FROM users WHERE email = ${email}`;
    const user = result.rows[0];

    if (!user) {
      return { message: 'Credenziali non valide.', success: false };
    }

    const passwordsMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordsMatch) {
      return { message: 'Credenziali non valide.', success: false };
    }

    const session = await getSession();
    session.isLoggedIn = true;
    session.userId = user.id;
    await session.save();

  } catch (error) {
    console.error('Login Error:', error);
    return { message: 'Si è verificato un errore. Riprova.', success: false };
  }

  redirect('/dashboard');
}