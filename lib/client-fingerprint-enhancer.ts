import { AdvancedFingerprintCollector } from '@/lib/advanced-fingerprint';

export async function enhanceServerFingerprint(linkId: string, fingerprintHash: string) {
  try {
    const collector = new AdvancedFingerprintCollector();
    const clientFingerprint = await collector.collect();

    // Invia i dati al server in background
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
    }).catch((error) => {
      console.error('Failed to enhance fingerprint:', error);
    });
  } catch (error) {
    console.error('Error collecting client fingerprint:', error);
  }
}

// Auto-esecuzione se siamo in un redirect
if (typeof window !== 'undefined') {
  const urlParams = new URLSearchParams(window.location.search);
  const linkId = urlParams.get('_lid');
  const fingerprintHash = urlParams.get('_fph');
  
  if (linkId && fingerprintHash) {
    // Esegui dopo che la pagina è caricata
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        enhanceServerFingerprint(linkId, fingerprintHash);
      });
    } else {
      enhanceServerFingerprint(linkId, fingerprintHash);
    }
  }
}
