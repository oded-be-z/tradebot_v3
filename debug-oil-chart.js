/**
 * Debug script for oil (CL) chart data issue
 */

const chalk = require('chalk');
const MarketDataService = require('./src/knowledge/market-data-service');
const chartGenerator = require('./services/chartGenerator');

async function debugOilData() {
  console.log(chalk.bold.blue('\n🔍 DEBUGGING OIL (CL) CHART DATA\n'));
  
  const marketDataService = new MarketDataService();
  
  try {
    // Test 1: Check commodity detection
    console.log(chalk.bold('Test 1: Asset Type Detection'));
    const assetType = marketDataService.detectAssetType('CL');
    console.log(`Asset type for CL: ${chalk.yellow(assetType)}`);
    
    // Test 2: Get commodity info
    console.log(chalk.bold('\nTest 2: Commodity Configuration'));
    const commodityInfo = marketDataService.commoditiesService.getCommodityInfo('CL');
    console.log('Commodity info:', commodityInfo);
    
    // Test 3: Fetch current oil price
    console.log(chalk.bold('\nTest 3: Current Oil Price'));
    const currentPrice = await marketDataService.fetchCommodityPrice('CL');
    console.log('Current price data:', currentPrice);
    
    // Test 4: Fetch historical data
    console.log(chalk.bold('\nTest 4: Historical Data (30 days)'));
    const historicalData = await marketDataService.fetchHistoricalData('CL', 30, '1d', 'commodity');
    console.log(`Historical data points: ${historicalData.length}`);
    
    if (historicalData.length > 0) {
      console.log('\nFirst 5 data points:');
      historicalData.slice(0, 5).forEach((d, i) => {
        console.log(`  Day ${i + 1}: ${d.date} - Close: $${d.close || 'N/A'}`);
      });
      
      console.log('\nLast 5 data points:');
      historicalData.slice(-5).forEach((d, i) => {
        console.log(`  Day ${historicalData.length - 4 + i}: ${d.date} - Close: $${d.close || 'N/A'}`);
      });
      
      // Check for missing data
      const missingData = historicalData.filter(d => !d.close || d.close === null || isNaN(d.close));
      if (missingData.length > 0) {
        console.log(chalk.red(`\n⚠️  Found ${missingData.length} days with missing/invalid price data`));
        console.log('Missing data dates:', missingData.map(d => d.date).join(', '));
      }
    }
    
    // Test 5: Fetch data via chartGenerator
    console.log(chalk.bold('\nTest 5: ChartGenerator Data Fetch'));
    const chartData = await chartGenerator.fetchRealHistoricalData('CL');
    
    if (chartData) {
      console.log(`Chart data points: ${chartData.prices.length}`);
      console.log(`Price range: $${Math.min(...chartData.prices).toFixed(2)} - $${Math.max(...chartData.prices).toFixed(2)}`);
      console.log(`Current price from chart: $${chartData.currentPrice}`);
      
      // Check for NaN or null values
      const invalidPrices = chartData.prices.filter(p => !p || isNaN(p));
      if (invalidPrices.length > 0) {
        console.log(chalk.red(`\n⚠️  Found ${invalidPrices.length} invalid prices in chart data`));
      }
    } else {
      console.log(chalk.red('❌ No chart data returned'));
    }
    
    // Test 6: Try different API sources
    console.log(chalk.bold('\nTest 6: Testing Different API Sources'));
    
    // Test Yahoo Finance directly
    if (commodityInfo?.symbol) {
      console.log(`\nTrying Yahoo Finance with symbol: ${commodityInfo.symbol}`);
      try {
        const YahooFinanceClass = require("yahoo-finance2").default;
        const yahooFinance = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] });
        
        const quote = await yahooFinance.quote(commodityInfo.symbol);
        if (quote && quote.regularMarketPrice) {
          console.log(chalk.green(`✅ Yahoo Finance: $${quote.regularMarketPrice}`));
        } else {
          console.log(chalk.red('❌ Yahoo Finance: No data'));
        }
        
        // Try historical chart
        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 30);
        
        const chart = await yahooFinance.chart(commodityInfo.symbol, {
          period1: startDate,
          period2: endDate,
          interval: '1d'
        }, { validateResult: false });
        
        if (chart.quotes && chart.quotes.length > 0) {
          console.log(chalk.green(`✅ Yahoo Historical: ${chart.quotes.length} days of data`));
          const validQuotes = chart.quotes.filter(q => q.close && !isNaN(q.close));
          console.log(`   Valid quotes: ${validQuotes.length}`);
        }
      } catch (error) {
        console.log(chalk.red(`❌ Yahoo Finance error: ${error.message}`));
      }
    }
    
    // Test Polygon if available
    if (process.env.POLYGON_API_KEY && commodityInfo?.polygon) {
      console.log(`\nTrying Polygon with ticker: ${commodityInfo.polygon}`);
      try {
        const axios = require('axios');
        const response = await axios.get(
          `https://api.polygon.io/v2/aggs/ticker/${commodityInfo.polygon}/prev`,
          { params: { apiKey: process.env.POLYGON_API_KEY } }
        );
        
        if (response.data.results?.[0]) {
          console.log(chalk.green(`✅ Polygon: $${response.data.results[0].c}`));
        } else {
          console.log(chalk.red('❌ Polygon: No data'));
        }
      } catch (error) {
        console.log(chalk.red(`❌ Polygon error: ${error.message}`));
      }
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Debug failed:'), error.message);
    console.error(error.stack);
  } finally {
    // Clean up
    marketDataService.cleanup();
  }
}

// Run the debug
debugOilData().then(() => {
  console.log(chalk.gray('\n═══════════════════════════════════════════════════════════\n'));
  process.exit(0);
});