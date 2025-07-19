// Script per trovare link disponibili
const testURL = 'http://localhost:3000/api/debug-database';

console.log('Finding available links...');

fetch(testURL)
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('\n=== AVAILABLE LINKS ===');
    
    if (data.links && data.links.length > 0) {
      console.log('Found links:');
      data.links.forEach((link, index) => {
        console.log(`  ${index + 1}. ${link.short_code} (ID: ${link.id})`);
        console.log(`     Created: ${link.created_at}`);
        console.log(`     Click count: ${link.click_count}`);
        console.log('');
      });
      
      // Prendi il primo link disponibile e testa le analytics
      const firstLink = data.links[0];
      console.log(`Testing analytics for ${firstLink.short_code}...`);
      
      // Test delle analytics
      const analyticsURL = `http://localhost:3000/api/analytics/${firstLink.short_code}?filterType=all`;
      return fetch(analyticsURL);
    } else {
      console.log('No links found');
      return null;
    }
  })
  .then(response => {
    if (response) {
      return response.json();
    }
    return null;
  })
  .then(analyticsData => {
    if (analyticsData) {
      console.log('\n=== ANALYTICS DATA ===');
      console.log('Link Data:', analyticsData.linkData);
      console.log('\nClick Analytics:', analyticsData.clickAnalytics);
      console.log('\nTime Series Data entries:', analyticsData.timeSeriesData?.length || 0);
      
      if (analyticsData.timeSeriesData && analyticsData.timeSeriesData.length > 0) {
        console.log('\nFirst few time series entries:');
        analyticsData.timeSeriesData.slice(0, 3).forEach((entry, index) => {
          console.log(`  ${entry.date}: ${entry.total_clicks} total, ${entry.unique_clicks} unique`);
        });
        
        console.log('\nLast few time series entries:');
        analyticsData.timeSeriesData.slice(-3).forEach((entry, index) => {
          console.log(`  ${entry.date}: ${entry.total_clicks} total, ${entry.unique_clicks} unique`);
        });
        
        // Verifica coerenza
        const totalInSeries = analyticsData.timeSeriesData.reduce((sum, entry) => sum + entry.total_clicks, 0);
        const uniqueInSeries = analyticsData.timeSeriesData.reduce((sum, entry) => sum + entry.unique_clicks, 0);
        
        console.log('\n=== CONSISTENCY CHECK ===');
        console.log('Sum in time series - Total:', totalInSeries, 'Unique:', uniqueInSeries);
        console.log('Analytics totals - Total:', analyticsData.clickAnalytics?.total_clicks, 'Unique:', analyticsData.clickAnalytics?.unique_clicks);
        
        // Anomalie
        const anomalies = analyticsData.timeSeriesData.filter(entry => 
          entry.unique_clicks > entry.total_clicks
        );
        
        if (anomalies.length > 0) {
          console.log('\n⚠️  ANOMALIES (unique > total):');
          anomalies.forEach(entry => {
            console.log(`  ${entry.date}: unique=${entry.unique_clicks}, total=${entry.total_clicks}`);
          });
        } else {
          console.log('\n✅ No anomalies detected');
        }
      }
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
