import { unsealData, sealData, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

// Tipi helper per la gestione dei cookie
type MutableCookieStore = ReadonlyRequestCookies & {
  set: (name: string, value: string, options: Partial<ResponseCookie>) => void;
};

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

// 1. Dati della sessione
export interface SessionData {
  userId: string;
  isLoggedIn: boolean;
}

// 2. Opzioni della sessione
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD as string,
  cookieName: 'sho-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
};

// Funzione "noop" (no-operation) per soddisfare il tipo IronSession
const noop = () => {};

// 3. Funzione principale per ottenere la sessione
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = (await cookies()) as MutableCookieStore;
  const found = cookieStore.get(sessionOptions.cookieName);

  if (!found) {
    return createEmptySession(cookieStore);
  }

  try {
    const data = await unsealData<SessionData>(found.value, {
      password: sessionOptions.password,
    });
    
    // Creiamo un oggetto sessione che soddisfa pienamente il tipo IronSession<T>
    // Dichiarando prima `session` possiamo usarla ricorsivamente in `save`.
    let session: IronSession<SessionData>;
    session = { 
      ...data,
      isLoggedIn: true,
      save: () => saveSessionToCookie(session, cookieStore),
      destroy: () => destroySessionCookie(cookieStore),
      updateConfig: noop, // <-- PROPRIETÀ MANCANTE AGGIUNTA
    };

    return session;

  } catch (error) {
    console.error("Failed to unseal session, creating a new one.", error);
    return createEmptySession(cookieStore);
  }
}

// Helper per creare una sessione vuota che soddisfa il tipo
function createEmptySession(cookieStore: MutableCookieStore): IronSession<SessionData> {
  const emptySessionData: SessionData = {
    userId: '',
    isLoggedIn: false,
  };

  // Dichiarazione separata per permettere il riferimento ricorsivo in `save`
  let session: IronSession<SessionData>;
  session = {
    ...emptySessionData,
    save: () => saveSessionToCookie(session, cookieStore),
    destroy: () => destroySessionCookie(cookieStore),
    updateConfig: noop, // <-- PROPRIETÀ MANCANTE AGGIUNTA
  };
  
  return session;
}

// Helper per salvare la sessione nel cookie
async function saveSessionToCookie(session: IronSession<SessionData>, cookieStore: MutableCookieStore) {
  // Rimuoviamo i metodi prima di sigillare, per salvare solo i dati puri.
  const dataToSeal: Partial<IronSession<SessionData>> = { ...session };
  delete dataToSeal.save;
  delete dataToSeal.destroy;
  delete dataToSeal.updateConfig;

  const sealed = await sealData(dataToSeal, {
    password: sessionOptions.password,
  });

  cookieStore.set(sessionOptions.cookieName, sealed, sessionOptions.cookieOptions);
}

// Helper per distruggere il cookie di sessione
async function destroySessionCookie(cookieStore: MutableCookieStore) {
    cookieStore.set(sessionOptions.cookieName, '', { ...sessionOptions.cookieOptions, maxAge: 0 });
}