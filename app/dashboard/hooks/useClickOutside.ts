'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook personalizzato per gestire il click fuori da un elemento.
 * Utilizzato per chiudere pop-up, modal, dropdown quando si clicca all'esterno.
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  callback: () => void,
  isActive: boolean = true
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    // Aggiungi listener con un piccolo delay per evitare chiusure immediate
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [callback, isActive]);

  return ref;
}
