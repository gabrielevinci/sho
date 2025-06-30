'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createShortLink, CreateLinkState } from './actions';
import { useEffect, useRef } from 'react';

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
      className="px-6 py-2 bg-gray-900 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:bg-gray-400"
    >
      {pending ? 'Creazione...' : 'Shorta'}
    </button>
  );
}

export default function CreateLinkForm() {
  const [state, formAction] = useFormState(createShortLink, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Resetta il form dopo una creazione avvenuta con successo
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Crea un nuovo link</h2>
      <form ref={formRef} action={formAction} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
          <input
            id="originalUrl"
            name="originalUrl"
            type="url"
            required
            placeholder="https://esempio.com/un-link-molto-lungo"
            className="flex-grow block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <SubmitButton />
        </div>
      </form>

      {/* Mostra il messaggio di stato e il link generato */}
      {state.message && (
        <div className={`mt-4 text-sm p-3 rounded-md ${state.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <p className="font-medium">{state.message}</p>
          {state.success && state.shortUrl && (
            <div className="mt-2">
              <p>Il tuo link shortato è pronto:</p>
              <a 
                href={state.shortUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-mono bg-gray-100 p-1 rounded hover:underline"
              >
                {state.shortUrl}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}