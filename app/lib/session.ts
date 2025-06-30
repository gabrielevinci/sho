import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

// 1. Definiamo la struttura dei nostri dati di sessione
export interface SessionData {
  userId?: string;
  isLoggedIn: boolean;
  workspaceId?: string;
}

// 2. Definiamo le opzioni della sessione
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD as string,
  cookieName: 'sho-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
};

// 3. Funzione helper per ottenere la sessione
export async function getSession(): Promise<IronSession<SessionData>> {
  // QUESTA È LA SOLUZIONE. Aspettiamo (await) che cookies() si risolva.
  const cookieStore = await cookies();
  
  // Ora passiamo l'oggetto risolto (non più una promise) a getIronSession.
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  
  // Inizializziamo i valori di default se la sessione è nuova
  if (!session.isLoggedIn) {
    session.isLoggedIn = false;
  }

  return session;
}