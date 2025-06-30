import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { logout } from './actions';
import CreateLinkForm from './create-link-form'; // <-- Importa il nuovo componente

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

export default async function DashboardPage() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 py-12">
      <div className="w-full max-w-4xl p-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <LogoutButton />
        </div>

        {/* Includiamo il form per creare i link */}
        <CreateLinkForm />

        {/* Qui, in futuro, mostreremo la lista dei link esistenti */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-800">I tuoi link</h2>
          <div className="mt-4 p-6 bg-white rounded-lg shadow-md text-center text-gray-500">
            <p>La lista dei tuoi link apparirà qui.</p>
          </div>
        </div>
      </div>
    </div>
  );
}