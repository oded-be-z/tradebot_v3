/**
 * Test Suite for Natural Language Financial Response Formatting
 * Tests that template headers are removed and responses flow naturally
 */

const IntelligentResponse = require('./services/intelligentResponse');

class NaturalLanguageResponseTester {
  constructor() {
    this.intelligentResponse = IntelligentResponse;
    this.testResults = [];
  }

  // Test cases as specified in requirements
  getTestCases() {
    return [
      { query: "what is apple stock price", symbol: "AAPL", type: "stock" },
      { query: "tell me about MSFT", symbol: "MSFT", type: "stock" },
      { query: "BTC price", symbol: "BTC", type: "crypto" },
      { query: "analyze tesla", symbol: "TSLA", type: "stock" },
      { query: "show me NVDA", symbol: "NVDA", type: "stock" },
      { query: "gold commodity price", symbol: "GLD", type: "commodity" },
      { query: "what's happening with SPY", symbol: "SPY", type: "etf" },
      { query: "META stock analysis", symbol: "META", type: "stock" },
      { query: "current price of ethereum", symbol: "ETH", type: "crypto" },
      { query: "give me info on AMZN", symbol: "AMZN", type: "stock" },
      { query: "how is GOOGL doing", symbol: "GOOGL", type: "stock" },
      { query: "AMD stock today", symbol: "AMD", type: "stock" },
      { query: "oil prices now", symbol: "USO", type: "commodity" },
      { query: "tell me about TSLA stock", symbol: "TSLA", type: "stock" },
      { query: "what's the deal with AAPL", symbol: "AAPL", type: "stock" },
      { query: "JPM analysis please", symbol: "JPM", type: "stock" },
      { query: "bitcoin analysis", symbol: "BTC", type: "crypto" },
      { query: "show me disney stock", symbol: "DIS", type: "stock" },
      { query: "NFLX price and info", symbol: "NFLX", type: "stock" },
      { query: "what's up with GME", symbol: "GME", type: "stock" }
    ];
  }

  // Headers that should NOT appear in natural responses
  getProhibitedHeaders() {
    return [
      "Summary Card",
      "Key Metrics List", 
      "Valuable Info",
      "Historical Price Range",
      "Charts Available",
      "Technicals",
      "Levels",
      "Outlook",
      "(price may stop falling)",
      "(price may stop rising)",
      "(avg price over time to spot trends)",
      "(highest/lowest price in last year)",
      "(Shows recent price variability for context.)",
      "Below: Real-time graph/charts."
    ];
  }

  // Mock data for testing
  getMockCurrentData(symbol, type) {
    const mockData = {
      AAPL: { price: 175.43, changePercent: 2.15, volume: 45231000, high52Week: 198.23, low52Week: 164.08 },
      MSFT: { price: 378.85, changePercent: -0.87, volume: 22108000, high52Week: 384.30, low52Week: 309.45 },
      BTC: { price: 42150.00, changePercent: 5.23, volume: 28500000, high52Week: 69000.00, low52Week: 15460.00 },
      TSLA: { price: 248.50, changePercent: -3.42, volume: 38752000, high52Week: 299.29, low52Week: 138.80 },
      NVDA: { price: 875.28, changePercent: 4.67, volume: 31245000, high52Week: 974.00, low52Week: 356.00 },
      META: { price: 489.22, changePercent: 1.23, volume: 15678000, high52Week: 531.49, low52Week: 88.09 },
      ETH: { price: 2420.75, changePercent: 3.15, volume: 12400000, high52Week: 4878.26, low52Week: 896.11 }
    };

    return mockData[symbol] || { 
      price: 100.00, 
      changePercent: 0.00, 
      volume: 1000000, 
      high52Week: 120.00, 
      low52Week: 80.00,
      timestamp: Date.now(),
      source: "Test Data"
    };
  }

  getMockTrendInfo() {
    return {
      support: 95.50,
      resistance: 105.25,
      trend: "bullish"
    };
  }

  // Check if response contains prohibited headers
  containsProhibitedHeaders(response) {
    const prohibited = this.getProhibitedHeaders();
    const foundHeaders = [];
    
    for (const header of prohibited) {
      if (response.includes(header)) {
        foundHeaders.push(header);
      }
    }
    
    return foundHeaders;
  }

  // Check if response flows naturally (basic criteria)
  isNaturalFlow(response) {
    const criteria = {
      startsWithPrice: /^[A-Z]+\s+is\s+currently\s+trading|^[A-Z]+.*\$[\d,]+\.?\d*/i.test(response.trim()),
      hasNaturalTransitions: !response.includes('**'),
      noBulletPoints: !response.includes('•') && !response.includes('-'),
      conversationalTone: response.includes('may find') || response.includes('trading volume') || response.includes('moving averages'),
      properSentences: response.split('.').length > 3
    };

    return criteria;
  }

