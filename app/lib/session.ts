import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

// 1. Definiamo la struttura dei nostri dati di sessione
export interface SessionData {
  userId?: string;
  isLoggedIn: boolean;
  workspaceId?: string; // <-- AGGIUNTA LA PROPRIETÀ PER IL WORKSPACE
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
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  
  if (!session.isLoggedIn) {
    session.isLoggedIn = false;
  }

  return session;
}