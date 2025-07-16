/**
 * Critical Fixes Test Suite - Test ACTUAL Bot Responses
 * Tests the 5 required queries with actual API calls
 */

const axios = require('axios');
const IntelligentResponse = require('./services/intelligentResponse');

class CriticalFixesTester {
  constructor() {
    this.baseURL = 'http://localhost:3000';
    this.intelligentResponse = IntelligentResponse;
    this.testResults = [];
  }

  // The 5 required test queries
  getRequiredQueries() {
    return [
      {
        query: "gold vs silver",
        expected: "Clean comparison table with no scientific notation",
        testType: "comparison"
      },
      {
        query: "NVDA",
        expected: "Volume shows as 'X.XM shares' not '$X,XXX,XXX'",
        testType: "volume_format"
      },
      {
        query: "compare AAPL MSFT",
        expected: "Shows BOTH assets in comparison",
        testType: "comparison"
      },
      {
        query: "aapl?",
        expected: "Returns AAPL data, not AMD",
        testType: "symbol_routing"
      },
      {
        query: "BTC",
        expected: "Percentage shows correctly with one + or - sign",
        testType: "percentage_format"
      }
    ];
  }

  // Test via API call (actual bot usage)
  async testViaAPI(query) {
    try {
      const response = await axios.post(`${this.baseURL}/api/chat`, {
        message: query,
        sessionId: 'test-session-' + Date.now()
      }, {
        timeout: 30000
      });

      return {
        success: true,
        data: response.data,
        content: response.data.content || response.data.message || '',
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'NO_RESPONSE'
      };
    }
  }

  // Test via direct method call (fallback)
  async testViaDirectCall(query) {
    try {
      const response = await this.intelligentResponse.generateResponse(query, {});
      return {
        success: true,
        data: response,
        content: response.analysis || response.content || response.toString(),
        method: 'direct'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        method: 'direct'
      };
    }
  }

  // Validate specific test cases
  validateResponse(query, response, testType) {
    const content = response.content || '';
    const validation = {
      passed: true,
      issues: []
    };

    switch (testType) {
      case 'comparison':
        // Check for comparison table without scientific notation
        if (content.includes('e+') || content.includes('e-')) {
          validation.passed = false;
          validation.issues.push('Scientific notation found in comparison');
        }
        if (query.includes('vs') && (!content.includes('GOLD') || !content.includes('SILVER'))) {
          validation.passed = false;
          validation.issues.push('Missing comparison symbols');
        }
        if (query.includes('compare') && (!content.includes('AAPL') || !content.includes('MSFT'))) {
          validation.passed = false;
          validation.issues.push('Missing comparison symbols');
        }
        break;

      case 'volume_format':
        // Check for proper volume formatting - look for volume specifically formatted as currency
        const volumeLine = content.split('\n').find(line => line.toLowerCase().includes('volume'));
        if (volumeLine && volumeLine.match(/volume.*\$[\d,]+/i)) {
          validation.passed = false;
          validation.issues.push('Volume formatted as currency');
        }
        if (!content.match(/volume[^.]*\d+\.?\d*[MBK]/i)) {
          validation.passed = false;
          validation.issues.push('Volume not in M/B/K format');
        }
        break;

      case 'symbol_routing':
        // Check that aapl? returns AAPL not AMD
        if (content.includes('AMD') && !content.includes('AAPL')) {
          validation.passed = false;
          validation.issues.push('Incorrect symbol routing - returned AMD instead of AAPL');
        }
        if (!content.includes('AAPL')) {
          validation.passed = false;
          validation.issues.push('AAPL data not found');
        }
        break;

      case 'percentage_format':
        // Check for correct percentage formatting
        const percentageMatches = content.match(/[+-]?\d+\.?\d*%/g);
        if (percentageMatches) {
          percentageMatches.forEach(match => {
            if (match.includes('++') || match.includes('--') || match.includes('+-')) {
              validation.passed = false;
              validation.issues.push(`Double sign in percentage: ${match}`);
            }
          });
        }
        break;
    }

    return validation;
  }

