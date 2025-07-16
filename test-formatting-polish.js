/**
 * Enhanced Test Suite for Perfect Number Formatting and Response Consistency
 * Tests 25 specific formatting scenarios to ensure perfect polish
 */

const IntelligentResponse = require('./services/intelligentResponse');
const NumberFormatter = require('./utils/numberFormatter');

class FormattingPolishTester {
  constructor() {
    this.intelligentResponse = IntelligentResponse;
    this.testResults = [];
    this.formatter = NumberFormatter;
  }

  // Enhanced test cases for formatting polish
  getFormattingTestCases() {
    return [
      // Original 20 tests
      { query: "what is apple stock price", symbol: "AAPL", type: "stock", testName: "Basic stock price" },
      { query: "tell me about MSFT", symbol: "MSFT", type: "stock", testName: "Stock analysis" },
      { query: "BTC price", symbol: "BTC", type: "crypto", testName: "Crypto basic price" },
      { query: "analyze tesla", symbol: "TSLA", type: "stock", testName: "Stock analysis command" },
      { query: "show me NVDA", symbol: "NVDA", type: "stock", testName: "Stock display request" },
      { query: "gold commodity price", symbol: "GLD", type: "commodity", testName: "Commodity price" },
      { query: "what's happening with SPY", symbol: "SPY", type: "etf", testName: "ETF analysis" },
      { query: "META stock analysis", symbol: "META", type: "stock", testName: "Stock detailed analysis" },
      { query: "current price of ethereum", symbol: "ETH", type: "crypto", testName: "Crypto current price" },
      { query: "give me info on AMZN", symbol: "AMZN", type: "stock", testName: "Stock information" },
      { query: "how is GOOGL doing", symbol: "GOOGL", type: "stock", testName: "Stock performance" },
      { query: "AMD stock today", symbol: "AMD", type: "stock", testName: "Stock today focus" },
      { query: "oil prices now", symbol: "USO", type: "commodity", testName: "Commodity current price" },
      { query: "tell me about TSLA stock", symbol: "TSLA", type: "stock", testName: "Stock detailed info" },
      { query: "what's the deal with AAPL", symbol: "AAPL", type: "stock", testName: "Casual stock query" },
      { query: "JPM analysis please", symbol: "JPM", type: "stock", testName: "Banking stock analysis" },
      { query: "bitcoin analysis", symbol: "BTC", type: "crypto", testName: "Crypto analysis" },
      { query: "show me disney stock", symbol: "DIS", type: "stock", testName: "Entertainment stock" },
      { query: "NFLX price and info", symbol: "NFLX", type: "stock", testName: "Streaming stock" },
      { query: "what's up with GME", symbol: "GME", type: "stock", testName: "Meme stock" },
      
      // Additional 5 specific formatting tests
      { query: "GC", symbol: "GC", type: "commodity", testName: "Gold commodity large price", expectedPrice: 2500.00 },
      { query: "AAPL with high volume", symbol: "AAPL", type: "stock", testName: "High volume formatting", expectedVolume: 150000000 },
      { query: "GOLD vs SILVER", symbol: "GLD", type: "comparison", testName: "Comparison without headers" },
      { query: "aapl?", symbol: "AAPL", type: "stock", testName: "No query echo test" },
      { query: "TSLA volume today", symbol: "TSLA", type: "stock", testName: "Volume specific formatting", expectedVolume: 230600000 }
    ];
  }

