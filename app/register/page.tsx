'use client'; // Necessario per usare i React Hooks (useState, useFormState)

import { useFormState, useFormStatus } from 'react-dom';
import { register, RegisterState } from './actions';
import Link from 'next/link';

const initialState: RegisterState = {
  message: '',
  success: false,
};

// Un componente separato per il bottone di submit ci permette di usare
// il hook useFormStatus per mostrare uno stato di "pending" (caricamento)
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
    >
      {pending ? 'Creazione account...' : 'Registrati'}
    </button>
  );
}

export default function RegisterPage() {
  const [state, formAction] = useFormState(register, initialState);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-3xl shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Crea il tuo account Sho</h1>
        <form action={formAction} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Mostra il messaggio di errore/successo */}
          {state.message && (
            <p className={`text-sm ${state.success ? 'text-green-600' : 'text-red-600'}`}>
              {state.message}
            </p>
          )}
          
          <SubmitButton />
        </form>
        <p className="text-sm text-center text-gray-600">
          Hai già un account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Accedi
          </Link>
        </p>
      </div>
    </div>
  );
}