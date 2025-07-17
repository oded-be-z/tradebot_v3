/**
 * Direct test of comparison chart generation
 */

const chalk = require('chalk');
const intelligentResponse = require('./services/intelligentResponse');
const chartGenerator = require('./services/chartGenerator');
const MarketDataService = require('./src/knowledge/market-data-service');

async function testComparisonDirect() {
  console.log(chalk.bold.blue('\n🔍 DIRECT TEST: COMPARISON CHARTS\n'));
  const marketDataService = new MarketDataService();
  
  try {
    // Test 1: Gold vs Silver
    console.log(chalk.bold('Test 1: Gold vs Silver Comparison'));
    
    // Generate comparison response
    const response = await intelligentResponse.generateComparison('gold vs silver', {});
    console.log(`Response type: ${response.type}`);
    console.log(`Symbols: ${response.symbols.join(' vs ')}`);
    console.log(`Needs chart: ${response.needsChart}`);
    
    if (response.needsChart && response.symbols) {
      // Fetch historical data
      console.log('\nFetching historical data...');
      const historicalDataPromises = response.symbols.map(symbol => 
        marketDataService.fetchHistoricalData(symbol, 30)
      );
      
      const historicalDataArrays = await Promise.all(historicalDataPromises);
      
      // Check data quality
      historicalDataArrays.forEach((data, index) => {
        console.log(`${response.symbols[index]}: ${data.length} data points`);
      });
      
      if (historicalDataArrays.every(data => data && data.length > 0)) {
        // Format data for chart generator
        const dataArray = historicalDataArrays.map((data, index) => ({
          symbol: response.symbols[index],
          dates: data.map(d => d.date),
          prices: data.map(d => d.close || d.price),
          currentPrice: response.comparisonData[index].price
        }));
        
        // Generate chart
        console.log('\nGenerating comparison chart...');
        const chartData = await chartGenerator.generateComparisonChart(
          response.symbols,
          dataArray
        );
        
        if (chartData && chartData.imageUrl) {
          console.log(chalk.green('✅ Comparison chart generated successfully!'));
          console.log(`   Chart type: ${chartData.chartType}`);
          console.log(`   Symbols: ${chartData.symbols.join(' vs ')}`);
          console.log(`   Image size: ${chartData.imageUrl.length} bytes`);
        } else {
          console.log(chalk.red('❌ Failed to generate chart'));
        }
      } else {
        console.log(chalk.red('❌ Missing historical data'));
      }
    }
    
    // Test 2: Bitcoin vs Ethereum
    console.log(chalk.bold('\n\nTest 2: Bitcoin vs Ethereum Comparison'));
    
    const btcEthResponse = await intelligentResponse.generateComparison('bitcoin vs ethereum', {});
    console.log(`Response type: ${btcEthResponse.type}`);
    console.log(`Symbols: ${btcEthResponse.symbols.join(' vs ')}`);
    
    if (btcEthResponse.needsChart) {
      // Direct chart generation test
      const btcData = await chartGenerator.fetchRealHistoricalData('BTC');
      const ethData = await chartGenerator.fetchRealHistoricalData('ETH');
      
      if (btcData && ethData) {
        const chartData = await chartGenerator.generateComparisonChart(
          ['BTC', 'ETH'],
          [btcData, ethData]
        );
        
        if (chartData && chartData.imageUrl) {
          console.log(chalk.green('✅ BTC vs ETH chart generated successfully!'));
          console.log(`   Image size: ${chartData.imageUrl.length} bytes`);
        }
      }
    }
    
  } catch (error) {
    console.error(chalk.red('Test failed:'), error);
    console.error(error.stack);
  } finally {
    // Cleanup
    marketDataService.cleanup();
  }
}

// Run the test
testComparisonDirect().then(() => {
  console.log(chalk.gray('\n═══════════════════════════════════════════════════════════\n'));
  process.exit(0);
});