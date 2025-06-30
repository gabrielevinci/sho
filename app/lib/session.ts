import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

// 1. Definiamo la struttura dei nostri dati di sessione
export interface SessionData {
  userId?: string;
  isLoggedIn: boolean;
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
// Questa è la versione corretta che usa la libreria come previsto.
// Risolviamo la promise dei cookie PRIMA di passarla a getIronSession.
export async function getSession(): Promise<IronSession<SessionData>> {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  
  // Inizializziamo i valori di default se la sessione è nuova
  if (!session.isLoggedIn) {
    session.isLoggedIn = false;
  }

  return session;
}