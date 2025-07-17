/**
 * Comprehensive test checklist for all fixes
 */

const chalk = require('chalk');
const chartGenerator = require('./services/chartGenerator');
const MarketDataService = require('./src/knowledge/market-data-service');
const intelligentResponse = require('./services/intelligentResponse');
const professionalAnalysis = require('./services/professionalAnalysis');

async function runComprehensiveChecklist() {
  console.log(chalk.bold.blue('\n📋 COMPREHENSIVE TESTING CHECKLIST\n'));
  
  const marketDataService = new MarketDataService();
  let totalTests = 0;
  let passedTests = 0;
  
  try {
    // TEST 1: Oil Chart - Should show full 30-day history
    console.log(chalk.bold('\n✓ Test 1: Oil Chart - Full 30-day history'));
    console.log(chalk.gray('─'.repeat(60)));
    
    totalTests++;
    try {
      const oilData = await marketDataService.fetchHistoricalData('CL', 30, '1d', 'commodity');
      console.log(`Data points received: ${oilData.length}`);
      
      if (oilData.length >= 20) { // Allow for weekends/holidays
        console.log(chalk.green('✅ PASS: Oil has sufficient historical data'));
        passedTests++;
        
        // Generate chart to verify
        const chartData = await chartGenerator.fetchRealHistoricalData('CL');
        if (chartData && chartData.prices.length > 0) {
          console.log(chalk.green(`✅ Chart data ready: ${chartData.prices.length} points`));
        }
      } else {
        console.log(chalk.red(`❌ FAIL: Only ${oilData.length} data points (expected ~22-23 for 30 days)`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ ERROR: ${error.message}`));
    }
    
    // TEST 2: Gold vs Silver - Should show comparison chart
    console.log(chalk.bold('\n✓ Test 2: Gold vs Silver Comparison Chart'));
    console.log(chalk.gray('─'.repeat(60)));
    
    totalTests++;
    try {
      const goldData = await chartGenerator.fetchRealHistoricalData('GC');
      const silverData = await chartGenerator.fetchRealHistoricalData('SI');
      
      if (goldData && silverData) {
        const comparisonChart = await chartGenerator.generateComparisonChart(
          ['GC', 'SI'],
          [goldData, silverData]
        );
        
        if (comparisonChart && comparisonChart.imageUrl) {
          console.log(chalk.green('✅ PASS: Comparison chart generated successfully'));
          console.log(`   Chart size: ${comparisonChart.imageUrl.length} bytes`);
          console.log(`   Symbols: ${comparisonChart.symbols.join(' vs ')}`);
          passedTests++;
        } else {
          console.log(chalk.red('❌ FAIL: Comparison chart not generated'));
        }
      } else {
        console.log(chalk.red('❌ FAIL: Unable to fetch gold/silver data'));
      }
    } catch (error) {
      console.log(chalk.red(`❌ ERROR: ${error.message}`));
    }
    
    // TEST 3: All Charts - Consistent line style (no filled areas)
    console.log(chalk.bold('\n✓ Test 3: Chart Style Consistency'));
    console.log(chalk.gray('─'.repeat(60)));
    
    totalTests++;
    try {
      const testAssets = ['BTC', 'AAPL', 'GC'];
      let allConsistent = true;
      
      for (const asset of testAssets) {
        const data = await chartGenerator.fetchRealHistoricalData(asset);
        if (data) {
          const chart = await chartGenerator.generateSmartChart(asset, 'trend', data);
          if (chart && chart.config) {
            const dataset = chart.config.data.datasets[0];
            const hasCorrectStyle = 
              dataset.fill === false && 
              dataset.borderWidth === 2 &&
              dataset.backgroundColor === 'transparent';
            
            if (hasCorrectStyle) {
              console.log(chalk.green(`✅ ${asset}: Correct line style`));
            } else {
              console.log(chalk.red(`❌ ${asset}: Incorrect style`));
              allConsistent = false;
            }
          }
        }
      }
      
      if (allConsistent) {
        console.log(chalk.green('✅ PASS: All charts have consistent line style'));
        passedTests++;
      } else {
        console.log(chalk.red('❌ FAIL: Chart styles are inconsistent'));
      }
    } catch (error) {
      console.log(chalk.red(`❌ ERROR: ${error.message}`));
    }
    
    // TEST 4: Text Responses - Rich, educational content
    console.log(chalk.bold('\n✓ Test 4: Enhanced Text Responses'));
    console.log(chalk.gray('─'.repeat(60)));
    
    totalTests++;
    try {
      const btcData = {
        symbol: 'BTC',
        price: 117500,
        changePercent: 2.5,
        volume: 28000000000
      };
      
      const analysis = professionalAnalysis.generateCryptoAnalysis('BTC', btcData);
      const charCount = analysis.length;
      const hasDirection = analysis.includes('Direction:');
      const hasWhatThisMeans = analysis.includes('What This Means:');
      const hasExplanations = analysis.includes('where buyers typically step in');
      
      console.log(`Character count: ${charCount}`);
      console.log(`Has direction: ${hasDirection ? 'Yes' : 'No'}`);
      console.log(`Has "What This Means": ${hasWhatThisMeans ? 'Yes' : 'No'}`);
      console.log(`Has explanations: ${hasExplanations ? 'Yes' : 'No'}`);
      
      if (charCount > 800 && hasDirection && hasWhatThisMeans && hasExplanations) {
        console.log(chalk.green('✅ PASS: Text responses are rich and educational'));
        passedTests++;
      } else {
        console.log(chalk.red('❌ FAIL: Text responses missing enhancements'));
      }
    } catch (error) {
      console.log(chalk.red(`❌ ERROR: ${error.message}`));
    }
    
    // TEST 5: Data Integrity - All charts show complete, real data
    console.log(chalk.bold('\n✓ Test 5: Data Integrity Check'));
    console.log(chalk.gray('─'.repeat(60)));
    
    totalTests++;
    try {
      const integrityChecks = [
        { symbol: 'BTC', type: 'crypto', minPrice: 80000, maxPrice: 150000 },
        { symbol: 'GC', type: 'commodity', minPrice: 2500, maxPrice: 4000 },
        { symbol: 'AAPL', type: 'stock', minPrice: 150, maxPrice: 250 }
      ];
      
      let allValid = true;
      
      for (const check of integrityChecks) {
        const data = await chartGenerator.fetchRealHistoricalData(check.symbol);
        if (data && data.prices) {
          const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
          const validPrice = avgPrice >= check.minPrice && avgPrice <= check.maxPrice;
          
          if (validPrice) {
            console.log(chalk.green(`✅ ${check.symbol}: Price data is realistic ($${avgPrice.toFixed(2)})`));
          } else {
            console.log(chalk.red(`❌ ${check.symbol}: Price out of range ($${avgPrice.toFixed(2)})`));
            allValid = false;
          }
          
          // Check for missing data
          const invalidPrices = data.prices.filter(p => !p || isNaN(p) || p <= 0);
          if (invalidPrices.length > 0) {
            console.log(chalk.red(`   WARNING: ${invalidPrices.length} invalid prices found`));
            allValid = false;
          }
        } else {
          console.log(chalk.red(`❌ ${check.symbol}: No data available`));
          allValid = false;
        }
      }
      
      if (allValid) {
        console.log(chalk.green('✅ PASS: All data integrity checks passed'));
        passedTests++;
      } else {
        console.log(chalk.red('❌ FAIL: Data integrity issues detected'));
      }
    } catch (error) {
      console.log(chalk.red(`❌ ERROR: ${error.message}`));
    }
    
    // SUMMARY
    console.log(chalk.bold.blue('\n\n📊 TEST SUMMARY\n'));
    console.log(chalk.gray('═'.repeat(60)));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${chalk.green(passedTests)}`);
    console.log(`Failed: ${chalk.red(totalTests - passedTests)}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(0)}%`);
    
    if (passedTests === totalTests) {
      console.log(chalk.bold.green('\n✅ ALL TESTS PASSED! System is working correctly.'));
    } else {
      console.log(chalk.bold.red(`\n❌ ${totalTests - passedTests} tests failed. Review the logs above.`));
    }
    
  } finally {
    // Cleanup
    marketDataService.cleanup();
  }
}

// Run the comprehensive test
console.log(chalk.yellow('Running comprehensive system test...'));
runComprehensiveChecklist().then(() => {
  console.log(chalk.gray('\n═══════════════════════════════════════════════════════════\n'));
  process.exit(0);
}).catch(error => {
  console.error(chalk.red('Test suite failed:'), error);
  process.exit(1);
});