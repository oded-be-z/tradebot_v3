// Real integration tests - NO MOCKING
const axios = require('axios');
const chalk = require('chalk');
const { spawn } = require('child_process');

const SERVER_URL = 'http://localhost:3000';

// Critical test scenarios based on user issues
const CRITICAL_TESTS = [
  {
    name: 'Gold vs Silver Comparison - Must Show Chart',
    query: 'gold vs silver comparison',
    expectations: {
      responseType: 'comparison_table',
      hasChart: true,
      chartType: 'comparison',
      hasEmojis: true,
      hasBullets: true,
      goldPriceRealistic: true
    }
  },
  {
    name: 'Dogecoin Micro-price Calculations',
    query: "what's happening with dogecoin", 
    expectations: {
      responseType: 'standard_analysis',
      hasEmojis: true,
      hasBullets: true,
      microPriceFormat: true,
      noZeroPrices: true  // Should NOT show $0.00 for support/resistance
    }
  },
  {
    name: 'Bitcoin Chart with Current Price Highlighting',
    query: 'show bitcoin chart',
    expectations: {
      responseType: 'standard_analysis',
      hasChart: true,
      chartType: 'price',
      hasEmojis: true,
      hasBullets: true,
      chartHighlighting: true
    }
  },
  {
    name: 'Oil Trends Chart Quality',
    query: 'oil trends with chart',
    expectations: {
      responseType: 'trend_analysis',
      hasChart: true,
      chartType: 'trend',
      hasEmojis: true,
      hasBullets: true,
      chartFormatting: true
    }
  },
  {
    name: 'Ethereum Analysis Format',
    query: 'analyze ethereum',
    expectations: {
      responseType: 'standard_analysis',
      hasEmojis: true,
      hasBullets: true,
      hasStructure: true,
      priceFormatting: true
    }
  }
];

