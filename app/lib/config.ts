/**
 * Questo file centralizza la configurazione del sito, come l'URL di base.
 * Utilizza le variabili d'ambiente di Vercel per determinare l'URL corretto
 * in ogni ambiente (produzione, preview, sviluppo locale).
 */

// Determina l'URL di base del sito.
const getSiteUrl = () => {
  // Se siamo in un ambiente Vercel, usiamo VERCEL_URL.
  if (process.env.VERCEL_URL) {
    // VERCEL_URL non include il protocollo, quindi lo aggiungiamo.
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Altrimenti, per lo sviluppo locale, usiamo localhost.
  return 'http://localhost:3000';
};

// Esportiamo la costante che verrà usata nel resto dell'applicazione.
export const SITE_URL = getSiteUrl();