  // Mock data generator with specific formatting scenarios
  getMockDataForFormattingTest(symbol, type, testCase) {
    const formattingScenarios = {
      "AAPL": { price: 175.43, changePercent: 2.15, volume: 45231000, high52Week: 198.23, low52Week: 164.08 },
      "MSFT": { price: 378.85, changePercent: -0.87, volume: 22108000, high52Week: 384.30, low52Week: 309.45 },
      "BTC": { price: 42150.00, changePercent: 5.23, volume: 28500000, high52Week: 69000.00, low52Week: 15460.00 },
      "GC": { price: 2500.94, changePercent: 1.23, volume: 125000, high52Week: 2664.75, low52Week: 1997.13 }, // Gold large price
      "TSLA": { price: 248.50, changePercent: -3.42, volume: 230600000, high52Week: 299.29, low52Week: 138.80 }, // High volume
      "NVDA": { price: 875.28, changePercent: 4.67, volume: 31245000, high52Week: 974.00, low52Week: 356.00 },
      "ETH": { price: 3152.87, changePercent: 3.15, volume: 12400000, high52Week: 4878.26, low52Week: 896.11 },
      "GME": { price: 23.22, changePercent: -2.03, volume: 6792540, high52Week: 81.00, low52Week: 9.95 }
    };

    // Override with test-specific data if provided
    const baseData = formattingScenarios[symbol] || { 
      price: 100.00, 
      changePercent: 0.00, 
      volume: 1000000, 
      high52Week: 120.00, 
      low52Week: 80.00 
    };

    // Apply test-specific overrides
    if (testCase.expectedPrice) baseData.price = testCase.expectedPrice;
    if (testCase.expectedVolume) baseData.volume = testCase.expectedVolume;

    return {
      ...baseData,
      timestamp: Date.now(),
      source: "Test Data"
    };
  }

  // Comprehensive formatting validation
  validateFormatting(response, testCase) {
    const validationResults = {
      noScientificNotation: true,
      properPriceFormatting: true,
      properVolumeFormatting: true,
      properPercentageFormatting: true,
      noTemplateHeaders: true,
      noQueryEcho: true,
      naturalLanguageFlow: true,
      details: []
    };

    // Check for scientific notation
    const scientificPattern = /\d+\.?\d*[eE][+-]?\d+/;
    if (scientificPattern.test(response)) {
      validationResults.noScientificNotation = false;
      validationResults.details.push("Scientific notation found");
    }

    // Check price formatting (should have $ and commas for large numbers)
    const priceMatches = response.match(/\$[\d,]+\.?\d*/g);
    if (priceMatches) {
      priceMatches.forEach(price => {
        const numericValue = parseFloat(price.replace(/[$,]/g, ''));
        if (numericValue >= 1000 && !price.includes(',')) {
          validationResults.properPriceFormatting = false;
          validationResults.details.push(`Price ${price} missing comma separator`);
        }
        if (!price.includes('.') && numericValue > 0) {
          validationResults.properPriceFormatting = false;
          validationResults.details.push(`Price ${price} missing decimal places`);
        }
      });
    }

    // Check volume formatting (should use M, B, K notation)
    const volumePattern = /(\d+,?\d*)\s+(shares|contracts|coins)/i;
    const volumeMatches = response.match(volumePattern);
    if (volumeMatches) {
      const volumeStr = volumeMatches[1];
      if (volumeStr.includes(',') && volumeStr.length > 6) {
        validationResults.properVolumeFormatting = false;
        validationResults.details.push(`Volume ${volumeStr} should use M/B/K notation`);
      }
    }

    // Check percentage formatting (should be +X.XX% or -X.XX%)
    const percentagePattern = /[+-]?\d+\.?\d*%/g;
    const percentageMatches = response.match(percentagePattern);
    if (percentageMatches) {
      percentageMatches.forEach(pct => {
        if (!pct.match(/[+-]\d+\.\d{2}%/)) {
          validationResults.properPercentageFormatting = false;
          validationResults.details.push(`Percentage ${pct} not properly formatted`);
        }
      });
    }

    // Check for template headers
    const templateHeaders = [
      'Summary Card', 'Key Metrics List', 'Valuable Info', 'Historical Price Range',
      'vs.*Comparison', 'Technicals', 'Levels', 'Outlook'
    ];
    
    templateHeaders.forEach(header => {
      if (response.includes(header)) {
        validationResults.noTemplateHeaders = false;
        validationResults.details.push(`Template header found: ${header}`);
      }
    });

    // Check for query echoing (but ignore stock symbols which should appear)
    const queryWords = testCase.query.toLowerCase().split(/\s+/);
    queryWords.forEach(word => {
      // Skip stock symbols and very short words
      if (word.length > 2 && word !== testCase.symbol.toLowerCase() && 
          response.toLowerCase().startsWith(word + '?')) {
        validationResults.noQueryEcho = false;
        validationResults.details.push(`Query echo detected: ${word}`);
      }
    });

    // Check natural language flow
    const naturalFlowIndicators = [
      'is currently trading at',
      'may find support around',
      'trading volume reached',
      'price movements are influenced by',
      'has traded between'
    ];
    
    const flowCount = naturalFlowIndicators.filter(indicator => 
      response.includes(indicator)
    ).length;
    
    if (flowCount < 3) {
      validationResults.naturalLanguageFlow = false;
      validationResults.details.push(`Natural language flow insufficient (${flowCount}/5 indicators)`);
    }

    return validationResults;
  }

