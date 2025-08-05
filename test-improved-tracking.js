/**
 * Script per testare il sistema di tracking migliorato via CLI
 * Usage: node test-improved-tracking.js
 */

const API_BASE = 'http://localhost:3000/api/debug/improved-tracking';

class TrackingTester {
  constructor() {
    this.results = [];
  }

  async runTests() {
    console.log('🚀 Avvio test del sistema di tracking migliorato...\n');

    try {
      // Test 1: Estrazione IP
      await this.testIPExtraction();

      // Test 2: Tracking completo
      await this.testFullTracking();

      // Test 3: Statistiche cache
      await this.testCacheStats();

      // Test 4: Confronto con legacy
      await this.testComparison();

      // Test 5: Performance test
      await this.testPerformance();

      // Riepilogo
      this.printSummary();

    } catch (error) {
      console.error('❌ Errore durante i test:', error);
    }
  }

  async testIPExtraction() {
    console.log('📍 Test 1: Estrazione IP...');
    try {
      const response = await fetch(`${API_BASE}?action=ip-test`);
      const data = await response.json();
      
      if (data.success) {
        console.log('  ✅ IP estratto:', data.selected.ip);
        console.log('  📊 Confidence:', data.selected.confidence);
        console.log('  🔍 Source:', data.selected.source);
        console.log('  🎯 Quality:', data.analysis.quality);
        this.results.push({ test: 'IP Extraction', status: 'PASS', details: data.analysis });
      } else {
        console.log('  ❌ Fallito:', data.error);
        this.results.push({ test: 'IP Extraction', status: 'FAIL', error: data.error });
      }
    } catch (error) {
      console.log('  ❌ Errore di rete:', error.message);
      this.results.push({ test: 'IP Extraction', status: 'ERROR', error: error.message });
    }
    console.log('');
  }

  async testFullTracking() {
    console.log('🌍 Test 2: Tracking geografico completo...');
    try {
      const response = await fetch(`${API_BASE}?action=test`);
      const data = await response.json();
      
      if (data.success) {
        console.log('  ✅ Paese:', data.data.country);
        console.log('  🏛️ Regione:', data.data.region);
        console.log('  🏘️ Città:', data.data.city);
        console.log('  📈 Confidence:', data.data.confidence);
        console.log('  📦 Sources:', data.data.sources.join(', '));
        console.log('  ⚡ Performance:', data.performance.duration_ms + 'ms');
        
        if (data.data.warnings.length > 0) {
          console.log('  ⚠️ Warnings:', data.data.warnings.join(', '));
        }
        
        this.results.push({ 
          test: 'Full Tracking', 
          status: 'PASS', 
          details: data.quality 
        });
      } else {
        console.log('  ❌ Fallito:', data.error);
        this.results.push({ test: 'Full Tracking', status: 'FAIL', error: data.error });
      }
    } catch (error) {
      console.log('  ❌ Errore di rete:', error.message);
      this.results.push({ test: 'Full Tracking', status: 'ERROR', error: error.message });
    }
    console.log('');
  }

  async testCacheStats() {
    console.log('💾 Test 3: Statistiche cache...');
    try {
      const response = await fetch(`${API_BASE}?action=cache-stats`);
      const data = await response.json();
      
      if (data.success) {
        console.log('  📊 Dimensione cache:', data.cache.size);
        console.log('  🎯 Hit rate:', data.cache.hitRate + '%');
        console.log('  📈 Efficiency:', data.cache.efficiency);
        console.log('  📄 Total requests:', data.cache.totalRequests);
        
        this.results.push({ 
          test: 'Cache Stats', 
          status: 'PASS', 
          details: data.cache 
        });
      } else {
        console.log('  ❌ Fallito:', data.error);
        this.results.push({ test: 'Cache Stats', status: 'FAIL', error: data.error });
      }
    } catch (error) {
      console.log('  ❌ Errore di rete:', error.message);
      this.results.push({ test: 'Cache Stats', status: 'ERROR', error: error.message });
    }
    console.log('');
  }

