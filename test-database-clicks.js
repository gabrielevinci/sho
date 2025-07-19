// Script per testare i dati reali dei click dal database
const testURL = 'http://localhost:3000/api/debug-database';

console.log('Fetching database debug data...');

fetch(testURL)
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('\n=== DATABASE DEBUG DATA ===');
    
    // Trova il link BO3PTj
    const linkBO3PTj = data.links?.find(link => link.short_code === 'BO3PTj');
    if (linkBO3PTj) {
      console.log('\nLink BO3PTj found:');
      console.log('  ID:', linkBO3PTj.id);
      console.log('  Created:', linkBO3PTj.created_at);
      console.log('  Click count:', linkBO3PTj.click_count);
      console.log('  Unique click count:', linkBO3PTj.unique_click_count);
      
      // Trova tutti i click per questo link
      const clicksForLink = data.clicks?.filter(click => click.link_id === linkBO3PTj.id) || [];
      console.log('\nClicks for BO3PTj:');
      console.log('  Total clicks in database:', clicksForLink.length);
      
      // Raggruppa per data
      const clicksByDate = {};
      clicksForLink.forEach(click => {
        const date = click.clicked_at_rome ? click.clicked_at_rome.split('T')[0] : 'unknown';
        if (!clicksByDate[date]) {
          clicksByDate[date] = { total: 0, fingerprints: new Set() };
        }
        clicksByDate[date].total++;
        clicksByDate[date].fingerprints.add(click.user_fingerprint);
      });
      
      console.log('\nClicks by date:');
      Object.entries(clicksByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, stats]) => {
          console.log(`  ${date}: ${stats.total} total, ${stats.fingerprints.size} unique fingerprints`);
        });
      
      // Trova enhanced fingerprints per questo link
      const enhancedForLink = data.enhanced_fingerprints?.filter(ef => ef.link_id === linkBO3PTj.id) || [];
      console.log('\nEnhanced fingerprints for BO3PTj:');
      console.log('  Total enhanced fingerprints:', enhancedForLink.length);
      
      if (enhancedForLink.length > 0) {
        const efByDate = {};
        enhancedForLink.forEach(ef => {
          const date = ef.created_at ? ef.created_at.split('T')[0] : 'unknown';
          if (!efByDate[date]) {
            efByDate[date] = { total: 0, devices: new Set() };
          }
          efByDate[date].total++;
          efByDate[date].devices.add(ef.device_fingerprint);
        });
        
        console.log('\nEnhanced fingerprints by date:');
        Object.entries(efByDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([date, stats]) => {
            console.log(`  ${date}: ${stats.total} total, ${stats.devices.size} unique devices`);
          });
      }
      
      // Confronta con i dati delle correlazioni
      const correlationsForLink = data.fingerprint_correlations?.filter(fc => {
        return enhancedForLink.some(ef => ef.fingerprint_hash === fc.fingerprint_hash);
      }) || [];
      
      console.log('\nFingerprint correlations for BO3PTj:', correlationsForLink.length);
      
    } else {
      console.log('\nLink BO3PTj not found in database');
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
