/**
 * Test to verify charts fetch and display REAL historical data
 */

const chalk = require('chalk');
const chartGenerator = require('./services/chartGenerator');

console.log(chalk.bold.blue('\n🔍 TESTING REAL HISTORICAL DATA FETCHING\n'));

async function testRealDataFetching() {
  try {
    // Test 1: Fetch Bitcoin historical data
    console.log(chalk.bold('Test 1: Fetching Bitcoin (BTC) historical data'));
    const btcData = await chartGenerator.fetchRealHistoricalData('BTC');
    
    if (btcData && btcData.prices && btcData.prices.length > 0) {
      console.log(chalk.green(`✅ Successfully fetched ${btcData.prices.length} days of BTC data`));
      console.log(chalk.gray(`   Current price: $${btcData.currentPrice.toFixed(2)}`));
      console.log(chalk.gray(`   Price range: $${Math.min(...btcData.prices).toFixed(2)} - $${Math.max(...btcData.prices).toFixed(2)}`));
      
      // Verify the price is in realistic range for Bitcoin
      const currentPrice = btcData.currentPrice;
      if (currentPrice > 80000 && currentPrice < 120000) {
        console.log(chalk.green(`✅ Bitcoin price ($${currentPrice.toFixed(2)}) is in realistic range`));
      } else {
        console.log(chalk.red(`❌ Bitcoin price ($${currentPrice.toFixed(2)}) seems unrealistic`));
      }
    } else {
      console.log(chalk.red('❌ Failed to fetch Bitcoin data'));
    }

    // Test 2: Fetch Apple stock historical data
    console.log(chalk.bold('\nTest 2: Fetching Apple (AAPL) historical data'));
    const aaplData = await chartGenerator.fetchRealHistoricalData('AAPL');
    
    if (aaplData && aaplData.prices && aaplData.prices.length > 0) {
      console.log(chalk.green(`✅ Successfully fetched ${aaplData.prices.length} days of AAPL data`));
      console.log(chalk.gray(`   Current price: $${aaplData.currentPrice.toFixed(2)}`));
      console.log(chalk.gray(`   Price range: $${Math.min(...aaplData.prices).toFixed(2)} - $${Math.max(...aaplData.prices).toFixed(2)}`));
    } else {
      console.log(chalk.red('❌ Failed to fetch Apple data'));
    }

    // Test 3: Fetch Gold commodity historical data
    console.log(chalk.bold('\nTest 3: Fetching Gold (GC) historical data'));
    const goldData = await chartGenerator.fetchRealHistoricalData('GC');
    
    if (goldData && goldData.prices && goldData.prices.length > 0) {
      console.log(chalk.green(`✅ Successfully fetched ${goldData.prices.length} days of Gold data`));
      console.log(chalk.gray(`   Current price: $${goldData.currentPrice.toFixed(2)}`));
      console.log(chalk.gray(`   Price range: $${Math.min(...goldData.prices).toFixed(2)} - $${Math.max(...goldData.prices).toFixed(2)}`));
    } else {
      console.log(chalk.red('❌ Failed to fetch Gold data'));
    }

    // Test 4: Generate a real chart with fetched data
    console.log(chalk.bold('\nTest 4: Generating a real chart with Bitcoin data'));
    const btcChart = await chartGenerator.generateSmartChart('BTC', 'trend');
    
    if (btcChart && btcChart.imageUrl) {
      console.log(chalk.green('✅ Successfully generated Bitcoin trend chart'));
      console.log(chalk.gray(`   Chart type: ${btcChart.chartType}`));
      console.log(chalk.gray(`   Current price in chart: $${btcChart.currentPrice}`));
      console.log(chalk.gray(`   Image data size: ${btcChart.imageUrl.length} bytes`));
    } else {
      console.log(chalk.red('❌ Failed to generate Bitcoin chart'));
    }

    // Test 5: Verify no mock data in the system
    console.log(chalk.bold('\nTest 5: Checking for any mock data references'));
    const fs = require('fs');
    const servicesDir = fs.readdirSync('./services');
    let mockReferences = 0;
    
    servicesDir.forEach(file => {
      if (file.endsWith('.js')) {
        const content = fs.readFileSync(`./services/${file}`, 'utf8');
        if (content.includes('MockDataGenerator') || content.includes('generateMockData')) {
          console.log(chalk.red(`❌ Found mock reference in ${file}`));
          mockReferences++;
        }
      }
    });
    
    if (mockReferences === 0) {
      console.log(chalk.green('✅ No mock data references found in any service files'));
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Test failed with error:'), error.message);
  }
}

// Run the tests
testRealDataFetching().then(() => {
  console.log(chalk.gray('\n═══════════════════════════════════════════════════════════\n'));
});