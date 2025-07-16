'use client';

import { useEffect, useRef } from 'react';
import { AdvancedFingerprintCollector } from '@/lib/advanced-fingerprint';

interface AutoEnhancePageProps {
  linkId: string;
  fingerprintHash: string;
  targetUrl: string;
}

export default function AutoEnhancePage({ 
  linkId, 
  fingerprintHash, 
  targetUrl 
}: AutoEnhancePageProps) {
  const enhancementSent = useRef(false);

  useEffect(() => {
    async function enhanceAndRedirect() {
      if (enhancementSent.current) return;
      enhancementSent.current = true;

      try {
        // Raccogli dati avanzati in background
        const collector = new AdvancedFingerprintCollector();
        const clientFingerprint = await collector.collect();

        // Invia al server (non aspettare la risposta)
        fetch('/api/analytics/fingerprint/enhance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            linkId,
            fingerprintHash,
            clientFingerprint,
          }),
        }).catch(() => {
          // Ignora errori - il redirect deve avvenire comunque
        });

        // Redirect immediato dopo 50ms (invisibile per l'utente)
        setTimeout(() => {
          window.location.replace(targetUrl);
        }, 50);

      } catch (error) {
        // Se c'è un errore, redirect comunque
        window.location.replace(targetUrl);
      }
    }

    enhanceAndRedirect();
  }, [linkId, fingerprintHash, targetUrl]);

  // Pagina completamente invisibile
  return (
    <div style={{ 
      position: 'fixed', 
      top: '-9999px', 
      left: '-9999px',
      width: '1px',
      height: '1px',
      opacity: 0
    }}>
      <span>Redirecting...</span>
    </div>
  );
}
