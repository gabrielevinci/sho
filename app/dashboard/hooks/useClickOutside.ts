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
      // Verifica che l'evento target non sia null/undefined
      if (!event.target) return;
      
      // Verifica che il target sia un Node
      if (!(event.target instanceof Node)) return;
      
      // Verifica che il click sia esterno al componente
      if (ref.current && !ref.current.contains(event.target)) {
        // Aggiungi controllo per evitare di chiudere se si clicca su elementi di sistema
        const targetElement = event.target as Element;
        
        // Non chiudere se il click è su scrollbar o elementi di sistema
        if (targetElement.tagName === 'BODY' || 
            targetElement.tagName === 'HTML' ||
            targetElement.closest('[data-prevent-outside-click]')) {
          return;
        }
        
        callback();
      }
    };

    // Delay più lungo per evitare chiusure immediate al momento dell'apertura
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, { 
        passive: false,
        capture: true 
      });
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, { capture: true });
    };
  }, [callback, isActive]);

  return ref;
}
