/**
 * Test comparison charts functionality
 */

const chalk = require('chalk');
const axios = require('axios');

async function testComparisonCharts() {
  console.log(chalk.bold.blue('\n🔍 TESTING COMPARISON CHARTS\n'));
  
  const comparisons = [
    { query: 'gold vs silver', expected: ['GC', 'SI'] },
    { query: 'bitcoin vs ethereum', expected: ['BTC', 'ETH'] },
    { query: 'apple vs microsoft', expected: ['AAPL', 'MSFT'] },
    { query: 'oil vs natural gas', expected: ['CL', 'NG'] }
  ];
  
  const baseUrl = 'http://localhost:3000/api/market-intelligence';
  
  for (const test of comparisons) {
    console.log(chalk.bold(`\nTesting: "${test.query}"`));
    
    try {
      const response = await axios.post(baseUrl, {
        query: test.query,
        mode: 'smart',
        context: {}
      });
      
      const data = response.data;
      
      // Check response type
      if (data.response && data.response.type === 'comparison_table') {
        console.log(chalk.green('✅ Comparison response received'));
        console.log(`   Symbols: ${data.response.symbols.join(' vs ')}`);
        
        // Check if chart was generated
        if (data.chart) {
          console.log(chalk.green('✅ Comparison chart generated'));
          console.log(`   Chart type: ${data.chart.chartType}`);
          console.log(`   Chart symbols: ${data.chart.symbols.join(' vs ')}`);
          console.log(`   Image size: ${data.chart.imageUrl.length} bytes`);
        } else {
          console.log(chalk.red('❌ No comparison chart generated'));
        }
        
        // Check analysis content
        if (data.response.analysis) {
          const analysisLength = data.response.analysis.length;
          console.log(chalk.green(`✅ Analysis provided (${analysisLength} chars)`));
        }
        
      } else {
        console.log(chalk.red('❌ Wrong response type:', data.response?.type || 'unknown'));
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ Error: ${error.message}`));
      if (error.response?.data) {
        console.log(chalk.red(`   Server error: ${JSON.stringify(error.response.data)}`));
      }
    }
  }
}

// Run the test
console.log(chalk.yellow('\nMake sure the server is running on port 3000!\n'));

testComparisonCharts().then(() => {
  console.log(chalk.gray('\n═══════════════════════════════════════════════════════════\n'));
  process.exit(0);
}).catch(error => {
  console.error(chalk.red('Test failed:'), error);
  process.exit(1);
});