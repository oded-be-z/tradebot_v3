/**
 * Test invalid ticker handling
 */

const chalk = require('chalk');
const intelligentResponse = require('./services/intelligentResponse');
const MarketDataService = require('./src/knowledge/market-data-service');

async function testInvalidTicker() {
  console.log(chalk.bold.blue('\n🔍 TESTING INVALID TICKER HANDLING\n'));
  
  const testCases = [
    'xyz123',
    'ABC123',
    'INVALID',
    'FAKE',
    '12345'
  ];
  
  const marketDataService = new MarketDataService();
  
  for (const ticker of testCases) {
    console.log(chalk.bold(`\nTesting: "${ticker}"`));
    console.log(chalk.gray('─'.repeat(40)));
    
    try {
      // Test 1: Symbol extraction
      const symbol = intelligentResponse.extractSymbol(ticker);
      console.log(`Extracted symbol: ${symbol || 'null'}`);
      
      // Test 2: Market data fetch
      if (symbol) {
        const data = await marketDataService.fetchMarketData(symbol, 'auto');
        console.log(`Market data result:`, {
          hasPrice: !!data.price,
          hasError: !!data.error,
          source: data.source
        });
        
        if (data.error) {
          console.log(chalk.red(`Error: ${data.error}`));
        }
      }
      
      // Test 3: Trend analysis
      const analysis = await intelligentResponse.generateTrendAnalysis(ticker, {});
      console.log(`Analysis type: ${analysis.type}`);
      if (analysis.type === 'error') {
        console.log(chalk.green(`✅ Correctly returned error: ${analysis.message}`));
      } else {
        console.log(chalk.red(`❌ Unexpected response type: ${analysis.type}`));
        if (analysis.symbol) {
          console.log(chalk.red(`   Symbol: ${analysis.symbol}`));
        }
      }
      
    } catch (error) {
      console.log(chalk.red(`Exception: ${error.message}`));
    }
  }
  
  // Test valid ticker for comparison
  console.log(chalk.bold(`\n\nTesting valid ticker: "TSLA"`));
  console.log(chalk.gray('─'.repeat(40)));
  
  try {
    const symbol = intelligentResponse.extractSymbol('TSLA');
    console.log(`Extracted symbol: ${symbol}`);
    
    const data = await marketDataService.fetchMarketData(symbol, 'auto');
    console.log(`Market data:`, {
      symbol: data.symbol,
      price: data.price,
      hasError: !!data.error,
      source: data.source
    });
    
    const analysis = await intelligentResponse.generateTrendAnalysis('TSLA', {});
    console.log(`Analysis type: ${analysis.type}`);
    console.log(`Has chart: ${analysis.needsChart}`);
    
  } catch (error) {
    console.log(chalk.red(`Exception: ${error.message}`));
  }
  
  marketDataService.cleanup();
}

// Run the test
testInvalidTicker().then(() => {
  console.log(chalk.gray('\n═══════════════════════════════════════════════════════════\n'));
  process.exit(0);
});