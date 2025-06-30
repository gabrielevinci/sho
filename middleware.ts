import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/app/lib/session';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Il middleware ha accesso diretto ai cookie della richiesta e della risposta.
  // È l'unico posto dove si usa getIronSession in questo modo specifico.
  const session = await getIronSession<SessionData>(request.cookies, sessionOptions);

  const { isLoggedIn } = session;
  const { pathname } = request.nextUrl;

  // Logica di reindirizzamento:
  // 1. Se l'utente è loggato e cerca di accedere a /login o /register,
  //    reindirizzalo alla dashboard.
  if (isLoggedIn && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. Se l'utente NON è loggato e cerca di accedere a una rotta protetta
  //    (in questo caso, tutto ciò che inizia con /dashboard),
  //    reindirizzalo al login.
  if (!isLoggedIn && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. In tutti gli altri casi, lascia che la richiesta prosegua normalmente.
  return response;
}

// Configurazione del Matcher:
// Specifica su quali percorsi il middleware deve essere eseguito.
// Questo è un'ottimizzazione delle performance fondamentale.
export const config = {
  matcher: [
    /*
     * Corrisponde a tutti i percorsi di richiesta eccetto quelli che iniziano con:
     * - api (percorsi API)
     * - _next/static (file statici)
     * - _next/image (ottimizzazione immagini)
     * - favicon.ico (file icona)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};