  // Run individual test case
  async runTestCase(testCase) {
    console.log(`\n🔍 Testing: "${testCase.query}"`);
    console.log(`Expected: ${testCase.expected}`);

    let response;
    let method;

    // Try API first, then direct call
    response = await this.testViaAPI(testCase.query);
    method = 'API';

    if (!response.success) {
      console.log(`   ⚠️  API failed: ${response.error}`);
      console.log(`   🔄 Trying direct method call...`);
      response = await this.testViaDirectCall(testCase.query);
      method = 'Direct';
    }

    if (!response.success) {
      console.log(`   ❌ Both methods failed`);
      return {
        query: testCase.query,
        passed: false,
        error: response.error,
        method: method
      };
    }

    console.log(`   ✅ Response received via ${method}`);

    // Validate the response
    const validation = this.validateResponse(testCase.query, response, testCase.testType);
    
    const result = {
      query: testCase.query,
      expected: testCase.expected,
      testType: testCase.testType,
      passed: validation.passed,
      issues: validation.issues,
      method: method,
      content: response.content.substring(0, 200) + '...',
      fullContent: response.content
    };

    if (validation.passed) {
      console.log(`   ✅ VALIDATION PASSED`);
    } else {
      console.log(`   ❌ VALIDATION FAILED: ${validation.issues.join(', ')}`);
    }

    this.testResults.push(result);
    return result;
  }

  // Run all required tests
  async runAllTests() {
    console.log("🚀 Starting Critical Fixes Test Suite");
    console.log("Testing actual bot responses for required queries...\n");

    const queries = this.getRequiredQueries();

    for (const query of queries) {
      await this.runTestCase(query);
    }

    this.generateReport();
  }

  // Generate comprehensive report
  generateReport() {
    console.log("\n" + "=".repeat(80));
    console.log("🔍 CRITICAL FIXES TEST RESULTS");
    console.log("=".repeat(80));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`\nOverall Results: ${passedTests}/${totalTests} tests passed (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    
    if (failedTests > 0) {
      console.log(`\n❌ FAILED TESTS (${failedTests}):`);
      this.testResults.filter(r => !r.passed).forEach(result => {
        console.log(`\n📍 ${result.query}`);
        console.log(`   Expected: ${result.expected}`);
        if (result.issues) {
          result.issues.forEach(issue => {
            console.log(`   • ${issue}`);
          });
        }
        if (result.error) {
          console.log(`   • Error: ${result.error}`);
        }
      });
    }

    console.log(`\n✅ PASSED TESTS (${passedTests}):`);
    this.testResults.filter(r => r.passed).forEach(result => {
      console.log(`   ✓ ${result.query} (${result.testType})`);
    });

    // Show sample responses
    console.log(`\n📄 SAMPLE RESPONSES:`);
    this.testResults.forEach(result => {
      if (result.passed) {
        console.log(`\n--- ${result.query} ---`);
        console.log(result.content);
      }
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

  // Show full response for debugging
  showFullResponse(query) {
    const result = this.testResults.find(r => r.query === query);
    if (result && result.fullContent) {
      console.log(`\n📄 FULL RESPONSE for "${query}":`);
      console.log("-".repeat(60));
      console.log(result.fullContent);
      console.log("-".repeat(60));
    }
  }
}

// Export for use in other test files
module.exports = CriticalFixesTester;

// Run tests if called directly
if (require.main === module) {
  const tester = new CriticalFixesTester();
  tester.runAllTests().then(() => {
    const passedTests = tester.testResults.filter(r => r.passed).length;
    if (passedTests === 5) {
      console.log("\n🎉 ALL CRITICAL FIXES VERIFIED!");
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${5 - passedTests} tests still failing`);
      process.exit(1);
    }
  }).catch(error => {
    console.error("Critical fixes test failed:", error);
    process.exit(1);
  });
}