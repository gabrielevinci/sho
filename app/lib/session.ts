import { unsealData, sealData, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

// 1. Definiamo la struttura dei nostri dati di sessione
export interface SessionData {
  userId: string;
  isLoggedIn: boolean;
}

// 2. Definiamo le opzioni della sessione come prima
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD as string,
  cookieName: 'sho-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    // Opzionale: definisci una durata per il cookie, es. 1 settimana
    // maxAge: 60 * 60 * 24 * 7, 
  },
};

// 3. Creiamo la nostra funzione `getSession` personalizzata
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = cookies();
  const found = cookieStore.get(sessionOptions.cookieName);

  // Se non c'è un cookie di sessione, creiamo una sessione vuota
  if (!found) {
    return {
      ...emptySession,
      // `save` è il metodo per creare un nuovo cookie
      save: () => saveSessionToCookie(emptySession, cookieStore),
    };
  }

  // Se c'è un cookie, lo decrittiamo
  try {
    const data = await unsealData<SessionData>(found.value, {
      password: sessionOptions.password,
    });
    
    // Creiamo un oggetto sessione con i dati e i metodi save/destroy
    const session = { 
      ...data,
      isLoggedIn: true,
      save: () => saveSessionToCookie(session, cookieStore),
      destroy: () => destroySessionCookie(cookieStore),
    };

    return session;

  } catch (error) {
    // Se la decrittazione fallisce (es. cookie manomesso o password cambiata)
    console.error("Failed to unseal session, creating a new one.", error);
    return {
      ...emptySession,
      save: () => saveSessionToCookie(emptySession, cookieStore),
    };
  }
}

// Helper per definire una sessione vuota
const emptySession: SessionData & {isLoggedIn: false} = {
  userId: '',
  isLoggedIn: false,
};

// Helper per salvare la sessione nel cookie
async function saveSessionToCookie(session: IronSession<SessionData>, cookieStore: ReadonlyRequestCookies & { set: (name: string, value: string, options: any) => void }) {
  const sealed = await sealData(session, {
    password: sessionOptions.password,
  });

  cookieStore.set(sessionOptions.cookieName, sealed, sessionOptions.cookieOptions);
}

// Helper per distruggere il cookie di sessione
async function destroySessionCookie(cookieStore: ReadonlyRequestCookies & { set: (name: string, value: string, options: any) => void }) {
    // Per eliminare un cookie, lo impostiamo con una data di scadenza nel passato (maxAge: 0)
    cookieStore.set(sessionOptions.cookieName, '', { ...sessionOptions.cookieOptions, maxAge: 0 });
}