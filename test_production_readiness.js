const axios = require('axios');
const fs = require('fs');

class ProductionReadinessTest {
  constructor() {
    this.baseURL = 'http://localhost:3000/api';
    this.results = {
      passed: 0,
      failed: 0,
      details: [],
      timestamp: new Date().toISOString(),
      criticalFailures: []
    };
  }

  async runAllTests() {
    console.log('🚀 PRODUCTION READINESS TEST SUITE');
    console.log('='.repeat(50));
    console.log(`Started: ${this.results.timestamp}`);
    console.log('='.repeat(50));
    
    // Test Categories (in order of importance)
    await this.testBasicQueries();
    await this.testJSONCleanness();
    await this.testSmartInsights();  
    await this.testPortfolioAnalysis();
    await this.testErrorHandling();
    await this.testEdgeCases();
    await this.testPerformance();
    await this.generateReport();
  }

  async testBasicQueries() {
    console.log('\n📊 Testing Basic Queries...\n');
    
    const queries = [
      { 
        query: "AAPL price", 
        expect: ["📊", "**AAPL**"],
        critical: true,
        name: "Basic AAPL Query"
      },
      { 
        query: "MSFT analysis", 
        expect: ["📈", "**MSFT**", "•"],
        critical: true,
        name: "MSFT Analysis"
      },
      { 
        query: "BTC trend", 
        expect: ["**BTC**"],
        critical: false,
        name: "Bitcoin Trend"
      },
      { 
        query: "show me GOOGL", 
        expect: ["**GOOGL**", "📊"],
        critical: false,
        name: "Google Query"
      }
    ];

    for (const test of queries) {
      try {
        const response = await this.makeRequest(test.query);
        const hasExpected = test.expect.every(exp => response.includes(exp));
        const hasJSON = this.hasJSONArtifacts(response);
        
        const passed = hasExpected && !hasJSON;
        
        this.logResult(test.name, {
          passed,
          details: !hasExpected ? `Missing: ${test.expect.join(', ')}` : 
                   hasJSON ? 'Contains JSON artifacts' : 'OK',
          critical: test.critical,
          response: response.substring(0, 100) + '...'
        });
        
      } catch (error) {
        this.logResult(test.name, {
          passed: false,
          details: `API Error: ${error.message}`,
          critical: test.critical
        });
      }
    }
  }

  async testJSONCleanness() {
    console.log('\n🧹 Testing JSON Cleanness (CRITICAL)...\n');
    
    const testQueries = [
      "AAPL price",
      "Tesla stock",
      "Compare AAPL and MSFT", 
      "Bitcoin analysis",
      "Show me portfolio"
    ];

    for (const query of testQueries) {
      try {
        const response = await this.makeRequest(query);
        const hasJSON = this.hasJSONArtifacts(response);
        
        this.logResult(`JSON Clean: ${query}`, {
          passed: !hasJSON,
          details: hasJSON ? 'FOUND JSON ARTIFACTS!' : 'Clean',
          critical: true,
          response: response.substring(0, 150) + '...'
        });
        
      } catch (error) {
        this.logResult(`JSON Clean: ${query}`, {
          passed: false,
          details: `Error: ${error.message}`,
          critical: true
        });
      }
    }
  }

  async testSmartInsights() {
    console.log('\n🧠 Testing Smart Insights (CRITICAL)...\n');
    
    const sessionId = 'smart-test-' + Date.now();
    let smartInsightTriggered = false;
    
    // Query AAPL 3 times in same session
    for (let i = 1; i <= 3; i++) {
      try {
        const response = await this.makeRequest("AAPL price", sessionId);
        console.log(`Query ${i}: ${response.substring(0, 80)}...`);
        
        if (i === 3) {
          // Check for smart insight patterns
          const patterns = [
            /You've checked.*3 times/i,
            /checked.*multiple times/i,
            /tracking.*AAPL/i,
            /following.*closely/i
          ];
          
          smartInsightTriggered = patterns.some(pattern => pattern.test(response));
          
          this.logResult("Smart Insight on 3rd query", {
            passed: smartInsightTriggered,
            details: smartInsightTriggered ? "✅ Triggered correctly" : "❌ Failed to trigger",
            critical: true,
            response: response.substring(0, 200) + '...'
          });
        }
        
        // Small delay between queries
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        this.logResult(`Smart Insight Query ${i}`, {
          passed: false,
          details: `Error: ${error.message}`,
          critical: true
        });
      }
    }
  }

  async testPortfolioAnalysis() {
    console.log('\n💼 Testing Portfolio Analysis...\n');
    
    try {
      const response = await this.makeRequest("analyze my portfolio");
      
      const checks = {
        "Has emoji": /[💰📊💼🟢🟡🔴]/.test(response),
        "Bold symbols": /\*\*[A-Z]{1,5}\*\*/.test(response),
        "Professional language": !/(want me to|interested in|would you like)/i.test(response),
        "No JSON artifacts": !this.hasJSONArtifacts(response)
      };
      
      for (const [check, result] of Object.entries(checks)) {
        this.logResult(`Portfolio: ${check}`, { 
          passed: result,
          details: result ? 'OK' : 'Failed',
          critical: check === "No JSON artifacts"
        });
      }
      
    } catch (error) {
      this.logResult("Portfolio Analysis", {
        passed: false,
        details: `Error: ${error.message}`,
        critical: false
      });
    }
  }

