const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class OvernightTestRunner {
  constructor() {
    this.logFile = `test-run-${new Date().toISOString().replace(/:/g, '-')}.log`;
    this.startTime = Date.now();
    this.testResults = [];
  }

  async runTestSuite() {
    console.log('🌙 Starting overnight test suite...');
    this.log('🌙 Starting overnight test suite...');
    
    const tests = [
      {
        name: 'SafeSymbol Unit Tests',
        command: 'npm test -- src/tests/safeSymbol.test.js',
        critical: true
      },
      {
        name: 'Full System E2E Tests',
        command: 'npm test -- test/e2e/fullSystem.test.js',
        critical: true
      },
      {
        name: 'API Integration Tests',
        command: 'npm run test:api',
        critical: false
      },
      {
        name: 'Chat System Tests',
        command: 'npm run test:chat',
        critical: false
      },
      {
        name: 'Market Data Service Tests',
        command: 'npm test -- src/tests/market-data-service.test.js',
        critical: false
      },
      {
        name: 'Intent Classifier Tests',
        command: 'npm test -- src/tests/intent-classifier.test.js',
        critical: false
      },
      {
        name: 'Response Filter Tests',
        command: 'npm test -- src/tests/response-filter.test.js',
        critical: false
      }
    ];
    
    let criticalFailures = 0;
    let totalFailures = 0;
    
    for (const test of tests) {
      console.log(`\n📋 Running: ${test.name}`);
      this.log(`\n📋 Running: ${test.name}`);
      
      const result = await this.runTest(test);
      this.testResults.push(result);
      
      if (!result.passed) {
        totalFailures++;
        if (test.critical) {
          criticalFailures++;
        }
      }
      
      // Wait 5 seconds between tests
      await this.sleep(5000);
    }
    
    const duration = ((Date.now() - this.startTime) / 1000 / 60).toFixed(2);
    const summary = this.generateSummary(criticalFailures, totalFailures, duration);
    
    console.log(summary);
    this.log(summary);
    
    return {
      criticalFailures,
      totalFailures,
      duration,
      results: this.testResults
    };
  }

  async runTest(test) {
    const testStartTime = Date.now();
    
    return new Promise((resolve) => {
      exec(test.command, { timeout: 120000 }, (error, stdout, stderr) => {
        const testDuration = ((Date.now() - testStartTime) / 1000).toFixed(2);
        
        const result = {
          name: test.name,
          command: test.command,
          passed: !error,
          duration: testDuration,
          stdout,
          stderr,
          error: error?.message,
          timestamp: new Date().toISOString()
        };
        
        const logEntry = `
=== ${test.name} ===
Command: ${test.command}
Duration: ${testDuration}s
Result: ${result.passed ? 'PASSED' : 'FAILED'}
Time: ${result.timestamp}

STDOUT:
${stdout}

STDERR:
${stderr}

${error ? `ERROR: ${error.message}` : ''}
================
`;
        
        this.log(logEntry);
        
        if (result.passed) {
          console.log(`✅ ${test.name} passed (${testDuration}s)`);
        } else {
          console.error(`❌ ${test.name} failed (${testDuration}s)`);
          console.error(`   Error: ${error?.message || 'Unknown error'}`);
        }
        
        resolve(result);
      });
    });
  }

  generateSummary(criticalFailures, totalFailures, duration) {
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    return `
✨ Test Suite Summary
=====================
Total Tests: ${total}
Passed: ${passed}
Failed: ${totalFailures}
Critical Failures: ${criticalFailures}
Duration: ${duration} minutes
Log File: ${this.logFile}

${criticalFailures === 0 ? '🎉 All critical tests passed!' : '⚠️  Critical failures detected!'}
${totalFailures === 0 ? '🎉 All tests passed!' : `⚠️  ${totalFailures} test(s) failed`}
`;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    try {
      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run continuously
async function runContinuously() {
  while (true) {
    const runner = new OvernightTestRunner();
    const results = await runner.runTestSuite();
    
    // If critical failures, alert more frequently
    const waitTime = results.criticalFailures > 0 ? 10 : 30;
    
    console.log(`\n⏰ Waiting ${waitTime} minutes before next run...\n`);
    await new Promise(resolve => setTimeout(resolve, waitTime * 60 * 1000));
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test runner...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down test runner...');
  process.exit(0);
});

// Start the overnight runner
if (require.main === module) {
  runContinuously().catch(console.error);
}

module.exports = OvernightTestRunner;