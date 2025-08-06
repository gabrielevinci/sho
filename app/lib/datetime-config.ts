/**
 * Configurazioni per la gestione di date e orari nell'applicazione
 */

// Fuso orario predefinito dell'applicazione
export const APP_TIMEZONE = 'Europe/Rome';

// Locale predefinito
export const APP_LOCALE = 'it-IT';

// Opzioni di formattazione comuni
export const DATE_FORMAT_OPTIONS = {
  // Solo data
  dateOnly: {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    timeZone: APP_TIMEZONE
  } as Intl.DateTimeFormatOptions,
  
  // Data con mese per esteso
  dateLong: {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: APP_TIMEZONE
  } as Intl.DateTimeFormatOptions,
  
  // Data compatta (senza anno)
  dateShort: {
    day: '2-digit',
    month: '2-digit',
    timeZone: APP_TIMEZONE
  } as Intl.DateTimeFormatOptions,
  
  // Solo ora
  timeOnly: {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIMEZONE
  } as Intl.DateTimeFormatOptions,
  
  // Data e ora
  dateTime: {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIMEZONE
  } as Intl.DateTimeFormatOptions,
  
  // Data e ora estesa
  dateTimeLong: {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIMEZONE
  } as Intl.DateTimeFormatOptions,
  
  // Per i grafici - solo mese abbreviato
  chartMonth: {
    day: '2-digit',
    month: 'short',
    timeZone: APP_TIMEZONE
  } as Intl.DateTimeFormatOptions,
  
  // Per i grafici - anno compatto
  chartYear: {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: APP_TIMEZONE
  } as Intl.DateTimeFormatOptions
};

/**
 * Utility functions per la formattazione delle date
 */
export const formatDate = {
  /**
   * Formatta una data usando il fuso orario dell'app
   */
  toLocaleDateString: (date: string | Date, options?: Intl.DateTimeFormatOptions) => {
    return new Date(date).toLocaleDateString(APP_LOCALE, {
      ...options,
      timeZone: APP_TIMEZONE
    });
  },
  
  /**
   * Formatta un orario usando il fuso orario dell'app
   */
  toLocaleTimeString: (date: string | Date, options?: Intl.DateTimeFormatOptions) => {
    return new Date(date).toLocaleTimeString(APP_LOCALE, {
      ...options,
      timeZone: APP_TIMEZONE
    });
  },
  
  /**
   * Formatta data e ora usando il fuso orario dell'app
   */
  toLocaleString: (date: string | Date, options?: Intl.DateTimeFormatOptions) => {
    return new Date(date).toLocaleString(APP_LOCALE, {
      ...options,
      timeZone: APP_TIMEZONE
    });
  }
};

/**
 * Utility per verificare se siamo nel browser (per evitare errori SSR)
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Ottiene il fuso orario del browser dell'utente (per debug)
 */
export const getUserTimezone = () => {
  if (!isBrowser) return APP_TIMEZONE;
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Debug: mostra la differenza tra il fuso orario dell'utente e quello dell'app
 */
export const getTimezoneOffset = () => {
  if (!isBrowser) return 0;
  
  const now = new Date();
  const userTime = new Date(now.toLocaleString('en-US', { timeZone: getUserTimezone() }));
  const appTime = new Date(now.toLocaleString('en-US', { timeZone: APP_TIMEZONE }));
  
  return (userTime.getTime() - appTime.getTime()) / (1000 * 60 * 60); // Ore di differenza
};
