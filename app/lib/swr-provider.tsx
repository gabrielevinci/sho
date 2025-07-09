'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

interface SWRProviderProps {
  children: ReactNode;
}

// Estensione del tipo Error per includere info e status
interface FetchError extends Error {
  info?: unknown;
  status?: number;
}

// Funzione fetcher ottimizzata per le API routes
const fetcher = async (url: string) => {
  const res = await fetch(url, {
    // Configurazione per migliorare le performance
    headers: {
      'Cache-Control': 'max-age=60', // Cache HTTP per 1 minuto
    },
  });

  if (!res.ok) {
    const error: FetchError = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object
    try {
      error.info = await res.json();
    } catch {
      error.info = null;
    }
    error.status = res.status;
    throw error;
  }

  return res.json();
};

export default function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        // Configurazione cache ottimizzata per il nuovo sistema
        dedupingInterval: 2000, // 2 secondi di deduplicazione (ridotto per maggiore reattività)
        refreshInterval: 0, // Disabilitato, gestito dal sistema di cache personalizzato
        revalidateOnFocus: false, // Gestito dal sistema di cache personalizzato
        revalidateOnReconnect: true, // Rivalidare quando si riconnette
        revalidateIfStale: false, // Gestito dal sistema di cache personalizzato
        // Configurazione errori
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        // Configurazione cache
        provider: () => new Map(),
        // Configurazioni per migliorare le performance
        suspense: false,
        fallbackData: undefined,
        // Configurazione per il background update
        revalidateOnMount: true,
        refreshWhenOffline: false,
        refreshWhenHidden: false,
        // Configurazione per la gestione degli errori
        onError: (error, key) => {
          console.error('SWR Error:', error, 'Key:', key);
        },
        // Configurazione per il successo
        onSuccess: (data, key) => {
          // Opzionale: log per debugging
          if (process.env.NODE_ENV === 'development') {
            console.log('SWR Success:', key, 'Data loaded');
          }
        },
        // Configurazione per il loading
        onLoadingSlow: (key) => {
          console.warn('SWR Loading slow:', key);
        },
        // Configurazione per il background update
        onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
          // Non fare retry per errori 404
          if (error.status === 404) return;
          
          // Non fare retry per errori 403 (authorization)
          if (error.status === 403) return;
          
          // Limita i retry
          if (retryCount >= 3) return;
          
          // Retry con backoff exponenziale
          setTimeout(() => revalidate({ retryCount }), Math.pow(2, retryCount) * 1000);
        }
      }}
    >
      {children}
    </SWRConfig>
  );
}