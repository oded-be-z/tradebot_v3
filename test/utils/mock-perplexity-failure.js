// test/utils/mock-perplexity-failure.js
// Utility to test Perplexity API failure scenarios

const axios = require('axios');
const chalk = require('chalk');

class PerplexityFailureSimulator {
  constructor(apiUrl = 'http://localhost:3000') {
    this.apiUrl = apiUrl;
    this.originalPerplexityBehavior = null;
  }

  // Simulate various Perplexity failure scenarios
  async testFailureScenarios() {
    console.log(chalk.bold.blue('\n🔥 Testing Perplexity Failure Scenarios\n'));
    
    const scenarios = [
      {
        name: 'Perplexity Timeout',
        description: 'Simulates Perplexity API timeout',
        testQuery: 'AAPL stock price',
        headers: { 'X-Test-Scenario': 'perplexity-timeout' }
      },
      {
        name: 'Perplexity Rate Limit',
        description: 'Simulates hitting Perplexity rate limit',
        testQuery: 'What is MSFT trading at?',
        headers: { 'X-Test-Scenario': 'perplexity-rate-limit' }
      },
      {
        name: 'Perplexity Invalid Response',
        description: 'Simulates Perplexity returning invalid data',
        testQuery: 'TSLA?',
        headers: { 'X-Test-Scenario': 'perplexity-invalid-response' }
      },
      {
        name: 'Perplexity Complete Failure',
        description: 'Simulates complete Perplexity service outage',
        testQuery: 'Compare NVDA and AMD',
        headers: { 'X-Test-Scenario': 'perplexity-complete-failure' }
      }
    ];

    const results = [];

    for (const scenario of scenarios) {
      console.log(chalk.cyan(`\nTesting: ${scenario.name}`));
      console.log(chalk.gray(scenario.description));
      console.log(chalk.gray(`Query: "${scenario.testQuery}"`));

      try {
        const startTime = Date.now();
        
        // Send request with test headers to trigger mock behavior
        const response = await axios.post(
          `${this.apiUrl}/api/chat`,
          {
            message: scenario.testQuery,
            sessionId: `failure-test-${Date.now()}`
          },
          {
            headers: scenario.headers,
            timeout: 30000
          }
        );

        const responseTime = Date.now() - startTime;
        const content = response.data.content;

        // Check if fallback worked properly
        const hasPrice = /\$?\d+\.?\d*/.test(content);
        const hasError = content.toLowerCase().includes('error') || 
                        content.toLowerCase().includes('unavailable');
        const usedFallback = content.includes('Azure') || 
                           responseTime > 5000; // Longer time might indicate fallback

        if (hasPrice && !hasError) {
          console.log(chalk.green(`✓ PASSED - Fallback successful (${responseTime}ms)`));
          console.log(chalk.gray(`  Response preview: ${content.substring(0, 100)}...`));
          
          results.push({
            scenario: scenario.name,
            status: 'PASSED',
            hasPrice,
            usedFallback,
            responseTime
          });
        } else {
          console.log(chalk.red(`✗ FAILED - No valid price returned`));
          console.log(chalk.red(`  Response: ${content.substring(0, 150)}...`));
          
          results.push({
            scenario: scenario.name,
            status: 'FAILED',
            hasPrice,
            hasError,
            responseTime
          });
        }

      } catch (error) {
        console.log(chalk.red(`✗ ERROR - Request failed: ${error.message}`));
        results.push({
          scenario: scenario.name,
          status: 'ERROR',
          error: error.message
        });
      }
    }

    // Summary
    console.log(chalk.bold('\n📊 Failure Handling Summary:'));
    const passed = results.filter(r => r.status === 'PASSED').length;
    const failed = results.filter(r => r.status !== 'PASSED').length;
    
    console.log(chalk.green(`  Handled successfully: ${passed}/${scenarios.length}`));
    console.log(chalk.red(`  Failed to handle: ${failed}/${scenarios.length}`));
    
    // Average fallback time
    const avgFallbackTime = results
      .filter(r => r.responseTime)
      .reduce((sum, r) => sum + r.responseTime, 0) / results.filter(r => r.responseTime).length;
    
    console.log(chalk.blue(`  Average fallback time: ${avgFallbackTime.toFixed(0)}ms`));

    return results;
  }

