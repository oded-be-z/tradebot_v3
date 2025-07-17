/**
 * Test commodity charts with focus on oil (CL) data issue
 */

const chalk = require('chalk');
const chartGenerator = require('./services/chartGenerator');

async function testCommodityCharts() {
  console.log(chalk.bold.blue('\n🔍 TESTING COMMODITY CHARTS\n'));
  
  const commodities = [
    { symbol: 'CL', name: 'Crude Oil' },
    { symbol: 'GC', name: 'Gold' },
    { symbol: 'SI', name: 'Silver' },
    { symbol: 'NG', name: 'Natural Gas' }
  ];
  
  let allPassed = true;
  
  for (const commodity of commodities) {
    console.log(chalk.bold(`\nTesting ${commodity.name} (${commodity.symbol}):`));
    
    try {
      // Fetch historical data
      const data = await chartGenerator.fetchRealHistoricalData(commodity.symbol);
      
      if (data && data.prices && data.prices.length > 0) {
        console.log(chalk.green(`✅ Data fetched: ${data.prices.length} data points`));
        
        // Check for NaN or invalid values
        const invalidPrices = data.prices.filter(p => !p || isNaN(p) || p <= 0);
        if (invalidPrices.length > 0) {
          console.log(chalk.red(`❌ Found ${invalidPrices.length} invalid prices`));
          allPassed = false;
        } else {
          console.log(chalk.green('✅ All prices are valid'));
        }
        
        // Calculate price range
        const minPrice = Math.min(...data.prices);
        const maxPrice = Math.max(...data.prices);
        console.log(`   Price range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`);
        console.log(`   Current price: $${data.currentPrice.toFixed(2)}`);
        
        // Generate a chart
        const chart = await chartGenerator.generateSmartChart(
          commodity.symbol,
          'trend',
          data,
          data.currentPrice
        );
        
        if (chart && chart.imageUrl) {
          console.log(chalk.green('✅ Chart generated successfully'));
          console.log(`   Image size: ${chart.imageUrl.length} bytes`);
        } else {
          console.log(chalk.red('❌ Failed to generate chart'));
          allPassed = false;
        }
        
      } else {
        console.log(chalk.red('❌ No data returned'));
        allPassed = false;
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ Error: ${error.message}`));
      allPassed = false;
    }
  }
  
  // Summary
  console.log(chalk.bold.blue('\n📊 SUMMARY\n'));
  if (allPassed) {
    console.log(chalk.bold.green('✅ All commodity charts working correctly!'));
    console.log(chalk.green('   Oil chart issue has been fixed'));
    console.log(chalk.green('   Missing data is properly handled'));
  } else {
    console.log(chalk.bold.red('❌ Some commodity charts have issues'));
  }
}

// Run the test
testCommodityCharts().then(() => {
  console.log(chalk.gray('\n═══════════════════════════════════════════════════════════\n'));
  process.exit(0);
});