  // Test NumberFormatter utility functions
  testNumberFormatterFunctions() {
    const formatterTests = [
      { input: 1234.56, function: 'formatPrice', expected: '$1,234.56' },
      { input: 0.0001, function: 'formatPrice', expected: '$0.0001' },
      { input: 1000000, function: 'formatPrice', expected: '$1,000,000.00' },
      { input: 2.15, function: 'formatPercentage', expected: '+2.15%' },
      { input: -3.42, function: 'formatPercentage', expected: '-3.42%' },
      { input: 999, function: 'formatVolume', expected: '999 shares' },
      { input: 1500, function: 'formatVolume', expected: '1.5K shares' },
      { input: 42300000, function: 'formatVolume', expected: '42.3M shares' },
      { input: 1200000000, function: 'formatVolume', expected: '1.2B shares' },
      { input: 2500.94, function: 'formatMovingAverage', expected: '$2,500.94' },
      { input: 0.001, function: 'formatPercentage', expected: '+0.00%' }
    ];

    const results = [];
    formatterTests.forEach(test => {
      try {
        const result = this.formatter[test.function](test.input, 'shares');
        const passed = result === test.expected;
        results.push({
          test: `${test.function}(${test.input})`,
          expected: test.expected,
          actual: result,
          passed: passed
        });
      } catch (error) {
        results.push({
          test: `${test.function}(${test.input})`,
          expected: test.expected,
          actual: `ERROR: ${error.message}`,
          passed: false
        });
      }
    });

    return results;
  }

  // Run individual test case
  async runFormattingTestCase(testCase) {
    console.log(`\n🎯 Testing: "${testCase.testName}" (${testCase.symbol})`);
    
    try {
      const currentData = this.getMockDataForFormattingTest(testCase.symbol, testCase.type, testCase);
      const trendInfo = { support: currentData.price * 0.95, resistance: currentData.price * 1.05 };
      
      // Generate response
      const response = await this.intelligentResponse.explainTrendWithRealData(
        testCase.symbol, 
        trendInfo, 
        currentData
      );

      // Validate formatting
      const validation = this.validateFormatting(response, testCase);
      
      const allPassed = Object.values(validation).every(result => 
        typeof result === 'boolean' ? result : true
      );

      const testResult = {
        testName: testCase.testName,
        query: testCase.query,
        symbol: testCase.symbol,
        type: testCase.type,
        passed: allPassed,
        validation: validation,
        response: response.substring(0, 150) + "...",
        fullResponse: response
      };

      this.testResults.push(testResult);
      
      if (testResult.passed) {
        console.log(`✅ PASS - Perfect formatting`);
      } else {
        console.log(`❌ FAIL - Issues: ${validation.details.join(', ')}`);
      }

      return testResult;

    } catch (error) {
      console.log(`💥 ERROR - ${error.message}`);
      const errorResult = {
        testName: testCase.testName,
        query: testCase.query,
        symbol: testCase.symbol,
        passed: false,
        error: error.message
      };
      this.testResults.push(errorResult);
      return errorResult;
    }
  }

