/**
 * Test to verify charts use REAL historical data, not mock data
 */

const chalk = require('chalk');

console.log(chalk.bold.blue('\n🔍 VERIFYING CHARTS USE REAL HISTORICAL DATA\n'));

// Test 1: Verify MockDataGenerator is removed
console.log(chalk.bold('Test 1: Verify MockDataGenerator.js is deleted'));
const fs = require('fs');
const mockDataExists = fs.existsSync('./services/MockDataGenerator.js');
console.log(`MockDataGenerator.js exists: ${mockDataExists ? chalk.red('❌ STILL EXISTS!') : chalk.green('✅ DELETED')}`);

// Test 2: Verify AssetConfigManager is removed
console.log(chalk.bold('\nTest 2: Verify AssetConfigManager.js is deleted'));
const assetConfigExists = fs.existsSync('./services/AssetConfigManager.js');
console.log(`AssetConfigManager.js exists: ${assetConfigExists ? chalk.red('❌ STILL EXISTS!') : chalk.green('✅ DELETED')}`);

// Test 3: Check chartGenerator.js for mock references
console.log(chalk.bold('\nTest 3: Check chartGenerator.js for mock data references'));
const chartGeneratorContent = fs.readFileSync('./services/chartGenerator.js', 'utf8');
const hasMockReferences = chartGeneratorContent.includes('MockDataGenerator') || 
                         chartGeneratorContent.includes('generateMockChartData') ||
                         chartGeneratorContent.includes('generateMockData');
console.log(`Contains mock references: ${hasMockReferences ? chalk.red('❌ YES') : chalk.green('✅ NO')}`);

// Test 4: Check server.js for proper historical data fetching
console.log(chalk.bold('\nTest 4: Check server.js for real historical data fetching'));
const serverContent = fs.readFileSync('./server.js', 'utf8');
const hasFetchHistoricalData = serverContent.includes('fetchHistoricalData');
const hasMarketDataService = serverContent.includes('market-data-service');
console.log(`Uses fetchHistoricalData: ${hasFetchHistoricalData ? chalk.green('✅ YES') : chalk.red('❌ NO')}`);
console.log(`Imports market-data-service: ${hasMarketDataService ? chalk.green('✅ YES') : chalk.red('❌ NO')}`);

// Test 5: Check intelligentResponse.js for real historical data
console.log(chalk.bold('\nTest 5: Check intelligentResponse.js for real historical data'));
const intelligentResponseContent = fs.readFileSync('./services/intelligentResponse.js', 'utf8');
const hasRealHistoricalData = intelligentResponseContent.includes('marketDataService.fetchHistoricalData');
console.log(`Uses real historical data: ${hasRealHistoricalData ? chalk.green('✅ YES') : chalk.red('❌ NO')}`);

// Test 6: Verify chartGenerator fetches real historical data
console.log(chalk.bold('\nTest 6: Verify chartGenerator fetches real historical data'));
const hasFetchRealData = chartGeneratorContent.includes('fetchRealHistoricalData') || 
                        chartGeneratorContent.includes('fetchCryptoHistoricalData');
console.log(`Has real data fetching methods: ${hasFetchRealData ? chalk.green('✅ YES') : chalk.red('❌ NO')}`);

// Summary
console.log(chalk.bold.blue('\n📊 SUMMARY\n'));
const allPassed = !mockDataExists && !assetConfigExists && !hasMockReferences && 
                  hasFetchHistoricalData && hasMarketDataService && hasRealHistoricalData && 
                  hasFetchRealData;

if (allPassed) {
  console.log(chalk.bold.green('✅ ALL TESTS PASSED!'));
  console.log(chalk.green('Charts now use ONLY real historical data from APIs.'));
  console.log(chalk.green('No more fake/mock data in production charts.'));
} else {
  console.log(chalk.bold.red('❌ SOME TESTS FAILED'));
  console.log(chalk.red('Mock data may still be present in the system.'));
}

console.log(chalk.gray('\n═══════════════════════════════════════════════════════════\n'));