  // Test cascading failures (multiple services fail)
  async testCascadingFailures() {
    console.log(chalk.bold.yellow('\n⚡ Testing Cascading Failures\n'));

    const cascadeScenarios = [
      {
        name: 'Perplexity + Yahoo Finance Failure',
        headers: { 'X-Test-Scenario': 'cascade-perplexity-yahoo' },
        query: 'GOOGL stock price'
      },
      {
        name: 'All External APIs Fail',
        headers: { 'X-Test-Scenario': 'cascade-all-apis' },
        query: 'What is Bitcoin trading at?'
      },
      {
        name: 'Intermittent Failures',
        headers: { 'X-Test-Scenario': 'cascade-intermittent' },
        query: 'Show me AAPL, MSFT, and TSLA prices'
      }
    ];

    for (const scenario of cascadeScenarios) {
      console.log(chalk.cyan(`Testing: ${scenario.name}`));
      
      try {
        const response = await axios.post(
          `${this.apiUrl}/api/chat`,
          {
            message: scenario.query,
            sessionId: `cascade-test-${Date.now()}`
          },
          {
            headers: scenario.headers,
            timeout: 30000
          }
        );

        const content = response.data.content;
        const hasValidResponse = content.length > 50 && !content.toLowerCase().includes('error');
        
        if (hasValidResponse) {
          console.log(chalk.green('✓ System recovered from cascading failures'));
        } else {
          console.log(chalk.red('✗ System failed to recover'));
        }
        
        console.log(chalk.gray(`Response preview: ${content.substring(0, 150)}...`));
        
      } catch (error) {
        console.log(chalk.red(`✗ Complete system failure: ${error.message}`));
      }
      
      console.log(chalk.gray('-'.repeat(60)));
    }
  }

  // Test performance under failure conditions
  async testPerformanceUnderFailure() {
    console.log(chalk.bold.magenta('\n⏱️  Testing Performance Under Failure Conditions\n'));

    const queries = [
      'AAPL?',
      'MSFT price',
      'TSLA stock',
      'NVDA trading at',
      'GOOGL current price'
    ];

    console.log('Sending 5 concurrent requests with simulated Perplexity failures...');

    const startTime = Date.now();
    
    const promises = queries.map((query, index) => 
      axios.post(
        `${this.apiUrl}/api/chat`,
        {
          message: query,
          sessionId: `perf-test-${index}`
        },
        {
          headers: { 'X-Test-Scenario': 'perplexity-timeout' },
          timeout: 30000
        }
      ).catch(error => ({ error: error.message }))
    );

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    const successful = results.filter(r => !r.error).length;
    const avgTimePerRequest = totalTime / queries.length;

    console.log(chalk.green(`\n✓ Completed ${successful}/${queries.length} requests`));
    console.log(chalk.blue(`Total time: ${totalTime}ms`));
    console.log(chalk.blue(`Average time per request: ${avgTimePerRequest.toFixed(0)}ms`));

    if (avgTimePerRequest < 6000) {
      console.log(chalk.green('✓ Performance acceptable under failure conditions'));
    } else {
      console.log(chalk.yellow('⚠ Performance degraded under failure conditions'));
    }
  }
}

// Main execution
async function runFailureTests() {
  const simulator = new PerplexityFailureSimulator();

  try {
    // Check if server supports test scenarios
    console.log(chalk.gray('Note: These tests require server support for X-Test-Scenario headers'));
    console.log(chalk.gray('If server doesn\'t support mock scenarios, tests will use real APIs\n'));

    await simulator.testFailureScenarios();
    await simulator.testCascadingFailures();
    await simulator.testPerformanceUnderFailure();

    console.log(chalk.bold.green('\n✅ Failure simulation tests completed'));
    
  } catch (error) {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runFailureTests();
}

module.exports = PerplexityFailureSimulator;