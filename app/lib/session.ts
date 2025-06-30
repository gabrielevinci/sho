// app/lib/session.ts

import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  userId: string;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD as string,
  cookieName: 'sho-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
};

// Funzione helper per ottenere la sessione corrente in Server Components, API Routes o Server Actions.
export async function getSession(): Promise<IronSession<SessionData>> {
  // 1. Prima otteniamo l'archivio dei cookie
  const cookieStore = cookies(); 
  // 2. Poi lo passiamo a getIronSession
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session;
}