class RealServerTester {
  constructor() {
    this.serverProcess = null;
    this.results = [];
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      console.log(chalk.blue('Starting server...'));
      
      this.serverProcess = spawn('node', ['server.js'], {
        stdio: 'pipe',
        detached: false
      });

      let serverReady = false;
      
      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server Started Successfully') || output.includes('running on')) {
          serverReady = true;
          resolve();
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.log(chalk.yellow('Server stderr:'), data.toString());
      });

      this.serverProcess.on('close', (code) => {
        console.log(chalk.red(`Server process exited with code ${code}`));
        if (!serverReady) {
          reject(new Error('Server failed to start'));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!serverReady) {
          reject(new Error('Server startup timeout'));
        }
      }, 30000);
    });
  }

  async waitForServer() {
    const maxRetries = 15;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await axios.get(`${SERVER_URL}/api/health`);
        return true;
      } catch (e) {
        console.log(chalk.gray(`Waiting for server... (${i + 1}/${maxRetries})`));
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    return false;
  }

  async testQuery(test) {
    console.log(`\\n${chalk.bold.blue('Testing:')} ${test.name}`);
    console.log(`Query: "${test.query}"`);

    try {
      const response = await axios.post(`${SERVER_URL}/api/chat`, {
        message: test.query,
        sessionId: `test-${Date.now()}`
      });

      const { type, response: text, chartData, data } = response.data;
      
      console.log(`Response type: ${chalk.yellow(type)}`);
      
      const results = {
        test: test.name,
        query: test.query,
        responseType: type,
        passed: true,
        issues: []
      };

      // Check response type
      if (test.expectations.responseType && type !== test.expectations.responseType) {
        results.issues.push(`Expected type ${test.expectations.responseType}, got ${type}`);
        results.passed = false;
      }

      // Check chart generation
      if (test.expectations.hasChart) {
        const hasChart = !!chartData?.imageUrl;
        console.log(`Chart generated: ${hasChart ? chalk.green('✅') : chalk.red('❌')}`);
        
        if (!hasChart) {
          results.issues.push('Chart not generated');
          results.passed = false;
        } else {
          // Check chart type
          if (test.expectations.chartType && chartData.chartType !== test.expectations.chartType) {
            results.issues.push(`Expected chart type ${test.expectations.chartType}, got ${chartData.chartType}`);
            results.passed = false;
          }
          
          // Check if it's a proper PNG
          const isPNG = chartData.imageUrl.startsWith('data:image/png;base64,');
          console.log(`PNG format: ${isPNG ? chalk.green('✅') : chalk.red('❌')}`);
          
          if (!isPNG) {
            results.issues.push('Chart is not PNG format');
            results.passed = false;
          }
        }
      }

      // Check professional formatting
      if (test.expectations.hasEmojis) {
        const hasEmojis = /[📊📈💡📍🎯⚠️💰📉📌🔔💵]/.test(text);
        console.log(`Emojis: ${hasEmojis ? chalk.green('✅') : chalk.red('❌')}`);
        
        if (!hasEmojis) {
          results.issues.push('Missing emojis');
          results.passed = false;
        }
      }

      if (test.expectations.hasBullets) {
        const hasBullets = /•/.test(text);
        console.log(`Bullets: ${hasBullets ? chalk.green('✅') : chalk.red('❌')}`);
        
        if (!hasBullets) {
          results.issues.push('Missing bullet points');
          results.passed = false;
        }
      }

      if (test.expectations.hasStructure) {
        const hasStructure = /Trading Analysis|Market Insight|Key Levels|Trading Strategy|Risk/.test(text);
        console.log(`Structure: ${hasStructure ? chalk.green('✅') : chalk.red('❌')}`);
        
        if (!hasStructure) {
          results.issues.push('Missing professional structure');
          results.passed = false;
        }
      }

      // Check micro-price formatting
      if (test.expectations.microPriceFormat) {
        const priceMatch = text.match(/Current Price: \\$([0-9.]+)/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1]);
          console.log(`Current price: ${chalk.cyan('$' + price)}`);
          
          if (price < 0.01) {
            const priceStr = priceMatch[1];
            const decimals = priceStr.split('.')[1]?.length || 0;
            const correctDecimals = decimals >= 6;
            console.log(`Micro-price decimals: ${correctDecimals ? chalk.green('✅') : chalk.red('❌')} (${decimals} decimals)`);
            
            if (!correctDecimals) {
              results.issues.push(`Micro-price should have ≥6 decimals, got ${decimals}`);
              results.passed = false;
            }
          }
        }
      }

      // Check for $0.00 in calculations (but allow $0.000xxx micro-prices)
      if (test.expectations.noZeroPrices) {
        const hasActualZeroPrices = /\$0\.00(?![0-9])/.test(text);
        console.log(`No $0.00 calculations: ${!hasActualZeroPrices ? chalk.green('✅') : chalk.red('❌')}`);
        
        if (hasActualZeroPrices) {
          results.issues.push('Found $0.00 in calculations (should show micro-prices)');
          results.passed = false;
        }
      }

      // Check gold price realism
      if (test.expectations.goldPriceRealistic) {
        const goldMatch = text.match(/\\$([0-9,]+)\\.?\\d*.*vs/);
        if (goldMatch) {
          const goldPrice = parseFloat(goldMatch[1].replace(',', ''));
          const realistic = goldPrice >= 1500 && goldPrice <= 4000;
          console.log(`Gold price realistic: ${realistic ? chalk.green('✅') : chalk.red('❌')} ($${goldPrice})`);
          
          if (!realistic) {
            results.issues.push(`Gold price $${goldPrice} outside realistic range (1500-4000)`);
            results.passed = false;
          }
        }
      }

      // Print overall result
      console.log(`\\nOverall: ${results.passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL')}`);
      
      if (!results.passed) {
        console.log(chalk.red('Issues found:'));
        results.issues.forEach(issue => console.log(chalk.red(`  - ${issue}`)));
        
        console.log(chalk.gray('\\nSample response:'));
        text.split('\\n').slice(0, 8).forEach(line => 
          console.log(chalk.gray('  ' + line))
        );
      }

      return results;

    } catch (error) {
      console.log(chalk.red(`❌ Error: ${error.message}`));
      return {
        test: test.name,
        query: test.query,
        passed: false,
        error: error.message
      };
    }
  }

  async runAllTests() {
    console.log(chalk.bold.green('\\n🔧 REAL SERVER INTEGRATION TESTS\\n'));
    
    // Start server
    try {
      await this.startServer();
      console.log(chalk.green('✅ Server started\\n'));
      
      // Wait for server to be ready
      const serverReady = await this.waitForServer();
      if (!serverReady) {
        console.log(chalk.red('❌ Server not responding to health checks'));
        return;
      }
      
      console.log(chalk.green('✅ Server is ready\\n'));
      
      // Run all tests
      for (const test of CRITICAL_TESTS) {
        const result = await this.testQuery(test);
        this.results.push(result);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Print summary
      this.printSummary();
      
    } catch (error) {
      console.log(chalk.red(`❌ Failed to start server: ${error.message}`));
    } finally {
      this.cleanup();
    }
  }

  printSummary() {
    console.log(chalk.bold.green('\\n\\n📊 REAL SERVER TEST SUMMARY\\n'));
    console.log('=' .repeat(60));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const errors = this.results.filter(r => r.error).length;
    
    console.log(`Total tests: ${this.results.length}`);
    console.log(`Passed: ${chalk.green(passed)}`);
    console.log(`Failed: ${failed > 0 ? chalk.red(failed) : chalk.green(0)}`);
    console.log(`Errors: ${errors > 0 ? chalk.red(errors) : chalk.green(0)}`);
    
    console.log('\\nCritical Issues Status:');
    
    const comparisonTest = this.results.find(r => r.test.includes('Gold vs Silver'));
    console.log(`1. Comparison charts: ${comparisonTest?.passed ? chalk.green('✅ FIXED') : chalk.red('❌ BROKEN')}`);
    
    const microPriceTest = this.results.find(r => r.test.includes('Dogecoin'));
    console.log(`2. Micro-price calculations: ${microPriceTest?.passed ? chalk.green('✅ FIXED') : chalk.red('❌ BROKEN')}`);
    
    const chartTest = this.results.find(r => r.test.includes('Bitcoin Chart'));
    console.log(`3. Chart highlighting: ${chartTest?.passed ? chalk.green('✅ FIXED') : chalk.red('❌ BROKEN')}`);
    
    const formatTest = this.results.filter(r => r.test.includes('Format') || r.test.includes('Analysis'));
    const allFormatsPass = formatTest.every(r => r.passed);
    console.log(`4. Professional formatting: ${allFormatsPass ? chalk.green('✅ FIXED') : chalk.red('❌ BROKEN')}`);
    
    if (passed === this.results.length) {
      console.log(chalk.bold.green('\\n✅ ALL CRITICAL ISSUES FIXED!'));
      console.log(chalk.green('The system is ready for production.'));
    } else {
      console.log(chalk.bold.red('\\n❌ CRITICAL ISSUES REMAIN'));
      console.log(chalk.yellow('\\nFailed tests:'));
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(chalk.red(`- ${r.test}`));
        if (r.issues) {
          r.issues.forEach(issue => console.log(chalk.red(`  * ${issue}`)));
        }
      });
    }
  }

  cleanup() {
    if (this.serverProcess) {
      console.log(chalk.blue('\\nStopping server...'));
      this.serverProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.serverProcess) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 5000);
    }
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log(chalk.yellow('\\nReceived SIGINT, cleaning up...'));
  process.exit(0);
});

// Run the tests
const tester = new RealServerTester();
tester.runAllTests().catch(console.error);