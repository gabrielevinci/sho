/**
 * Configurazioni per le performance della dashboard
 */

// Configurazioni di caching
export const CACHE_CONFIG = {
  // Durata cache in millisecondi
  LINKS_CACHE_DURATION: 30000, // 30 secondi
  FOLDERS_CACHE_DURATION: 60000, // 1 minuto
  
  // Intervalli di refresh automatico
  AUTO_REFRESH_INTERVAL: 120000, // 2 minuti
  
  // Numero massimo di retry per le richieste
  MAX_RETRIES: 3,
  
  // Delay tra i retry (in ms)
  RETRY_DELAY: 1000,
} as const;

// Configurazioni UI
export const UI_CONFIG = {
  // Debounce per le ricerche
  SEARCH_DEBOUNCE_MS: 300,
  
  // Timeout per le animazioni
  ANIMATION_DURATION: 200,
  
  // Numero di elementi per paginazione
  ITEMS_PER_PAGE: 50,
  
  // Delay per il caricamento iniziale (per evitare flash)
  INITIAL_LOAD_DELAY: 100,
} as const;

// Configurazioni di logging
export const LOGGING_CONFIG = {
  // Abilita logging dettagliato in sviluppo
  ENABLE_DEBUG_LOGS: process.env.NODE_ENV === 'development',
  
  // Log delle performance
  ENABLE_PERFORMANCE_LOGS: true,
  
  // Log degli errori di rete
  ENABLE_NETWORK_ERROR_LOGS: true,
} as const;

// Utility per il logging condizionale
export const logger = {
  debug: (...args: any[]) => {
    if (LOGGING_CONFIG.ENABLE_DEBUG_LOGS) {
      console.log('🔍 DEBUG:', ...args);
    }
  },
  
  performance: (...args: any[]) => {
    if (LOGGING_CONFIG.ENABLE_PERFORMANCE_LOGS) {
      console.log('⚡ PERFORMANCE:', ...args);
    }
  },
  
  networkError: (...args: any[]) => {
    if (LOGGING_CONFIG.ENABLE_NETWORK_ERROR_LOGS) {
      console.error('🌐 NETWORK ERROR:', ...args);
    }
  },
  
  info: (...args: any[]) => {
    console.log('ℹ️ INFO:', ...args);
  },
  
  warn: (...args: any[]) => {
    console.warn('⚠️ WARNING:', ...args);
  },
  
  error: (...args: any[]) => {
    console.error('❌ ERROR:', ...args);
  }
};
