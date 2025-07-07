// Utility per aggiungere dati di test al grafico
// NOTA: Questo file è solo per test e sviluppo

type MonthlyData = {
  month: string;
  month_number: number;
  year: number;
  total_clicks: number;
  unique_clicks: number;
};

type WeeklyData = {
  week: number;
  year: number;
  week_start: string;
  week_end: string;
  total_clicks: number;
  unique_clicks: number;
};

export function addTestDataToMonthly(monthlyData: MonthlyData[]): MonthlyData[] {
  // Aggiungiamo alcuni dati di test per visualizzare il grafico
  if (monthlyData.every(item => item.total_clicks === 0)) {
    const testMonths = [1, 3, 5, 7]; // Gennaio, Marzo, Maggio, Luglio
    
    return monthlyData.map(item => {
      if (testMonths.includes(item.month_number)) {
        return {
          ...item,
          total_clicks: Math.floor(Math.random() * 100) + 20,
          unique_clicks: Math.floor(Math.random() * 50) + 10
        };
      }
      return item;
    });
  }
  return monthlyData;
}

export function addTestDataToWeekly(weeklyData: WeeklyData[]): WeeklyData[] {
  // Aggiungiamo alcuni dati di test per visualizzare il grafico
  if (weeklyData.every(item => item.total_clicks === 0)) {
    // Calcola la settimana corrente del 2025 (dal 30-12-2024)
    const currentDate = new Date();
    const year2025Week1Start = new Date('2024-12-30'); // Inizio settimana 1 del 2025
    const daysSinceWeek1 = Math.floor((currentDate.getTime() - year2025Week1Start.getTime()) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.min(52, Math.max(1, Math.floor(daysSinceWeek1 / 7) + 1));
    
    // Aggiungi dati di test per alcune settimane recenti
    const testWeeks = [
      Math.max(1, currentWeek - 4), 
      Math.max(1, currentWeek - 2), 
      currentWeek,
      1, // Prima settimana dell'anno per test
      27 // Settimana di luglio per test
    ];
    
    return weeklyData.map(item => {
      if (testWeeks.includes(item.week)) {
        return {
          ...item,
          total_clicks: Math.floor(Math.random() * 30) + 5,
          unique_clicks: Math.floor(Math.random() * 15) + 2
        };
      }
      return item;
    });
  }
  return weeklyData;
}
