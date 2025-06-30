'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createShortLink, CreateLinkState } from './actions';

const initialState: CreateLinkState = {
  message: '',
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:bg-gray-400"
    >
      {pending ? 'Creazione...' : 'Shorta'}
    </button>
  );
}

export default function CreateLinkForm() {
  const [state, formAction] = useFormState(createShortLink, initialState);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Crea un nuovo link</h2>
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="originalUrl" className="sr-only">
            URL da shortare
          </label>
          <input
            id="originalUrl"
            name="originalUrl"
            type="url"
            required
            placeholder="https://esempio.com/un-link-molto-lungo"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <SubmitButton />
      </form>

      {state.message && (
        <div className={`mt-4 text-sm ${state.success ? 'text-green-600' : 'text-red-600'}`}>
          {state.message}
        </div>
      )}
    </div>
  );
}