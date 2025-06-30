/**
 * Questo file esporta l'URL canonico del sito, che deve essere usato
 * in tutta l'applicazione, sia lato server che lato client.
 * Utilizza una variabile d'ambiente pubblica per garantire coerenza.
 */

// Leggiamo la variabile d'ambiente. Se non è impostata, lanciamo un errore
// per evitare comportamenti inaspettati in produzione.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

if (!siteUrl) {
  throw new Error("La variabile d'ambiente NEXT_PUBLIC_SITE_URL non è stata impostata.");
}

export const SITE_URL = siteUrl;