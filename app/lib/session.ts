import { unsealData, sealData, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

// Definiamo un'interfaccia che descrive il cookie store di Next.js
// includendo il metodo 'set', che esiste ma non è nel tipo Readonly.
// Questo è il modo corretto e type-safe per risolvere il problema.
type MutableCookieStore = ReadonlyRequestCookies & {
  set: (name: string, value: string, options: Partial<ResponseCookie>) => void;
};

// Definiamo un tipo parziale per le opzioni del cookie, come richiesto dal metodo `set`.
type ResponseCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
};

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
    // maxAge: 60 * 60 * 24 * 7, // 1 settimana
  },
};

// 3. Creiamo la nostra funzione `getSession` personalizzata
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = cookies() as MutableCookieStore;
  const found = cookieStore.get(sessionOptions.cookieName);

  if (!found) {
    const session = createEmptySession(cookieStore);
    return session;
  }

  try {
    const data = await unsealData<SessionData>(found.value, {
      password: sessionOptions.password,
    });
    
    const session: IronSession<SessionData> = { 
      ...data,
      isLoggedIn: true,
      save: () => saveSessionToCookie(session, cookieStore),
      destroy: () => destroySessionCookie(cookieStore),
    };

    return session;

  } catch (error) {
    console.error("Failed to unseal session, creating a new one.", error);
    const session = createEmptySession(cookieStore);
    return session;
  }
}

// Helper per creare una sessione vuota
function createEmptySession(cookieStore: MutableCookieStore): IronSession<SessionData> {
  const emptySessionData: SessionData = {
    userId: '',
    isLoggedIn: false,
  };
  return {
    ...emptySessionData,
    save: () => saveSessionToCookie({ ...emptySessionData, save: () => {}, destroy: () => {} }, cookieStore),
    destroy: () => destroySessionCookie(cookieStore),
  };
}

// Helper per salvare la sessione nel cookie
async function saveSessionToCookie(session: IronSession<SessionData>, cookieStore: MutableCookieStore) {
  const sealed = await sealData(session, {
    password: sessionOptions.password,
  });

  cookieStore.set(sessionOptions.cookieName, sealed, sessionOptions.cookieOptions);
}

// Helper per distruggere il cookie di sessione
async function destroySessionCookie(cookieStore: MutableCookieStore) {
    cookieStore.set(sessionOptions.cookieName, '', { ...sessionOptions.cookieOptions, maxAge: 0 });
}