  // Run all formatting tests
  async runAllFormattingTests() {
    console.log("🎯 Starting Enhanced Formatting Polish Test Suite");
    console.log("Testing 25 specific formatting scenarios...\n");

    // First test the NumberFormatter utility functions
    console.log("📐 Testing NumberFormatter utility functions...");
    const formatterResults = this.testNumberFormatterFunctions();
    const formatterPassed = formatterResults.filter(r => r.passed).length;
    console.log(`NumberFormatter: ${formatterPassed}/${formatterResults.length} tests passed\n`);

    // Then test real responses
    const testCases = this.getFormattingTestCases();
    
    for (const testCase of testCases) {
      await this.runFormattingTestCase(testCase);
    }

    this.generateFormattingReport();
    return this.testResults;
  }

  // Generate comprehensive formatting report
  generateFormattingReport() {
    console.log("\n" + "=".repeat(80));
    console.log("🎯 FORMATTING POLISH TEST RESULTS");
    console.log("=".repeat(80));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`\nOverall Results: ${passedTests}/${totalTests} tests passed (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    
    if (failedTests > 0) {
      console.log(`\n❌ FORMATTING ISSUES FOUND (${failedTests}):`);
      this.testResults.filter(r => !r.passed).forEach(result => {
        console.log(`\n📍 ${result.testName} (${result.symbol})`);
        if (result.validation && result.validation.details) {
          result.validation.details.forEach(detail => {
            console.log(`   • ${detail}`);
          });
        }
        if (result.error) {
          console.log(`   • Error: ${result.error}`);
        }
      });
    }

    console.log(`\n✅ PERFECTLY FORMATTED (${passedTests}):`);
    this.testResults.filter(r => r.passed).forEach(result => {
      console.log(`   ✓ ${result.testName} (${result.symbol})`);
    });

    // Detailed formatting analysis
    console.log(`\n📊 Formatting Analysis:`);
    const validationCounts = {
      noScientificNotation: 0,
      properPriceFormatting: 0,
      properVolumeFormatting: 0,
      properPercentageFormatting: 0,
      noTemplateHeaders: 0,
      noQueryEcho: 0,
      naturalLanguageFlow: 0
    };

    this.testResults.forEach(result => {
      if (result.validation) {
        Object.keys(validationCounts).forEach(key => {
          if (result.validation[key]) validationCounts[key]++;
        });
      }
    });

    Object.entries(validationCounts).forEach(([key, count]) => {
      const percentage = ((count / totalTests) * 100).toFixed(1);
      console.log(`   ${key}: ${count}/${totalTests} (${percentage}%)`);
    });

    console.log("\n" + "=".repeat(80));
    
    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: (passedTests/totalTests)*100,
      validationCounts,
      results: this.testResults
    };
  }

  // Display sample formatted response
  displayFormattedSample(symbol = "AAPL") {
    const testCase = this.testResults.find(r => r.symbol === symbol);
    if (testCase && testCase.fullResponse) {
      console.log(`\n💎 SAMPLE FORMATTED RESPONSE (${symbol}):`);
      console.log("-".repeat(60));
      console.log(testCase.fullResponse);
      console.log("-".repeat(60));
    }
  }
}

// Export for use in other test files
module.exports = FormattingPolishTester;

// Run tests if called directly
if (require.main === module) {
  const tester = new FormattingPolishTester();
  tester.runAllFormattingTests().then(() => {
    tester.displayFormattedSample("AAPL");
    tester.displayFormattedSample("GC");
    process.exit(0);
  }).catch(error => {
    console.error("Formatting test suite failed:", error);
    process.exit(1);
  });
}