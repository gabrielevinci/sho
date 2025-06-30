'use server';

import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';

export async function logout() {
  // 1. Ottieni la sessione corrente.
  const session = await getSession();

  // 2. Chiama il metodo destroy che abbiamo definito.
  await session.destroy();

  // 3. Reindirizza l'utente alla pagina di login.
  redirect('/login');
}