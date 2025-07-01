'use client';

import { useState, useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createAdvancedLink, CreateAdvancedLinkState } from '@/app/dashboard/actions';
import { SITE_URL } from '@/app/lib/config';

// Componente per il bottone di submit
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:bg-gray-400"
    >
      {pending ? 'Creazione in corso...' : 'Crea Link'}
    </button>
  );
}

// Componente per i campi UTM
function UtmFields() {
  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="font-semibold text-gray-700">Parametri UTM (Opzionale)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ... campi UTM ... */}
        <div><label htmlFor="utm_source">Sorgente</label><input type="text" name="utm_source" id="utm_source" placeholder="google, newsletter" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" /></div>
        <div><label htmlFor="utm_medium">Medium</label><input type="text" name="utm_medium" id="utm_medium" placeholder="cpc, email" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" /></div>
        <div><label htmlFor="utm_campaign">Campagna</label><input type="text" name="utm_campaign" id="utm_campaign" placeholder="summer_sale" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" /></div>
        <div><label htmlFor="utm_term">Termine</label><input type="text" name="utm_term" id="utm_term" placeholder="running_shoes" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" /></div>
        <div className="md:col-span-2"><label htmlFor="utm_content">Contenuto</label><input type="text" name="utm_content" id="utm_content" placeholder="logolink, textlink" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" /></div>
      </div>
    </div>
  );
}

// Form principale
export default function AdvancedCreateForm() {
  const initialState: CreateAdvancedLinkState = { message: '', errors: {}, success: false };
  const [state, formAction] = useFormState(createAdvancedLink, initialState);
  const [showUtm, setShowUtm] = useState(false);
  
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Se la creazione ha successo, puliamo il form per la prossima creazione.
    if (state.success) {
      formRef.current?.reset();
      setShowUtm(false);
    }
  }, [state]); // Dipendiamo dall'intero oggetto di stato

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {/* Campo URL Originale */}
      <div>
        <label htmlFor="originalUrl" className="block text-sm font-medium text-gray-800">URL di Destinazione</label>
        <input type="url" name="originalUrl" id="originalUrl" required placeholder="https://esempio.com/il-mio-articolo" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        {state.errors?.originalUrl && <p className="mt-1 text-sm text-red-600">{state.errors.originalUrl}</p>}
      </div>

      {/* Campi Opzionali Principali */}
      <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
        <div><label htmlFor="title" className="block text-sm font-medium text-gray-600">Titolo (Opzionale)</label><input type="text" name="title" id="title" placeholder="Il mio fantastico articolo" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" /></div>
        <div><label htmlFor="description" className="block text-sm font-medium text-gray-600">Descrizione (Opzionale)</label><textarea name="description" id="description" rows={3} placeholder="Una breve descrizione del contenuto del link." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"></textarea></div>
        <div>
          <label htmlFor="shortCode" className="block text-sm font-medium text-gray-600">Short Code Personalizzato (Opzionale)</label>
          <div className="flex items-center mt-1"><span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md h-11">{SITE_URL.replace(/^https?:\/\//, '')}/</span><input type="text" name="shortCode" id="shortCode" placeholder="mio-link" className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" /></div>
          {state.errors?.shortCode && <p className="mt-1 text-sm text-red-600">{state.errors.shortCode}</p>}
        </div>
      </div>

      {/* Sezione UTM */}
      <div><button type="button" onClick={() => setShowUtm(!showUtm)} className="text-sm text-blue-600 hover:underline">{showUtm ? 'Nascondi Opzioni UTM' : 'Mostra Opzioni UTM'}</button>{showUtm && <div className="mt-4"><UtmFields /></div>}</div>
      
      {/* Area per i messaggi di feedback */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-end">
          <SubmitButton />
        </div>
        
        {/* Messaggio di successo, ora VISIBILE e FUNZIONANTE */}
        {state.success && state.finalShortCode && (
          <div className="mt-4 p-4 rounded-md bg-green-50 text-center">
            <p className="font-semibold text-green-800">{state.message}</p>
            <a 
              href={`${SITE_URL}/${state.finalShortCode}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-2 inline-block font-mono bg-green-200 text-green-900 p-2 rounded-md hover:bg-green-300 break-all"
            >
              {`${SITE_URL}/${state.finalShortCode}`}
            </a>
          </div>
        )}

        {/* Messaggio di errore generale */}
        {state.errors?.general && (
          <div className="mt-4 p-4 rounded-md bg-red-50 text-center">
            <p className="text-sm text-red-700">{state.errors.general}</p>
          </div>
        )}
      </div>
    </form>
  );
}