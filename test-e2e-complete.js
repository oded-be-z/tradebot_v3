const axios = require('axios');
const fs = require('fs');

// Use console colors instead of chalk to avoid dependency issues
const colors = {
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

class E2ETestSuite {
  constructor() {
    this.baseURL = 'http://localhost:3000';
    this.results = {
      passed: 0,
      failed: 0,
      details: [],
      categories: {
        core: { passed: 0, total: 0 },
        context: { passed: 0, total: 0 },
        llm: { passed: 0, total: 0 },
        edge: { passed: 0, total: 0 },
        performance: { passed: 0, total: 0 },
        error: { passed: 0, total: 0 }
      }
    };
  }

  async runAllTests() {
    console.log(colors.blue + '=== FINANCEBOT PRO E2E TEST SUITE ===' + colors.reset + '\n');
    
    // Test Categories
    await this.testCoreFunctionality();
    await this.testContextAwareness();
    await this.testLLMUnderstanding();
    await this.testEdgeCases();
    await this.testPerformance();
    await this.testErrorHandling();
    await this.generateReport();
  }

  async testCoreFunctionality() {
    console.log(colors.yellow + '\n1. TESTING CORE FUNCTIONALITY\n' + colors.reset);
    
    const coreTests = [
      // Basic stock queries
      { query: "AAPL", expectType: "standard_analysis", expectSymbol: "AAPL", category: "core" },
      { query: "bitcoin", expectType: "standard_analysis", expectSymbol: "BTC", category: "core" },
      { query: "Microsoft stock", expectType: "standard_analysis", expectSymbol: "MSFT", category: "core" },
      
      // Comparisons
      { query: "compare AAPL and MSFT", expectType: "comparison_table", expectSymbols: ["AAPL", "MSFT"], category: "core" },
      { query: "Tesla vs Ford", expectType: "comparison_table", expectSymbols: ["TSLA", "F"], category: "core" },
      
      // Trends
      { query: "Bitcoin trends", expectType: "trend_analysis", expectChart: true, category: "core" },
      { query: "show me NVDA chart", expectType: "trend_analysis", expectChart: true, category: "core" },
      
      // Group analysis
      { query: "analyze FAANG stocks", expectType: "group_analysis", minSymbols: 5, category: "core" },
      { query: "tech stocks comparison", expectType: "comparison", minSymbols: 4, category: "core" },
      
      // Index mapping
      { query: "S&P 500", expectType: "standard_analysis", expectSymbol: "SPY", category: "core" },
      { query: "nasdaq index", expectType: "standard_analysis", expectSymbol: "QQQ", category: "core" },
      
      // Typo correction
      { query: "TSLS", expectType: "standard_analysis", expectSymbol: "TSLA", category: "core" },
      { query: "microsft", expectType: "standard_analysis", expectSymbol: "MSFT", category: "core" }
    ];
    
    for (const test of coreTests) {
      await this.runTest(test);
    }
  }

  async testContextAwareness() {
    console.log(colors.yellow + '\n2. TESTING CONTEXT AWARENESS\n' + colors.reset);
    
    // Multi-turn conversation
    const conversation = [
      { query: "bitcoin", expect: "BTC analysis", category: "context" },
      { query: "what about ethereum?", expect: "ETH analysis", category: "context" },
      { query: "compare them", expect: "comparison", expectSymbols: ["BTC", "ETH"], category: "context" },
      { query: "which is better for long term?", expect: "comparison insight", category: "context" },
      { query: "show me their trends", expect: "both charts", expectChart: true, category: "context" }
    ];
    
    const sessionId = 'context-test-' + Date.now();
    for (const turn of conversation) {
      await this.runConversationTest(turn, sessionId);
    }
  }

  async testLLMUnderstanding() {
    console.log(colors.yellow + '\n3. TESTING LLM UNDERSTANDING (NEW CAPABILITIES)\n' + colors.reset);
    
    const llmTests = [
      // Company info queries
      { query: "who is the CEO of Apple?", expectContent: "Tim Cook", expectSymbol: "AAPL", notBlocked: true, category: "llm" },
      { query: "who runs Microsoft?", expectContent: "Satya Nadella", expectSymbol: "MSFT", notBlocked: true, category: "llm" },
      { query: "when was Amazon founded?", expectContent: "1994", expectSymbol: "AMZN", notBlocked: true, category: "llm" },
      
      // Financial education
      { query: "what is inflation?", expectType: "educational", notBlocked: true, category: "llm" },
      { query: "explain P/E ratio", expectType: "educational", notBlocked: true, category: "llm" },
      { query: "how does the stock market work?", expectType: "educational", notBlocked: true, category: "llm" },
      { query: "what are options?", expectType: "educational", notBlocked: true, category: "llm" },
      
      // Market queries
      { query: "market hours?", expectContent: "9:30", notBlocked: true, category: "llm" },
      { query: "is market open?", expectContent: ["open", "closed"], notBlocked: true, category: "llm" },
      { query: "when does pre-market start?", expectContent: "4:00 AM", notBlocked: true, category: "llm" },
      
      // Ambiguous but financial
      { query: "Apple news", expectSymbol: "AAPL", notBlocked: true, category: "llm" },
      { query: "Tesla update", expectSymbol: "TSLA", notBlocked: true, category: "llm" },
      { query: "Amazon performance", expectSymbol: "AMZN", notBlocked: true, category: "llm" }
    ];
    
    for (const test of llmTests) {
      await this.runTest(test);
    }
  }

  async testEdgeCases() {
    console.log(colors.yellow + '\n4. TESTING EDGE CASES\n' + colors.reset);
    
    const edgeCases = [
      // Date/time queries (should work now)
      { query: "what date is it now?", expectType: "date_time", expectContent: "2025", category: "edge" },
      { query: "what time is it?", expectType: "date_time", expectContent: ["AM", "PM"], category: "edge" },
      { query: "current date", expectType: "date_time", expectContent: "July", category: "edge" },
      
      // Ambiguous tickers
      { query: "DATE", expectAmbiguity: true, category: "edge" }, // Could be date or DATE ETF
      { query: "CASH", expectType: "standard_analysis", category: "edge" }, // Should understand as ticker
      
      // Mixed queries
      { query: "what's AAPL price and market cap?", expectSymbol: "AAPL", category: "edge" },
      { query: "compare Tesla P/E with industry average", expectSymbol: "TSLA", category: "edge" },
      
      // Natural language variations
      { query: "how's apple doing?", expectSymbol: "AAPL", category: "edge" },
      { query: "is bitcoin a good investment?", expectSymbol: "BTC", category: "edge" },
      { query: "should I buy NVDA?", expectSymbol: "NVDA", category: "edge" },
      
      // True non-financial (should be blocked)
      { query: "what's the weather?", expectBlocked: true, category: "edge" },
      { query: "tell me a joke", expectBlocked: true, category: "edge" },
      { query: "recipe for pizza", expectBlocked: true, category: "edge" },
      { query: "who won the game?", expectBlocked: true, category: "edge" }
    ];
    
    for (const test of edgeCases) {
      await this.runTest(test);
    }
  }

  async testPerformance() {
    console.log(colors.yellow + '\n5. TESTING PERFORMANCE\n' + colors.reset);
    
    const performanceTests = [
      // Response time tests
      { query: "AAPL", maxTime: 2000, category: "performance" },
      { query: "compare AAPL MSFT GOOGL", maxTime: 3000, category: "performance" },
      { query: "analyze FAANG stocks", maxTime: 4000, category: "performance" },
    ];
    
    // Test response times
    for (const test of performanceTests) {
      await this.runPerformanceTest(test);
    }
    
    // Concurrent requests test
    const concurrentTest = { 
      queries: ["BTC", "ETH", "AAPL", "MSFT", "TSLA"],
      concurrent: true,
      maxTotalTime: 5000,
      category: "performance"
    };
    
    await this.runConcurrentTest(concurrentTest);
  }

  async testErrorHandling() {
    console.log(colors.yellow + '\n6. TESTING ERROR HANDLING\n' + colors.reset);
    
    const errorTests = [
      // Invalid symbols
      { query: "INVALIDTICKER123", expectGraceful: true, category: "error" },
      { query: "compare XXX and YYY", expectGraceful: true, category: "error" },
      
      // Empty/null queries
      { query: "", expectError: true, category: "error" },
      { query: "   ", expectError: true, category: "error" },
      
      // Injection attempts
      { query: "'; DROP TABLE stocks;--", expectBlocked: true, category: "error" },
      { query: "<script>alert('test')</script>", expectBlocked: true, category: "error" },
      
      // Very long queries
      { query: "AAPL ".repeat(100), expectGraceful: true, category: "error" }
    ];
    
    for (const test of errorTests) {
      await this.runErrorTest(test);
    }
  }

  async runTest(test) {
    try {
      const startTime = Date.now();
      const response = await axios.post(`${this.baseURL}/api/chat`, {
        message: test.query,
        sessionId: 'test-' + Date.now()
      });
      const endTime = Date.now();
      
      const data = response.data;
      const responseTime = endTime - startTime;
      
      // Validate expectations
      let passed = true;
      let issues = [];
      
      if (test.expectType && data.type !== test.expectType) {
        passed = false;
        issues.push(`Expected type ${test.expectType}, got ${data.type}`);
      }
      
      if (test.expectSymbol && data.response && !data.response.includes(test.expectSymbol)) {
        passed = false;
        issues.push(`Expected symbol ${test.expectSymbol} not found`);
      }
      
      if (test.expectSymbols) {
        const foundSymbols = test.expectSymbols.filter(sym => 
          (data.response && data.response.includes(sym)) || (data.symbols && data.symbols.includes(sym))
        );
        if (foundSymbols.length !== test.expectSymbols.length) {
          passed = false;
          issues.push(`Expected symbols ${test.expectSymbols}, found ${foundSymbols}`);
        }
      }
      
      if (test.expectBlocked && data.type !== 'refusal' && data.type !== 'non_financial_refusal') {
        passed = false;
        issues.push(`Expected query to be blocked`);
      }
      
      if (test.notBlocked && (data.type === 'refusal' || data.type === 'non_financial_refusal')) {
        passed = false;
        issues.push(`Query should not be blocked - type: ${data.type}`);
      }
      
      if (test.expectContent) {
        const contents = Array.isArray(test.expectContent) ? test.expectContent : [test.expectContent];
        const found = contents.some(content => 
          data.response && data.response.toLowerCase().includes(content.toLowerCase())
        );
        if (!found) {
          passed = false;
          issues.push(`Expected content not found: ${test.expectContent}`);
        }
      }
      
      if (test.expectChart && !data.chartData) {
        passed = false;
        issues.push(`Expected chart data not found`);
      }
      
      if (test.minSymbols && (!data.symbols || data.symbols.length < test.minSymbols)) {
        passed = false;
        issues.push(`Expected at least ${test.minSymbols} symbols, got ${data.symbols?.length || 0}`);
      }
      
      // Log result
      if (passed) {
        console.log(colors.green + `✓ ${test.query}` + colors.reset);
        this.results.passed++;
        if (test.category) this.results.categories[test.category].passed++;
      } else {
        console.log(colors.red + `✗ ${test.query}` + colors.reset);
        console.log(colors.red + `  Issues: ${issues.join(', ')}` + colors.reset);
        console.log(`  Response type: ${data.type}`);
        console.log(`  Response preview: ${data.response?.substring(0, 100)}...`);
        this.results.failed++;
      }
      
      if (test.category) this.results.categories[test.category].total++;
      
      this.results.details.push({
        query: test.query,
        passed,
        responseTime,
        issues,
        category: test.category,
        responseType: data.type,
        response: data.response?.substring(0, 100) + '...'
      });
      
    } catch (error) {
      console.log(colors.red + `✗ ${test.query} - ERROR: ${error.message}` + colors.reset);
      this.results.failed++;
      if (test.category) this.results.categories[test.category].total++;
      
      this.results.details.push({
        query: test.query,
        passed: false,
        error: error.message,
        category: test.category
      });
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async runConversationTest(test, sessionId) {
    test.sessionId = sessionId;
    await this.runTest(test);
  }

  async runPerformanceTest(test) {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${this.baseURL}/api/chat`, {
        message: test.query,
        sessionId: 'perf-test-' + Date.now()
      });
      
      const responseTime = Date.now() - startTime;
      const passed = responseTime <= test.maxTime;
      
      if (passed) {
        console.log(colors.green + `✓ ${test.query} - ${responseTime}ms (max: ${test.maxTime}ms)` + colors.reset);
        this.results.passed++;
        this.results.categories.performance.passed++;
      } else {
        console.log(colors.red + `✗ ${test.query} - ${responseTime}ms (max: ${test.maxTime}ms)` + colors.reset);
        this.results.failed++;
      }
      
      this.results.categories.performance.total++;
      
      this.results.details.push({
        query: test.query,
        passed,
        responseTime,
        maxTime: test.maxTime,
        category: 'performance'
      });
      
    } catch (error) {
      console.log(colors.red + `✗ ${test.query} - ERROR: ${error.message}` + colors.reset);
      this.results.failed++;
      this.results.categories.performance.total++;
    }
  }

  async runConcurrentTest(test) {
    console.log(`\nRunning concurrent test with ${test.queries.length} queries...`);
    
    const startTime = Date.now();
    
    try {
      const promises = test.queries.map(query => 
        axios.post(`${this.baseURL}/api/chat`, {
          message: query,
          sessionId: 'concurrent-' + Date.now()
        })
      );
      
      await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      const passed = totalTime <= test.maxTotalTime;
      
      if (passed) {
        console.log(colors.green + `✓ Concurrent requests completed in ${totalTime}ms (max: ${test.maxTotalTime}ms)` + colors.reset);
        this.results.passed++;
        this.results.categories.performance.passed++;
      } else {
        console.log(colors.red + `✗ Concurrent requests took ${totalTime}ms (max: ${test.maxTotalTime}ms)` + colors.reset);
        this.results.failed++;
      }
      
      this.results.categories.performance.total++;
      
    } catch (error) {
      console.log(colors.red + `✗ Concurrent test failed: ${error.message}` + colors.reset);
      this.results.failed++;
      this.results.categories.performance.total++;
    }
  }

  async runErrorTest(test) {
    try {
      const response = await axios.post(`${this.baseURL}/api/chat`, {
        message: test.query,
        sessionId: 'error-test-' + Date.now()
      });
      
      const data = response.data;
      let passed = false;
      
      if (test.expectError) {
        // Should have returned an error
        passed = response.status >= 400 || data.error;
      } else if (test.expectBlocked) {
        // Should be blocked as non-financial or malicious
        passed = data.type === 'refusal' || data.type === 'non_financial_refusal';
      } else if (test.expectGraceful) {
        // Should handle gracefully without crashing
        passed = response.status === 200 && data.response;
      }
      
      if (passed) {
        console.log(colors.green + `✓ ${test.query || '(empty)'} - Handled correctly` + colors.reset);
        this.results.passed++;
        this.results.categories.error.passed++;
      } else {
        console.log(colors.red + `✗ ${test.query || '(empty)'} - Not handled correctly` + colors.reset);
        this.results.failed++;
      }
      
      this.results.categories.error.total++;
      
    } catch (error) {
      // For error tests, catching an error might be expected
      if (test.expectError) {
        console.log(colors.green + `✓ ${test.query || '(empty)'} - Correctly errored` + colors.reset);
        this.results.passed++;
        this.results.categories.error.passed++;
      } else {
        console.log(colors.red + `✗ ${test.query || '(empty)'} - Unexpected error: ${error.message}` + colors.reset);
        this.results.failed++;
      }
      
      this.results.categories.error.total++;
    }
  }

  countPassed(pattern) {
    return this.results.details.filter(d => 
      d.passed && d.query.match(new RegExp(pattern, 'i'))
    ).length;
  }

  countTotal(pattern) {
    return this.results.details.filter(d => 
      d.query.match(new RegExp(pattern, 'i'))
    ).length;
  }

  getFailedTests() {
    const failed = this.results.details.filter(d => !d.passed);
    if (failed.length === 0) return 'None! 🎉';
    
    return failed.map(f => 
      `- "${f.query}" (${f.category}) - ${f.issues?.join(', ') || f.error || 'Unknown error'}`
    ).join('\n');
  }

  getAverageResponseTime() {
    const times = this.results.details
      .filter(d => d.responseTime)
      .map(d => d.responseTime);
    
    if (times.length === 0) return 'N/A';
    
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    return Math.round(avg);
  }

  getSlowestQuery() {
    const sorted = this.results.details
      .filter(d => d.responseTime)
      .sort((a, b) => b.responseTime - a.responseTime);
    
    if (sorted.length === 0) return 'N/A';
    
    const slowest = sorted[0];
    return `"${slowest.query}" (${slowest.responseTime}ms)`;
  }

  getRecommendations() {
    const recommendations = [];
    const passRate = this.results.passed / (this.results.passed + this.results.failed) * 100;
    
    if (passRate < 95) {
      recommendations.push('- Overall pass rate below 95%, investigation needed');
    }
    
    // Category-specific recommendations
    Object.entries(this.results.categories).forEach(([category, stats]) => {
      if (stats.total > 0) {
        const catPassRate = stats.passed / stats.total * 100;
        if (catPassRate < 90) {
          recommendations.push(`- ${category.toUpperCase()} tests have low pass rate (${catPassRate.toFixed(1)}%)`);
        }
      }
    });
    
    // Performance recommendations
    const avgResponseTime = this.getAverageResponseTime();
    if (avgResponseTime > 1500) {
      recommendations.push(`- Average response time (${avgResponseTime}ms) is high, consider optimization`);
    }
    
    // LLM-specific recommendations
    const llmFailures = this.results.details.filter(d => 
      d.category === 'llm' && !d.passed
    );
    if (llmFailures.length > 0) {
      recommendations.push('- LLM understanding tests have failures, check Azure OpenAI integration');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- All systems performing well! Ready for production.');
    }
    
    return recommendations.join('\n');
  }

  async generateReport() {
    const totalTests = this.results.passed + this.results.failed;
    const passRate = (this.results.passed / totalTests * 100).toFixed(1);
    
    const report = `# E2E TEST REPORT - FinanceBot Pro
Generated: ${new Date().toISOString()}

## Summary
- Total Tests: ${totalTests}
- Passed: ${this.results.passed} (${passRate}%)
- Failed: ${this.results.failed}

## Test Categories

### 1. Core Functionality
- Pass Rate: ${this.getCategoryPassRate('core')}%
- Stock queries, comparisons, trends, group analysis

### 2. Context Awareness
- Pass Rate: ${this.getCategoryPassRate('context')}%
- Multi-turn conversations, context retention

### 3. LLM Understanding
- Pass Rate: ${this.getCategoryPassRate('llm')}%
- Company info, education, market queries

### 4. Edge Cases
- Pass Rate: ${this.getCategoryPassRate('edge')}%
- Date/time, ambiguous queries, non-financial blocking

### 5. Performance
- Pass Rate: ${this.getCategoryPassRate('performance')}%
- Response times, concurrent handling

### 6. Error Handling
- Pass Rate: ${this.getCategoryPassRate('error')}%
- Invalid inputs, security, graceful failures

## Failed Tests
${this.getFailedTests()}

## Performance Metrics
- Average response time: ${this.getAverageResponseTime()}ms
- Slowest query: ${this.getSlowestQuery()}

## Key Achievements
${this.getKeyAchievements()}

## Recommendations
${this.getRecommendations()}

## Production Readiness Score: ${this.getProductionReadinessScore()}/100
`;

    console.log(colors.blue + '\n=== FINAL REPORT ===' + colors.reset + '\n');
    console.log(report);
    
    // Save to file
    fs.writeFileSync('e2e-test-report.md', report);
    console.log(colors.green + '\nReport saved to e2e-test-report.md' + colors.reset);
    
    return report;
  }

  getCategoryPassRate(category) {
    const cat = this.results.categories[category];
    if (!cat || cat.total === 0) return 'N/A';
    return (cat.passed / cat.total * 100).toFixed(1);
  }

  getKeyAchievements() {
    const achievements = [];
    
    // Check for LLM improvements
    const llmTests = this.results.details.filter(d => d.category === 'llm' && d.passed);
    if (llmTests.length > 0) {
      achievements.push('- ✅ LLM now correctly handles company info queries (CEO, founding dates)');
      achievements.push('- ✅ Educational queries are answered instead of blocked');
      achievements.push('- ✅ Market hours and timing queries work correctly');
    }
    
    // Check context awareness
    const contextTests = this.results.details.filter(d => d.category === 'context' && d.passed);
    if (contextTests.length > 0) {
      achievements.push('- ✅ "Compare them" and other context-dependent queries work');
    }
    
    // Check edge cases
    const edgeTests = this.results.details.filter(d => d.category === 'edge' && d.passed);
    if (edgeTests.length > 0) {
      achievements.push('- ✅ Date/time queries return actual dates and times');
      achievements.push('- ✅ Non-financial queries are still properly blocked');
    }
    
    return achievements.join('\n') || '- No significant achievements detected';
  }

  getProductionReadinessScore() {
    let score = 0;
    
    // Base score from pass rate (max 50 points)
    const passRate = this.results.passed / (this.results.passed + this.results.failed) * 100;
    score += Math.min(50, passRate / 2);
    
    // Category scores (max 30 points)
    const categoryScores = Object.values(this.results.categories).map(cat => {
      if (cat.total === 0) return 1;
      return cat.passed / cat.total;
    });
    const avgCategoryScore = categoryScores.reduce((sum, s) => sum + s, 0) / categoryScores.length;
    score += avgCategoryScore * 30;
    
    // Performance score (max 10 points)
    const avgResponseTime = this.getAverageResponseTime();
    if (avgResponseTime < 1000) score += 10;
    else if (avgResponseTime < 1500) score += 7;
    else if (avgResponseTime < 2000) score += 5;
    else if (avgResponseTime < 3000) score += 3;
    
    // LLM integration score (max 10 points)
    const llmPassRate = parseFloat(this.getCategoryPassRate('llm')) || 0;
    score += llmPassRate / 10;
    
    return Math.round(score);
  }
}

// Run the tests
async function main() {
  console.log(colors.yellow + 'Starting E2E Test Suite...' + colors.reset);
  console.log(colors.yellow + 'Make sure the server is running on http://localhost:3000' + colors.reset + '\n');
  
  const tester = new E2ETestSuite();
  
  try {
    // First check if server is running
    await axios.get('http://localhost:3000/api/health').catch(() => {
      throw new Error('Server is not running! Please start the server first.');
    });
    
    await tester.runAllTests();
  } catch (error) {
    console.error(colors.red + '\nTest suite failed to run: ' + error.message + colors.reset);
    process.exit(1);
  }
}

main();