'use server'; // Magia! Dichiara che questo codice è un Server Action.

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';

// Definiamo lo stato che il nostro form potrà avere
export interface RegisterState {
  message: string;
  success: boolean;
}

// Schema di validazione con Zod
const RegisterSchema = z.object({
  email: z.string().email({ message: "Inserisci un'email valida." }),
  password: z.string().min(8, { message: 'La password deve contenere almeno 8 caratteri.' }),
});

export async function register(prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  // 1. Validazione dei dati
  const validatedFields = RegisterSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    // Zod ci fornisce un array di errori. Prendiamo il primo per semplicità.
    return {
      message: validatedFields.error.errors[0].message,
      success: false,
    };
  }

  const { email, password } = validatedFields.data;

  try {
    // 2. Hashing della password
    const hashedPassword = await bcrypt.hash(password, 10); // 10 è il "cost factor", un buon bilanciamento tra sicurezza e performance.

    // 3. Inserimento nel database
    // Nota: non abbiamo bisogno di creare una sessione qui.
    // Il flusso standard è: Registrazione -> Redirect a Login -> Login -> Creazione Sessione.
    await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${email}, ${hashedPassword})
    `;
  } catch (error: any) {
    // Controlliamo se l'errore è dovuto a una violazione del vincolo UNIQUE (email già esistente)
    if (error.code === '23505') {
      return {
        message: 'Un utente con questa email esiste già.',
        success: false,
      };
    }
    // Per altri errori generici del database
    console.error('Database Error:', error);
    return {
      message: 'Errore del database. Riprova più tardi.',
      success: false,
    };
  }

  // 4. Se tutto è andato a buon fine, reindirizziamo alla pagina di login
  // L'utente deve ora effettuare l'accesso con le nuove credenziali.
  redirect('/login');
}