import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { logout } from './actions';

// Componente per il bottone di logout, che usa un form per invocare il Server Action.
function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
      >
        Logout
      </button>
    </form>
  );
}

// La pagina Dashboard è un Server Component asincrono.
export default async function DashboardPage() {
  const session = await getSession();

  // Se non c'è una sessione valida, reindirizziamo al login.
  // Questa è una doppia sicurezza, anche se il middleware farà il grosso del lavoro.
  if (!session.isLoggedIn) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-white rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold text-center text-gray-900">
          Benvenuto nella tua Dashboard
        </h1>
        <div className="text-center text-gray-600">
          <p>ID Utente: <code className="bg-gray-100 p-1 rounded-md text-sm">{session.userId}</code></p>
          <p>Qui potrai gestire i tuoi link shortati.</p>
        </div>
        <div className="flex justify-center">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}