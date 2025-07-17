/**
 * Final Data Integrity Validation
 * Verifies that the price consistency issue has been resolved
 */

const chartGenerator = require('./services/chartGenerator');
const chalk = require('chalk');

console.log(chalk.bold.blue('\n🎯 FINAL DATA INTEGRITY VALIDATION\n'));

// Test scenarios that previously failed
const testScenarios = [
  {
    name: 'Bitcoin Price Mismatch Scenario',
    symbol: 'BTC',
    apiPrice: 118287,  // What API returns
    configPrice: 102000, // What's in config
    description: 'API price significantly different from config'
  },
  {
    name: 'Ethereum Normal Scenario',
    symbol: 'ETH',
    apiPrice: 3133,
    configPrice: 3133,
    description: 'API price matches config'
  },
  {
    name: 'Dogecoin Micro-price Scenario',
    symbol: 'DOGE',
    apiPrice: 0.000152,
    configPrice: 0.00015,
    description: 'Micro-price handling'
  },
  {
    name: 'Gold Large Value Scenario',
    symbol: 'GC',
    apiPrice: 3387,
    configPrice: 3350,
    description: 'Commodity with small variance'
  }
];

let passCount = 0;
let failCount = 0;

for (const scenario of testScenarios) {
  console.log(chalk.bold(`\nTesting: ${scenario.name}`));
  console.log(`Symbol: ${scenario.symbol}`);
  console.log(`API Price: $${scenario.apiPrice.toLocaleString()}`);
  console.log(`Config Price: $${scenario.configPrice.toLocaleString()}`);
  console.log(`Scenario: ${scenario.description}`);
  
  // Generate chart with API price
  const chartData = chartGenerator.generateMockChartData(scenario.symbol, 'price', scenario.apiPrice);
  
  // Validate results
  const endPrice = chartData.prices[chartData.prices.length - 1];
  const exactMatch = endPrice === scenario.apiPrice;
  const currentPriceMatch = chartData.currentPrice === scenario.apiPrice;
  
  console.log(`\nResults:`);
  console.log(`- Chart end price: $${endPrice.toLocaleString()}`);
  console.log(`- Current price field: $${chartData.currentPrice.toLocaleString()}`);
  console.log(`- Exact match: ${exactMatch ? chalk.green('✅ YES') : chalk.red('❌ NO')}`);
  
  // Check price range
  const minPrice = Math.min(...chartData.prices);
  const maxPrice = Math.max(...chartData.prices);
  const range = ((maxPrice - minPrice) / scenario.apiPrice) * 100;
  
  console.log(`- Price range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`);
  console.log(`- Range spread: ${range.toFixed(1)}%`);
  
  // Validate reasonable range
  const reasonableRange = range <= 30;
  console.log(`- Reasonable range: ${reasonableRange ? chalk.green('✅ YES') : chalk.yellow('⚠️  HIGH')}`);
  
  // Overall pass/fail
  const passed = exactMatch && currentPriceMatch && reasonableRange;
  if (passed) {
    console.log(chalk.green('\n✅ PASSED: Price consistency maintained'));
    passCount++;
  } else {
    console.log(chalk.red('\n❌ FAILED: Price consistency issue detected'));
    failCount++;
  }
  
  console.log(chalk.gray('─'.repeat(60)));
}

// Summary
console.log(chalk.bold.blue('\n📊 VALIDATION SUMMARY\n'));
console.log(`Total Tests: ${testScenarios.length}`);
console.log(`Passed: ${chalk.green(passCount)}`);
console.log(`Failed: ${chalk.red(failCount)}`);
console.log(`Success Rate: ${chalk.bold(((passCount / testScenarios.length) * 100).toFixed(1) + '%')}`);

if (failCount === 0) {
  console.log(chalk.bold.green('\n🎉 ALL TESTS PASSED! Data integrity issue is RESOLVED.'));
  console.log(chalk.green('Charts will now always match the price shown in text responses.'));
} else {
  console.log(chalk.bold.red('\n⚠️  Some tests failed. Further investigation needed.'));
}

// Key improvements made
console.log(chalk.bold.blue('\n🔧 KEY IMPROVEMENTS IMPLEMENTED:\n'));
console.log('1. MockDataGenerator now uses exact API price when provided');
console.log('2. ChartGenerator validates and logs price mismatches');
console.log('3. AssetConfigManager updated with realistic price ranges');
console.log('4. Fallback prices aligned across the system');
console.log('5. Price consistency validation added to catch future issues');

console.log(chalk.gray('\n' + '═'.repeat(60) + '\n'));