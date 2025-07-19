const testURL = 'http://localhost:3000/api/analytics/BO3PTj?filterType=all';

console.log('Testing analytics API for "all" filter...');
console.log('URL:', testURL);

fetch(testURL)
  .then(response => {
    console.log('Response status:', response.status);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('\n=== ANALYTICS DATA FOR "ALL" FILTER ===');
    console.log('Link Data:', data.linkData);
    console.log('\nClick Analytics:', data.clickAnalytics);
    console.log('\nTime Series Data:');
    console.log('Total entries:', data.timeSeriesData?.length || 0);
    if (data.timeSeriesData && data.timeSeriesData.length > 0) {
      console.log('First 5 entries:');
      data.timeSeriesData.slice(0, 5).forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.date}: ${entry.total_clicks} total, ${entry.unique_clicks} unique`);
      });
      console.log('Last 5 entries:');
      data.timeSeriesData.slice(-5).forEach((entry, index) => {
        console.log(`  ${data.timeSeriesData.length - 4 + index}. ${entry.date}: ${entry.total_clicks} total, ${entry.unique_clicks} unique`);
      });
      
      // Verifica coerenza dei dati
      const totalClicksSum = data.timeSeriesData.reduce((sum, entry) => sum + entry.total_clicks, 0);
      const uniqueClicksSum = data.timeSeriesData.reduce((sum, entry) => sum + entry.unique_clicks, 0);
      
      console.log('\n=== DATA VALIDATION ===');
      console.log('Sum of total_clicks in time series:', totalClicksSum);
      console.log('Total clicks from analytics:', data.clickAnalytics?.total_clicks);
      console.log('Sum of unique_clicks in time series:', uniqueClicksSum);
      console.log('Unique clicks from analytics:', data.clickAnalytics?.unique_clicks);
      
      // Controlla se ci sono anomalie nei dati
      const anomalies = data.timeSeriesData.filter(entry => 
        entry.unique_clicks > entry.total_clicks
      );
      
      if (anomalies.length > 0) {
        console.log('\n⚠️  ANOMALIES DETECTED:');
        anomalies.forEach(entry => {
          console.log(`  ${entry.date}: unique_clicks (${entry.unique_clicks}) > total_clicks (${entry.total_clicks})`);
        });
      } else {
        console.log('\n✅ No anomalies detected (unique_clicks <= total_clicks for all entries)');
      }
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
