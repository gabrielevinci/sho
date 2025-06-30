import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

// Definiamo la struttura dei dati che salveremo nella sessione.
// In questo modo avremo l'autocompletamento e il type-checking.
export interface SessionData {
  userId: string;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD as string,
  cookieName: 'sho-session',
  // Opzioni di sicurezza del cookie.
  // httpOnly: Previene l'accesso al cookie tramite JavaScript nel client (protezione da XSS).
  // secure: Il cookie verrà inviato solo su connessioni HTTPS. In produzione è essenziale.
  // sameSite: 'strict' previene attacchi CSRF.
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
};

// Funzione helper per ottenere la sessione corrente in Server Components, API Routes o Server Actions.
export async function getSession(): Promise<IronSession<SessionData>> {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  return session;
}