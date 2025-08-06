'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/session';

// Tipo per l'utente recuperato dal database
type UserFromDb = {
  id: string;
  email: string;
  password_hash: string;
};

// Tipo per il workspace recuperato dal database
type WorkspaceFromDb = {
  id: string;
};

// Interfaccia per lo stato di ritorno dell'azione di login
export interface LoginState {
  message: string;
  success: boolean;
}

// Schema di validazione per i dati di login
const LoginSchema = z.object({
  email: z.string().email({ message: "Inserisci un'email valida." }),
  password: z.string().min(1, { message: 'La password è richiesta.' }),
});

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
  // 1. Validazione dell'input
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
    const userResult = await sql<UserFromDb>`SELECT id, email, password_hash FROM users WHERE email = ${email}`;
    const user = userResult.rows[0];

    if (!user) {
      return { message: 'Credenziali non valide.', success: false };
    }

    // 3. Confronta la password fornita con l'hash salvato
    const passwordsMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordsMatch) {
      return { message: 'Credenziali non valide.', success: false };
    }

    // --- 4. Logica Aggiunta: Trova il Workspace di Default ---
    // Dopo aver verificato l'utente, troviamo il suo primo workspace creato.
    const workspaceResult = await sql<WorkspaceFromDb>`
      SELECT id FROM workspaces WHERE user_id = ${user.id} ORDER BY created_at ASC LIMIT 1
    `;
    const defaultWorkspace = workspaceResult.rows[0];

    // Se un utente, per qualche motivo anomalo, non ha un workspace, non può procedere.
    if (!defaultWorkspace) {
      console.error(`CRITICAL: User ${user.id} authenticated but has no workspace.`);
      return { message: 'Configurazione account incompleta. Contatta il supporto.', success: false };
    }

    // 5. Crea e salva la sessione utente
    const session = await getSession();
    session.isLoggedIn = true;
    session.userId = user.id;
    session.workspaceId = defaultWorkspace.id; // Salva l'ID del workspace nella sessione
    await session.save();

    console.log(`✅ Login successful for user ${user.id}, workspace ${defaultWorkspace.id}`);

  } catch (error) {
    console.error('Login Error:', error);
    return { message: 'Si è verificato un errore durante il login. Riprova.', success: false };
  }

  // 6. Reindirizza alla dashboard con prefetch
  redirect('/dashboard');
}