  async testComparison() {
    console.log('🔄 Test 4: Confronto con sistema legacy...');
    try {
      const response = await fetch(`${API_BASE}?action=compare`);
      const data = await response.json();
      
      if (data.success) {
        console.log('  📊 Sistema migliorato:');
        console.log('    🌍 Geo:', 
          data.comparison.improved.country, 
          data.comparison.improved.region, 
          data.comparison.improved.city
        );
        console.log('    📈 Confidence:', data.comparison.improved.confidence);
        console.log('    ⚡ Performance:', data.comparison.improved.duration_ms + 'ms');
        
        console.log('  📊 Sistema legacy:');
        console.log('    🌍 Geo:', 
          data.comparison.legacy.country, 
          data.comparison.legacy.region, 
          data.comparison.legacy.city
        );
        console.log('    ⚡ Performance:', data.comparison.legacy.duration_ms + 'ms');
        
        console.log('  🔍 Analisi:');
        console.log('    📈 Dati migliorati:', data.comparison.analysis.data_improved ? 'SÌ' : 'NO');
        console.log('    🔄 Stessi risultati:', data.comparison.analysis.same_results ? 'SÌ' : 'NO');
        console.log('    📊 Boost confidence:', data.comparison.analysis.confidence_boost);
        
        this.results.push({ 
          test: 'Legacy Comparison', 
          status: 'PASS', 
          details: data.comparison.analysis 
        });
      } else {
        console.log('  ❌ Fallito:', data.error);
        this.results.push({ test: 'Legacy Comparison', status: 'FAIL', error: data.error });
      }
    } catch (error) {
      console.log('  ❌ Errore di rete:', error.message);
      this.results.push({ test: 'Legacy Comparison', status: 'ERROR', error: error.message });
    }
    console.log('');
  }

  async testPerformance() {
    console.log('⚡ Test 5: Performance test (10 chiamate)...');
    const times = [];
    
    try {
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        const response = await fetch(`${API_BASE}?action=test`);
        const data = await response.json();
        const end = Date.now();
        
        if (data.success) {
          times.push(end - start);
        }
        
        process.stdout.write(`  Chiamata ${i + 1}/10... ${end - start}ms\n`);
      }
      
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        
        console.log('  📊 Statistiche performance:');
        console.log(`    ⚡ Media: ${avg.toFixed(1)}ms`);
        console.log(`    🏃 Min: ${min}ms`);
        console.log(`    🐌 Max: ${max}ms`);
        
        this.results.push({ 
          test: 'Performance', 
          status: 'PASS', 
          details: { avg, min, max, samples: times.length }
        });
      }
    } catch (error) {
      console.log('  ❌ Errore durante performance test:', error.message);
      this.results.push({ test: 'Performance', status: 'ERROR', error: error.message });
    }
    console.log('');
  }

  printSummary() {
    console.log('📋 RIEPILOGO TEST:');
    console.log('=' . repeat(50));
    
    let passed = 0;
    let failed = 0;
    let errors = 0;
    
    this.results.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : 
                    result.status === 'FAIL' ? '❌' : '🔥';
      console.log(`${status} ${result.test}: ${result.status}`);
      
      if (result.status === 'PASS') passed++;
      else if (result.status === 'FAIL') failed++;
      else errors++;
    });
    
    console.log('=' . repeat(50));
    console.log(`📊 Risultati: ${passed} PASS, ${failed} FAIL, ${errors} ERROR`);
    
    if (passed === this.results.length) {
      console.log('🎉 Tutti i test sono passati! Il sistema è pronto per l\'uso.');
    } else {
      console.log('⚠️ Alcuni test sono falliti. Controlla i dettagli sopra.');
    }
  }
}

// Helper per String.repeat se non disponibile
if (!String.prototype.repeat) {
  String.prototype.repeat = function(count) {
    return new Array(count + 1).join(this);
  };
}

// Avvia i test
const tester = new TrackingTester();
tester.runTests();
