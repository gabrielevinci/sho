// Test per verificare la correttezza delle Statistiche Generali con filtro "24 ore"
// Simuliamo chiamate API per confrontare i dati

console.log('=== TEST FILTRO 24 ORE ===');
console.log('Data corrente (Italia):', new Date().toLocaleString("it-IT", {timeZone: "Europe/Rome"}));

// Simula il calcolo del frontend per le ultime 24 ore
const calculateLast24Hours = () => {
  const now = new Date();
  const italianNow = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
  
  // Calcola l'ora corrente italiana arrotondata all'ora
  const currentHourItalian = new Date(italianNow);
  currentHourItalian.setMinutes(0, 0, 0); 
  
  // Calcola le precedenti 23 ore per un totale di 24 ore
  const startHourItalian = new Date(currentHourItalian.getTime() - 23 * 60 * 60 * 1000);
  
  return {
    startDate: startHourItalian.toISOString().replace('Z', '+02:00'),
    endDate: currentHourItalian.toISOString().replace('Z', '+02:00'),
    startHourItalian: startHourItalian.toLocaleString("it-IT", {timeZone: "Europe/Rome"}),
    endHourItalian: currentHourItalian.toLocaleString("it-IT", {timeZone: "Europe/Rome"})
  };
};

const last24HoursData = calculateLast24Hours();

console.log('\n=== PERIODO CALCOLATO ===');
console.log('Inizio (UTC+2):', last24HoursData.startDate);
console.log('Fine (UTC+2):', last24HoursData.endDate);
console.log('Inizio (Locale):', last24HoursData.startHourItalian);
console.log('Fine (Locale):', last24HoursData.endHourItalian);

// Prepara le URL di test
const baseURL = 'http://localhost:3000/api/analytics/TEST_LINK'; // Sostituisci con un vero shortCode
const urlAll = `${baseURL}?filterType=all`;
const urlToday = `${baseURL}?filterType=today&startDate=${encodeURIComponent(last24HoursData.startDate)}&endDate=${encodeURIComponent(last24HoursData.endDate)}`;

console.log('\n=== URL DI TEST ===');
console.log('URL "all":', urlAll);
console.log('URL "today":', urlToday);

const testAPI = async () => {
  try {
    console.log('\n=== RISULTATI API ===');
    console.log('⚠️  Nota: Questo test richiede autenticazione');
    console.log('💡 Per testare realmente:');
    console.log('   1. Accedi alla dashboard nel browser');
    console.log('   2. Apri una pagina di analytics di un link');
    console.log('   3. Seleziona il filtro "24 ore"');
    console.log('   4. Confronta i valori delle "Statistiche Generali" con il grafico');
    console.log('   5. Verifica che i totali corrispondano alla somma dei dati orari del grafico');
    
    console.log('\n=== COSA VERIFICARE ===');
    console.log('✅ Le "Statistiche Generali" dovrebbero mostrare:');
    console.log('   - Click Totali: somma di tutti i click nelle ultime 24 ore');
    console.log('   - Click Unici: click unici nelle ultime 24 ore');
    console.log('   - Referrer Unici: referrer unici nelle ultime 24 ore');
    console.log('   - Dispositivi Unici: dispositivi unici nelle ultime 24 ore');
    console.log('   - Browser Unici: browser unici nelle ultime 24 ore');
    console.log('   - Paesi Unici: paesi unici nelle ultime 24 ore');
    
    console.log('\n❌ NON dovrebbero mostrare:');
    console.log('   - Dati di tutto il periodo del link');
    console.log('   - Dati fissi di "oggi" (dalle 00:00 alle 23:59)');
    
  } catch (error) {
    console.error('Errore nel test:', error.message);
  }
};

testAPI();