  async testErrorHandling() {
    console.log('\n⚠️ Testing Error Handling...\n');
    
    const errorCases = [
      { query: "", name: "Empty query", expectError: false },
      { query: "INVALID_SYMBOL_XYZ price", name: "Invalid symbol", expectError: false },
      { query: "a".repeat(500), name: "Very long query", expectError: false },
      { query: "🚀🚀🚀", name: "Only emojis", expectError: false },
      { query: "<script>alert('xss')</script>", name: "XSS attempt", expectError: false }
    ];
    
    for (const test of errorCases) {
      try {
        const response = await this.makeRequest(test.query);
        const isClean = !this.hasJSONArtifacts(response);
        const isGraceful = !response.toLowerCase().includes("error") || response.includes("help");
        
        this.logResult(test.name, { 
          passed: isClean && isGraceful,
          details: !isClean ? "Has JSON" : !isGraceful ? "Poor error handling" : "OK",
          critical: false,
          response: response.substring(0, 100) + "..."
        });
        
      } catch (e) {
        // API throwing errors is acceptable for some cases
        this.logResult(test.name, { 
          passed: test.expectError,
          details: `API Exception: ${e.message}`,
          critical: false
        });
      }
    }
  }

  async testEdgeCases() {
    console.log('\n🔍 Testing Edge Cases...\n');
    
    const edgeCases = [
      { query: "aapl", name: "Lowercase symbol" },
      { query: "APPL price", name: "Typo in symbol" },
      { query: "show AAPL and MSFT and GOOGL", name: "Multiple symbols" },
      { query: "Tesla stock price today", name: "Natural language" },
      { query: "btc", name: "Crypto abbreviation" }
    ];
    
    for (const test of edgeCases) {
      try {
        const response = await this.makeRequest(test.query);
        const isFormatted = /[📊📈💰]/.test(response) && !this.hasJSONArtifacts(response);
        
        this.logResult(test.name, { 
          passed: isFormatted,
          details: isFormatted ? 'Properly formatted' : 'Poor formatting',
          critical: false
        });
        
      } catch (error) {
        this.logResult(test.name, {
          passed: false,
          details: `Error: ${error.message}`,
          critical: false
        });
      }
    }
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance...\n');
    
    const times = [];
    const testQuery = "AAPL price";
    
    for (let i = 0; i < 5; i++) {
      try {
        const start = Date.now();
        await this.makeRequest(testQuery);
        const time = Date.now() - start;
        times.push(time);
        console.log(`Request ${i + 1}: ${time}ms`);
      } catch (error) {
        console.log(`Request ${i + 1}: ERROR - ${error.message}`);
        times.push(10000); // Penalty for errors
      }
    }
    
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    const maxTime = Math.max(...times);
    
    this.logResult("Average response time", { 
      passed: avgTime < 5000,
      details: `${avgTime.toFixed(0)}ms (target: <5000ms)`,
      critical: false
    });
    
    this.logResult("Max response time", { 
      passed: maxTime < 10000,
      details: `${maxTime}ms (target: <10000ms)`,
      critical: false
    });
  }

  async makeRequest(query, sessionId = null) {
    const response = await axios.post(this.baseURL + '/chat', {
      message: query,
      sessionId: sessionId || 'test-' + Date.now()
    }, {
      timeout: 15000
    });
    return response.data.response;
  }

  hasJSONArtifacts(response) {
    const jsonPatterns = [
      /"response"\s*:/,
      /\\n/,
      /\\"/,
      /\\\\/,
      /^\s*\{.*\}\s*$/
    ];
    
    return jsonPatterns.some(pattern => pattern.test(response));
  }

  logResult(testName, result) {
    if (result.passed) {
      this.results.passed++;
      console.log(`✅ ${testName}`);
    } else {
      this.results.failed++;
      console.log(`❌ ${testName}`);
      
      if (result.critical) {
        this.results.criticalFailures.push({
          test: testName,
          details: result.details
        });
      }
    }
    
    if (result.details) {
      console.log(`   ${result.details}`);
    }
    
    this.results.details.push({ testName, ...result });
  }

  async generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 PRODUCTION READINESS REPORT');
    console.log('='.repeat(50));
    
    const total = this.results.passed + this.results.failed;
    const successRate = total > 0 ? (this.results.passed / total * 100) : 0;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ❌`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`Critical Failures: ${this.results.criticalFailures.length}`);
    
    // Save detailed report
    fs.writeFileSync('production_readiness_report.json', JSON.stringify(this.results, null, 2));
    
    // Production ready criteria
    const isReady = this.results.criticalFailures.length === 0 && successRate >= 95;
    
    console.log('\n' + '='.repeat(50));
    console.log(isReady ? '✅ PRODUCTION READY!' : '❌ NOT PRODUCTION READY');
    console.log('='.repeat(50));
    
    if (!isReady) {
      console.log('\n🚨 CRITICAL ISSUES TO FIX:');
      this.results.criticalFailures.forEach((failure, i) => {
        console.log(`${i + 1}. ${failure.test}: ${failure.details}`);
      });
      
      console.log('\n📋 ALL FAILURES:');
      this.results.details
        .filter(r => !r.passed)
        .forEach((r, i) => console.log(`${i + 1}. ${r.testName}: ${r.details || 'Failed'}`));
    }
    
    console.log(`\n📄 Full report saved to: production_readiness_report.json`);
    
    return isReady;
  }
}

// Run tests
if (require.main === module) {
  new ProductionReadinessTest().runAllTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = ProductionReadinessTest;