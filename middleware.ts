import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { unsealData } from 'iron-session';
import { sessionOptions, SessionData } from '@/app/lib/session';

export async function middleware(request: NextRequest) {
  // Otteniamo il valore del cookie di sessione dalla richiesta
  const cookieValue = request.cookies.get(sessionOptions.cookieName)?.value;

  // Inizializziamo una sessione "vuota" di default
  let sessionData: SessionData = { isLoggedIn: false };

  // Se esiste un cookie, proviamo a decrittografarlo
  if (cookieValue) {
    try {
      // Usiamo unsealData per leggere i dati crittografati in modo sicuro
      const unsealed = await unsealData<SessionData>(cookieValue, {
        password: sessionOptions.password,
      });
      // Se la decrittazione ha successo, aggiorniamo i dati della sessione
      sessionData = unsealed;
    } catch (error) {
      // Se il cookie è malformato, scaduto o la password è sbagliata, lo ignoriamo.
      // La sessionData rimane { isLoggedIn: false }
      console.error('Middleware: Failed to unseal session', error);
      
      // Opzionalmente, cancella il cookie malformato
      const response = NextResponse.next();
      response.cookies.delete(sessionOptions.cookieName);
      return response;
    }
  }
  
  const { isLoggedIn } = sessionData;
  const { pathname } = request.nextUrl;

  // Logica di reindirizzamento migliorata
  // 1. Se l'utente è loggato e va su /login o /register, reindirizza a /dashboard
  if (isLoggedIn && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    const url = new URL('/dashboard', request.url);
    return NextResponse.redirect(url);
  }

  // 2. Se l'utente NON è loggato e va su /dashboard, reindirizza a /login
  if (!isLoggedIn && pathname.startsWith('/dashboard')) {
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }

  // 3. In tutti gli altri casi, prosegui
  return NextResponse.next();
}

// Configurazione del Matcher (invariata)
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};