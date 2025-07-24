/**
 * Enhanced Verification Test Framework
 * Comprehensive testing with edge cases, performance tracking, and intelligent reporting
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { FormatMonitor } = require('./monitoring/FormatMonitor');

class EnhancedTestFramework {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
    this.sessionId = 'enhanced-test-' + Date.now();
    
    // Test categories
    this.testSuites = {
      basic: this.getBasicTests(),
      edgeCases: this.getEdgeCaseTests(),
      portfolio: this.getPortfolioTests(),
      errorScenarios: this.getErrorTests(),
      performance: this.getPerformanceTests(),
      consistency: this.getConsistencyTests(),
      smartInsights: this.getSmartInsightsTests()
    };
  }
  
  /**
   * Basic functionality tests
   */
  getBasicTests() {
    return [
      { query: "AAPL price", expect: ["emoji", "bold", "action"], category: "price" },
      { query: "Show me MSFT", expect: ["emoji", "bold", "action"], category: "price" },
      { query: "compare AAPL to GOOGL", expect: ["emoji", "bold", "comparison"], category: "comparison" },
      { query: "Bitcoin analysis", expect: ["emoji", "bold", "crypto"], category: "crypto" },
      { query: "market overview", expect: ["emoji", "structure"], category: "market" },
      { query: "TSLA trend analysis", expect: ["emoji", "bold", "trend"], category: "trend" }
    ];
  }
  
  /**
   * Edge case tests
   */
  getEdgeCaseTests() {
    return [
      { query: "AAPL", expect: ["emoji", "bold"], category: "single_word" },
      { query: "????", expect: ["emoji", "fallback"], category: "invalid" },
      { query: "Tell me about " + "A".repeat(500), expect: ["truncation"], category: "long_query" },
      { query: "比特币价格", expect: ["emoji", "international"], category: "multilingual" },
      { query: "AAPL MSFT GOOGL AMZN TSLA NVDA META", expect: ["multiple_symbols"], category: "many_symbols" },
      { query: "", expect: ["error_handling"], category: "empty" },
      { query: "What is the price of the stock that shall not be named", expect: ["fallback"], category: "vague" },
      { query: "Show me FAKESYMBOL", expect: ["error_handling"], category: "invalid_symbol" }
    ];
  }
  
  /**
   * Portfolio-specific tests
   */
  getPortfolioTests() {
    return [
      { 
        query: "analyze my portfolio", 
        expect: ["emoji", "bold", "portfolio_structure"], 
        category: "portfolio_empty",
        setup: async () => {
          // Test with no portfolio
        }
      },
      { 
        query: "analyze my portfolio", 
        expect: ["emoji", "bold", "risk_indicators"], 
        category: "portfolio_small",
        setup: async () => {
          // Upload small portfolio
          const formData = new FormData();
          const csvContent = "symbol,shares,purchase_price\nAAPL,10,150\nMSFT,5,300";
          formData.append('file', new Blob([csvContent], { type: 'text/csv' }), 'small_portfolio.csv');
          formData.append('sessionId', this.sessionId);
          
          try {
            await axios.post('http://localhost:3000/api/portfolio/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          } catch (error) {
            console.log('Portfolio upload setup failed:', error.message);
          }
        }
      },
      { 
        query: "analyze my portfolio", 
        expect: ["emoji", "bold", "diversification"], 
        category: "portfolio_large",
        setup: async () => {
          // Test with 20+ holdings
          const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'BRK.B', 
                          'JPM', 'JNJ', 'V', 'PG', 'UNH', 'MA', 'HD', 'DIS', 'PYPL', 'ADBE', 
                          'NFLX', 'PFE', 'KO', 'PEP'];
          let csv = "symbol,shares,purchase_price\n";
          symbols.forEach(symbol => {
            csv += `${symbol},${Math.floor(Math.random() * 100) + 10},${Math.floor(Math.random() * 300) + 50}\n`;
          });
          
          const formData = new FormData();
          formData.append('file', new Blob([csv], { type: 'text/csv' }), 'large_portfolio.csv');
          formData.append('sessionId', this.sessionId);
          
          try {
            await axios.post('http://localhost:3000/api/portfolio/upload', formData);
          } catch (error) {
            console.log('Large portfolio upload failed:', error.message);
          }
        }
      }
    ];
  }
  
  /**
   * Error scenario tests
   */
  getErrorTests() {
    return [
      { 
        query: "NETWORK_ERROR_TEST", 
        expect: ["graceful_error"], 
        category: "network_error",
        simulateError: true 
      },
      { 
        query: "analyze my corrupted portfolio", 
        expect: ["error_message"], 
        category: "invalid_data" 
      }
    ];
  }
  
  /**
   * Performance tests
   */
  getPerformanceTests() {
    return [
      { 
        query: "AAPL price", 
        expect: ["under_3s"], 
        category: "speed_simple",
        maxTime: 3000 
      },
      { 
        query: "compare AAPL MSFT GOOGL AMZN TSLA", 
        expect: ["under_5s"], 
        category: "speed_complex",
        maxTime: 5000 
      }
    ];
  }
  
  /**
   * Consistency tests - same query multiple times
   */
  getConsistencyTests() {
    const queries = [];
    for (let i = 0; i < 10; i++) {
      queries.push({
        query: "MSFT analysis",
        expect: ["consistent_format"],
        category: "consistency",
        iteration: i + 1
      });
    }
    return queries;
  }
  
  /**
   * Smart Insights specific tests
   */
  getSmartInsightsTests() {
    return [
      {
        query: "NVDA price",
        expect: ["no_insight_first"],
        category: "insight_first"
      },
      {
        query: "NVDA price",
        expect: ["time_insight"],
        category: "insight_second",
        delay: 2000
      },
      {
        query: "NVDA price",
        expect: ["pattern_insight"],
        category: "insight_third"
      },
      {
        query: "Tell me about NVDA P/E ratio",
        expect: ["expert_content"],
        category: "insight_expert"
      }
    ];
  }
  
  /**
   * Run a single test
   */
  async runTest(test, suiteType) {
    console.log(`\n[${suiteType}] Testing: "${test.query}"`);
    
    // Run setup if needed
    if (test.setup) {
      await test.setup();
    }
    
    // Add delay if specified
    if (test.delay) {
      await new Promise(r => setTimeout(r, test.delay));
    }
    
    const startTime = Date.now();
    
    try {
      // Handle error simulation
      if (test.simulateError) {
        throw new Error("Simulated network error");
      }
      
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: test.query,
        sessionId: this.sessionId
      });
      
      const responseTime = Date.now() - startTime;
      const text = response.data.response;
      
      // Format analysis
      const formatScore = FormatMonitor.calculateFormatScore(text);
      const analysis = this.analyzeResponse(text, test.expect);
      
      // Store result
      const result = {
        suite: suiteType,
        category: test.category,
        query: test.query,
        response: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        formatScore,
        responseTime,
        passed: analysis.passed,
        failureReasons: analysis.failures,
        expectations: test.expect,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(result);
      
      // Quick feedback
      console.log(`  Score: ${formatScore}/100 | Time: ${responseTime}ms | ${analysis.passed ? '✅ PASS' : '❌ FAIL'}`);
      if (!analysis.passed) {
        console.log(`  Failures: ${analysis.failures.join(', ')}`);
      }
      
      return result;
      
    } catch (error) {
      const result = {
        suite: suiteType,
        category: test.category,
        query: test.query,
        error: error.message,
        passed: test.expect.includes('error_handling') || test.expect.includes('graceful_error'),
        responseTime: Date.now() - startTime
      };
      
      this.results.push(result);
      console.log(`  Error: ${error.message} | ${result.passed ? '✅ Expected' : '❌ Unexpected'}`);
      
      return result;
    }
  }
  
  /**
   * Analyze response against expectations
   */
  analyzeResponse(text, expectations) {
    const failures = [];
    let passed = true;
    
    expectations.forEach(expect => {
      switch(expect) {
        case 'emoji':
          if (!/[📊📈📉💰🎯⚠️🔍🔥⚔️]/.test(text)) {
            failures.push('missing_emoji');
            passed = false;
          }
          break;
          
        case 'bold':
          if (!/\*\*[A-Z]{1,5}\*\*/.test(text)) {
            failures.push('missing_bold');
            passed = false;
          }
          break;
          
        case 'action':
          if (!/want me to/i.test(text)) {
            failures.push('missing_action');
            passed = false;
          }
          break;
          
        case 'portfolio_structure':
          if (!text.includes('Portfolio') && !text.includes('portfolio')) {
            failures.push('missing_portfolio_structure');
            passed = false;
          }
          break;
          
        case 'risk_indicators':
          if (!text.includes('🟢') && !text.includes('🟡') && !text.includes('🔴')) {
            failures.push('missing_risk_indicators');
            passed = false;
          }
          break;
          
        case 'time_insight':
          if (!text.includes('ago') && !text.includes('since') && !text.includes('checked')) {
            failures.push('missing_time_insight');
            passed = false;
          }
          break;
          
        case 'pattern_insight':
          if (!text.includes('times') && !text.includes('alert')) {
            failures.push('missing_pattern_insight');
            passed = false;
          }
          break;
          
        case 'under_3s':
        case 'under_5s':
          const maxTime = expect === 'under_3s' ? 3000 : 5000;
          if (this.responseTime > maxTime) {
            failures.push(`slow_response_${this.responseTime}ms`);
            passed = false;
          }
          break;
      }
    });
    
    return { passed, failures };
  }
  
  /**
   * Run all test suites
   */
  async runAllTests() {
    console.log('🧪 ENHANCED VERIFICATION FRAMEWORK');
    console.log('=' .repeat(80));
    console.log('Starting comprehensive test suite...\n');
    
    // Run each test suite
    for (const [suiteName, tests] of Object.entries(this.testSuites)) {
      console.log(`\n📋 ${suiteName.toUpperCase()} TEST SUITE`);
      console.log('-'.repeat(60));
      
      for (const test of tests) {
        await this.runTest(test, suiteName);
        await new Promise(r => setTimeout(r, 500)); // Delay between tests
      }
    }
    
    // Generate comprehensive report
    this.generateReport();
    
    return this.results;
  }
  
  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const avgFormatScore = this.results.reduce((sum, r) => sum + (r.formatScore || 0), 0) / totalTests;
    const avgResponseTime = this.results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / totalTests;
    
    // Group results by suite
    const suiteResults = {};
    this.results.forEach(result => {
      if (!suiteResults[result.suite]) {
        suiteResults[result.suite] = {
          total: 0,
          passed: 0,
          failed: 0,
          avgScore: 0,
          avgTime: 0,
          failures: []
        };
      }
      
      const suite = suiteResults[result.suite];
      suite.total++;
      if (result.passed) suite.passed++;
      else {
        suite.failed++;
        suite.failures.push({
          query: result.query,
          reasons: result.failureReasons
        });
      }
      suite.avgScore += result.formatScore || 0;
      suite.avgTime += result.responseTime || 0;
    });
    
    // Calculate suite averages
    Object.values(suiteResults).forEach(suite => {
      suite.avgScore = (suite.avgScore / suite.total).toFixed(1);
      suite.avgTime = (suite.avgTime / suite.total).toFixed(0);
    });
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(suiteResults, {
      totalTests,
      passedTests,
      failedTests,
      avgFormatScore,
      avgResponseTime,
      duration: Date.now() - this.startTime
    });
    
    // Save reports
    fs.writeFileSync('enhanced_test_results.json', JSON.stringify({
      summary: {
        totalTests,
        passedTests,
        failedTests,
        passRate: ((passedTests / totalTests) * 100).toFixed(1) + '%',
        avgFormatScore: avgFormatScore.toFixed(1),
        avgResponseTime: avgResponseTime.toFixed(0) + 'ms'
      },
      suiteResults,
      details: this.results
    }, null, 2));
    
    fs.writeFileSync('enhanced_test_report.html', htmlReport);
    
    // Console summary
    console.log('\n' + '=' .repeat(80));
    console.log('📊 ENHANCED TEST SUMMARY');
    console.log('=' .repeat(80));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Average Format Score: ${avgFormatScore.toFixed(1)}/100`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`Total Duration: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s`);
    
    console.log('\n📋 Suite Breakdown:');
    Object.entries(suiteResults).forEach(([suite, results]) => {
      console.log(`\n${suite}:`);
      console.log(`  Pass Rate: ${results.passed}/${results.total} (${((results.passed/results.total)*100).toFixed(1)}%)`);
      console.log(`  Avg Score: ${results.avgScore}/100`);
      console.log(`  Avg Time: ${results.avgTime}ms`);
      if (results.failures.length > 0) {
        console.log(`  Failures: ${results.failures.length}`);
      }
    });
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    this.generateRecommendations(suiteResults);
    
    console.log('\n📁 Reports saved:');
    console.log('  - enhanced_test_results.json');
    console.log('  - enhanced_test_report.html');
  }
  
  /**
   * Generate HTML report
   */
  generateHTMLReport(suiteResults, summary) {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>FinanceBot Enhanced Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .metric h3 { margin: 0 0 10px 0; color: #7f8c8d; font-size: 14px; text-transform: uppercase; }
    .metric .value { font-size: 36px; font-weight: bold; color: #2c3e50; }
    .metric.good .value { color: #27ae60; }
    .metric.warning .value { color: #f39c12; }
    .metric.bad .value { color: #e74c3c; }
    .suite { margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
    .suite h3 { margin: 0 0 15px 0; color: #2c3e50; }
    .progress { height: 20px; background: #ecf0f1; border-radius: 10px; overflow: hidden; margin: 10px 0; }
    .progress-bar { height: 100%; background: #3498db; transition: width 0.3s; }
    .failures { margin-top: 10px; padding: 10px; background: #fee; border-radius: 5px; }
    .failure { margin: 5px 0; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #34495e; color: white; }
    tr:hover { background: #f5f5f5; }
    .recommendation { padding: 15px; margin: 10px 0; background: #e8f4f8; border-left: 4px solid #3498db; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 FinanceBot Enhanced Test Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    
    <div class="summary">
      <div class="metric ${summary.passedTests/summary.totalTests >= 0.9 ? 'good' : summary.passedTests/summary.totalTests >= 0.7 ? 'warning' : 'bad'}">
        <h3>Pass Rate</h3>
        <div class="value">${((summary.passedTests/summary.totalTests)*100).toFixed(1)}%</div>
      </div>
      <div class="metric ${summary.avgFormatScore >= 90 ? 'good' : summary.avgFormatScore >= 70 ? 'warning' : 'bad'}">
        <h3>Avg Format Score</h3>
        <div class="value">${summary.avgFormatScore.toFixed(1)}</div>
      </div>
      <div class="metric ${summary.avgResponseTime <= 3000 ? 'good' : summary.avgResponseTime <= 5000 ? 'warning' : 'bad'}">
        <h3>Avg Response Time</h3>
        <div class="value">${(summary.avgResponseTime/1000).toFixed(1)}s</div>
      </div>
      <div class="metric">
        <h3>Total Tests</h3>
        <div class="value">${summary.totalTests}</div>
      </div>
    </div>
    
    <h2>Test Suite Results</h2>
    ${Object.entries(suiteResults).map(([suite, results]) => `
      <div class="suite">
        <h3>${suite.charAt(0).toUpperCase() + suite.slice(1)} Suite</h3>
        <div class="progress">
          <div class="progress-bar" style="width: ${(results.passed/results.total)*100}%"></div>
        </div>
        <p>Passed: ${results.passed}/${results.total} | Avg Score: ${results.avgScore} | Avg Time: ${results.avgTime}ms</p>
        ${results.failures.length > 0 ? `
          <div class="failures">
            <strong>Failures:</strong>
            ${results.failures.map(f => `
              <div class="failure">• "${f.query}" - ${f.reasons ? f.reasons.join(', ') : 'Unknown'}</div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('')}
    
    <h2>Detailed Results</h2>
    <table>
      <thead>
        <tr>
          <th>Suite</th>
          <th>Query</th>
          <th>Score</th>
          <th>Time</th>
          <th>Status</th>
          <th>Issues</th>
        </tr>
      </thead>
      <tbody>
        ${this.results.slice(0, 50).map(r => `
          <tr>
            <td>${r.suite}</td>
            <td>${r.query}</td>
            <td>${r.formatScore || 'N/A'}</td>
            <td>${r.responseTime}ms</td>
            <td>${r.passed ? '✅' : '❌'}</td>
            <td>${r.failureReasons ? r.failureReasons.join(', ') : r.error || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${this.results.length > 50 ? '<p><em>Showing first 50 results. See JSON file for complete data.</em></p>' : ''}
  </div>
</body>
</html>
    `;
  }
  
  /**
   * Generate smart recommendations
   */
  generateRecommendations(suiteResults) {
    const recommendations = [];
    
    // Check portfolio formatting
    if (suiteResults.portfolio && suiteResults.portfolio.avgScore < 90) {
      recommendations.push('Portfolio responses need better formatting - ensure all symbols are bold');
    }
    
    // Check consistency
    if (suiteResults.consistency && suiteResults.consistency.avgScore < 95) {
      recommendations.push('Response consistency varies - consider caching format templates');
    }
    
    // Check performance
    if (suiteResults.performance && parseInt(suiteResults.performance.avgTime) > 3000) {
      recommendations.push('Response times are high - optimize data fetching and caching');
    }
    
    // Check edge cases
    if (suiteResults.edgeCases && suiteResults.edgeCases.failed > 2) {
      recommendations.push('Edge case handling needs improvement - add more fallback formatting');
    }
    
    // Check smart insights
    if (suiteResults.smartInsights && suiteResults.smartInsights.failed > 0) {
      recommendations.push('Smart Insights not triggering consistently - check context tracking');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System performing excellently! Consider adding more complex test scenarios');
    }
    
    recommendations.forEach(rec => console.log(`  • ${rec}`));
    
    return recommendations;
  }
}

// FormData polyfill for Node.js
if (typeof FormData === 'undefined') {
  global.FormData = require('form-data');
}

// Run the enhanced test framework
async function runEnhancedTests() {
  const framework = new EnhancedTestFramework();
  await framework.runAllTests();
}

// Export for continuous testing
module.exports = EnhancedTestFramework;

// Run if called directly
if (require.main === module) {
  runEnhancedTests().catch(console.error);
}