  // Run a single test case
  async runTestCase(testCase) {
    console.log(`\n🧪 Testing: "${testCase.query}" (${testCase.symbol})`);
    
    try {
      const currentData = this.getMockCurrentData(testCase.symbol, testCase.type);
      const trendInfo = this.getMockTrendInfo();
      
      // Generate response using the actual method
      const response = await this.intelligentResponse.explainTrendWithRealData(
        testCase.symbol, 
        trendInfo, 
        currentData
      );

      // Check for prohibited headers
      const prohibitedFound = this.containsProhibitedHeaders(response);
      
      // Check natural flow
      const flowCriteria = this.isNaturalFlow(response);
      
      const testResult = {
        query: testCase.query,
        symbol: testCase.symbol,
        type: testCase.type,
        passed: prohibitedFound.length === 0,
        prohibitedHeaders: prohibitedFound,
        flowCriteria: flowCriteria,
        response: response.substring(0, 200) + "...", // Truncated for readability
        fullResponse: response
      };

      this.testResults.push(testResult);
      
      if (testResult.passed) {
        console.log(`✅ PASS - No template headers found`);
      } else {
        console.log(`❌ FAIL - Found headers: ${prohibitedFound.join(', ')}`);
      }

      return testResult;

    } catch (error) {
      console.log(`💥 ERROR - ${error.message}`);
      const errorResult = {
        query: testCase.query,
        symbol: testCase.symbol,
        passed: false,
        error: error.message
      };
      this.testResults.push(errorResult);
      return errorResult;
    }
  }

  // Run all test cases
  async runAllTests() {
    console.log("🚀 Starting Natural Language Response Test Suite\n");
    console.log("Testing 20 cases to ensure template headers are removed...\n");

    const testCases = this.getTestCases();
    
    for (const testCase of testCases) {
      await this.runTestCase(testCase);
    }

    this.generateReport();
  }

  // Generate comprehensive test report
  generateReport() {
    console.log("\n" + "=".repeat(80));
    console.log("📊 NATURAL LANGUAGE RESPONSE TEST RESULTS");
    console.log("=".repeat(80));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`\nOverall Results: ${passedTests}/${totalTests} tests passed (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    
    if (failedTests > 0) {
      console.log(`\n❌ FAILED TESTS (${failedTests}):`);
      this.testResults.filter(r => !r.passed).forEach(result => {
        console.log(`\n📍 ${result.query} (${result.symbol})`);
        if (result.prohibitedHeaders) {
          console.log(`   Headers found: ${result.prohibitedHeaders.join(', ')}`);
        }
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      });
    }

    console.log(`\n✅ PASSED TESTS (${passedTests}):`);
    this.testResults.filter(r => r.passed).forEach(result => {
      console.log(`   ✓ ${result.query} (${result.symbol})`);
    });

    // Summary by asset type
    const assetTypes = {};
    this.testResults.forEach(result => {
      if (!assetTypes[result.type]) {
        assetTypes[result.type] = { total: 0, passed: 0 };
      }
      assetTypes[result.type].total++;
      if (result.passed) assetTypes[result.type].passed++;
    });

    console.log(`\n📈 Results by Asset Type:`);
    Object.entries(assetTypes).forEach(([type, stats]) => {
      console.log(`   ${type.toUpperCase()}: ${stats.passed}/${stats.total} passed`);
    });

    console.log("\n" + "=".repeat(80));
    
    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: (passedTests/totalTests)*100,
      results: this.testResults
    };
  }

  // Display a sample natural response
  displaySampleResponse(symbol = "AAPL") {
    const testCase = this.testResults.find(r => r.symbol === symbol);
    if (testCase && testCase.fullResponse) {
      console.log(`\n📄 SAMPLE NATURAL RESPONSE (${symbol}):`);
      console.log("-".repeat(60));
      console.log(testCase.fullResponse);
      console.log("-".repeat(60));
    }
  }
}

// Export for use in other test files
module.exports = NaturalLanguageResponseTester;

// Run tests if called directly
if (require.main === module) {
  const tester = new NaturalLanguageResponseTester();
  tester.runAllTests().then(() => {
    tester.displaySampleResponse("AAPL");
    process.exit(0);
  }).catch(error => {
    console.error("Test suite failed:", error);
    process.exit(1);
  });
}