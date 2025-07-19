// Script per testare il filtro "today" nel frontend
// Simula il calcolo dell'intervallo di date che farebbe il frontend

const getDateRangeFromFilter = (filter) => {
  // Usa il fuso orario italiano per il calcolo delle date
  const now = new Date();
  const italianNow = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
  
  switch (filter) {
    case 'today':
      // Ottenere il timestamp corrente locale
      const now = new Date();
      
      // Calcola 24 ore fa
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // In estate l'Italia è UTC+2
      return { 
        startDate: start.toISOString(),
        endDate: now.toISOString()
      };
    default:
      return { startDate: '', endDate: '' };
  }
};

console.log('=== TEST FILTRO TODAY ===');
console.log('Data e ora italiana corrente:', new Date().toLocaleString("it-IT", {timeZone: "Europe/Rome"}));

const range = getDateRangeFromFilter('today');
console.log('Intervallo calcolato:');
console.log('  startDate:', range.startDate);
console.log('  endDate:', range.endDate);

// Calcola la durata dell'intervallo
const start = new Date(range.startDate);
const end = new Date(range.endDate);
const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
console.log('  Durata in ore:', durationHours.toFixed(2));
