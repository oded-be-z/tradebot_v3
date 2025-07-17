const axios = require('axios');
const chalk = require('chalk');

const SERVER_URL = 'http://localhost:3000';

async function testPriceConsistency() {
  console.log(chalk.bold.blue('\n🔍 TESTING PRICE CONSISTENCY BETWEEN TEXT AND CHARTS\n'));
  
  // Check if server is running
  try {
    await axios.get(`${SERVER_URL}/api/health`);
    console.log(chalk.green('✅ Server is running\n'));
  } catch (e) {
    console.log(chalk.red('❌ Server not running. Start with: node server.js\n'));
    return;
  }
  
  const testCases = [
    { query: 'show bitcoin chart', symbol: 'BTC', description: 'Bitcoin chart request' },
    { query: 'analyze ethereum', symbol: 'ETH', description: 'Ethereum analysis' },
    { query: 'AAPL price chart', symbol: 'AAPL', description: 'Apple stock chart' },
    { query: 'gold trends', symbol: 'GC', description: 'Gold commodity trends' }
  ];
  
  for (const test of testCases) {
    console.log(chalk.bold(`\nTesting: ${test.description}`));
    console.log(`Query: "${test.query}"`);
    
    try {
      const response = await axios.post(`${SERVER_URL}/api/chat`, {
        message: test.query,
        sessionId: `consistency-test-${Date.now()}`
      });
      
      const { response: textResponse, chartData, metadata } = response.data;
      
      // Extract price from text response
      const priceMatch = textResponse.match(/\$[\d,]+(?:\.\d+)?/);
      const textPrice = priceMatch ? parseFloat(priceMatch[0].replace(/[$,]/g, '')) : null;
      
      console.log(`Text shows price: ${textPrice ? chalk.cyan(`$${textPrice.toLocaleString()}`) : chalk.yellow('No price found')}`);
      
      if (chartData && chartData.data) {
        const chartPrices = chartData.data.prices;
        const chartEndPrice = chartPrices[chartPrices.length - 1];
        const chartCurrentPrice = chartData.currentPrice;
        
        console.log(`Chart end price: ${chalk.cyan(`$${chartEndPrice.toLocaleString()}`)}`);
        console.log(`Chart current price: ${chalk.cyan(`$${chartCurrentPrice.toLocaleString()}`)}`);
        
        // Check consistency
        if (textPrice && chartEndPrice) {
          const priceDiff = Math.abs(textPrice - chartEndPrice);
          const percentDiff = (priceDiff / textPrice) * 100;
          
          if (priceDiff < 0.01) {
            console.log(chalk.green('✅ EXACT MATCH: Text and chart prices are identical'));
          } else if (percentDiff < 0.1) {
            console.log(chalk.green(`✅ CLOSE MATCH: Prices within ${percentDiff.toFixed(3)}%`));
          } else {
            console.log(chalk.red(`❌ MISMATCH: ${percentDiff.toFixed(1)}% difference`));
            console.log(chalk.red(`   Text: $${textPrice}, Chart: $${chartEndPrice}`));
          }
        }
        
        // Check chart data range
        const minPrice = Math.min(...chartPrices);
        const maxPrice = Math.max(...chartPrices);
        const range = ((maxPrice - minPrice) / chartEndPrice) * 100;
        
        console.log(`Chart range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)} (${range.toFixed(1)}% spread)`);
        
        // Validate the range is realistic
        if (range > 30) {
          console.log(chalk.yellow(`⚠️  Warning: Chart shows ${range.toFixed(1)}% range - might be too volatile for 30 days`));
        }
      } else {
        console.log(chalk.yellow('No chart data generated'));
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ Error: ${error.message}`));
    }
    
    // Pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(chalk.bold.green('\n✅ PRICE CONSISTENCY TEST COMPLETED\n'));
}

// Run the test
testPriceConsistency().catch(console.error);