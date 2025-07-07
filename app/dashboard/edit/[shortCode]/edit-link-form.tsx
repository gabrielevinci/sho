'use client';

import { useState, useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { updateAdvancedLink, UpdateLinkState } from '@/app/dashboard/actions';
import { SITE_URL } from '@/app/lib/config';
import { useRouter } from 'next/navigation';

interface LinkData {
  short_code: string;
  original_url: string;
  title: string | null;
  description: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  created_at: string | Date;
}

interface EditLinkFormProps {
  linkData: LinkData;
}

// Componente per il bottone di submit
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:bg-gray-400"
    >
      {pending ? 'Salvando modifiche...' : 'Salva Modifiche'}
    </button>
  );
}

// Componente per i campi UTM
function UtmFields({ linkData }: { linkData: LinkData }) {
  const fieldClass = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-gray-600";
  
  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="font-semibold text-gray-700">Parametri UTM</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="utm_source" className={labelClass}>Sorgente</label>
          <input 
            type="text" 
            name="utm_source" 
            id="utm_source" 
            placeholder="google, newsletter" 
            className={fieldClass}
            defaultValue={linkData.utm_source || ''}
          />
        </div>
        <div>
          <label htmlFor="utm_medium" className={labelClass}>Medium</label>
          <input 
            type="text" 
            name="utm_medium" 
            id="utm_medium" 
            placeholder="cpc, email" 
            className={fieldClass}
            defaultValue={linkData.utm_medium || ''}
          />
        </div>
        <div>
          <label htmlFor="utm_campaign" className={labelClass}>Campagna</label>
          <input 
            type="text" 
            name="utm_campaign" 
            id="utm_campaign" 
            placeholder="summer_sale" 
            className={fieldClass}
            defaultValue={linkData.utm_campaign || ''}
          />
        </div>
        <div>
          <label htmlFor="utm_term" className={labelClass}>Termine</label>
          <input 
            type="text" 
            name="utm_term" 
            id="utm_term" 
            placeholder="running_shoes" 
            className={fieldClass}
            defaultValue={linkData.utm_term || ''}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="utm_content" className={labelClass}>Contenuto</label>
          <input 
            type="text" 
            name="utm_content" 
            id="utm_content" 
            placeholder="logolink, textlink" 
            className={fieldClass}
            defaultValue={linkData.utm_content || ''}
          />
        </div>
      </div>
    </div>
  );
}

// Form principale per la modifica
export default function EditLinkForm({ linkData }: EditLinkFormProps) {
  const router = useRouter();
  const initialState: UpdateLinkState = { message: '', errors: {}, success: false };
  const [state, formAction] = useFormState(
    updateAdvancedLink.bind(null, linkData.short_code), 
    initialState
  );
  const [showUtm, setShowUtm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Verifica se ci sono dati UTM esistenti per mostrare la sezione
  useEffect(() => {
    const hasUtmData = linkData.utm_source || linkData.utm_medium || linkData.utm_campaign || 
                      linkData.utm_term || linkData.utm_content;
    if (hasUtmData) {
      setShowUtm(true);
    }
  }, [linkData]);

  useEffect(() => {
    if (state.success) {
      // Se il short code è cambiato, reindirizza al nuovo URL
      if (state.finalShortCode && state.finalShortCode !== linkData.short_code) {
        router.push(`/dashboard`);
      } else {
        router.push('/dashboard');
      }
    }
  }, [state, router, linkData.short_code]);

  return (
    <div className="space-y-6">
      {/* Messaggio di successo */}
      {state.success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">{state.message}</p>
        </div>
      )}

      {/* Messaggio di errore generale */}
      {state.errors?.general && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{state.errors.general}</p>
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-6">
        <div>
          <label htmlFor="originalUrl" className="block text-sm font-medium text-gray-800">
            URL di Destinazione
          </label>
          <input 
            type="url" 
            name="originalUrl" 
            id="originalUrl" 
            required 
            placeholder="https://esempio.com/il-mio-articolo" 
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            defaultValue={linkData.original_url}
          />
          {state.errors?.originalUrl && (
            <p className="mt-1 text-sm text-red-600">{state.errors.originalUrl}</p>
          )}
        </div>

        <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-600">
              Titolo (Opzionale)
            </label>
            <input 
              type="text" 
              name="title" 
              id="title" 
              placeholder="Il mio fantastico articolo" 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue={linkData.title || ''}
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-600">
              Descrizione (Opzionale)
            </label>
            <textarea 
              name="description" 
              id="description" 
              rows={3} 
              placeholder="Una breve descrizione del contenuto del link." 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue={linkData.description || ''}
            />
          </div>
          
          <div>
            <label htmlFor="shortCode" className="block text-sm font-medium text-gray-600">
              Short Code Personalizzato (Opzionale)
            </label>
            <div className="flex items-center mt-1">
              <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md h-11">
                {SITE_URL.replace(/^https?:\/\//, '')}/
              </span>
              <input 
                type="text" 
                name="shortCode" 
                id="shortCode" 
                placeholder="mio-link" 
                className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-r-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                defaultValue={linkData.short_code}
              />
            </div>
            {state.errors?.shortCode && (
              <p className="mt-1 text-sm text-red-600">{state.errors.shortCode}</p>
            )}
          </div>
        </div>

        <div>
          <button 
            type="button" 
            onClick={() => setShowUtm(!showUtm)} 
            className="text-sm text-blue-600 hover:underline"
          >
            {showUtm ? 'Nascondi Opzioni UTM' : 'Mostra Opzioni UTM'}
          </button>
          {showUtm && (
            <div className="mt-4">
              <UtmFields linkData={linkData} />
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2.5 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
          >
            Annulla
          </button>
          
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
