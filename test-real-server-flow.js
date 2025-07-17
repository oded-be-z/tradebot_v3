// Integration test for real server responses
const axios = require('axios');
const chalk = require('chalk');

const SERVER_URL = 'http://localhost:3000';
const TEST_QUERIES = [
  { query: 'show bitcoin chart', expectedFormat: 'professional', symbol: 'BTC' },
  { query: 'oil trends with chart', expectedFormat: 'professional', symbol: 'CL' },
  { query: 'gold vs silver comparison', expectedFormat: 'professional', symbols: ['GC', 'SI'] },
  { query: "what's happening with dogecoin", expectedFormat: 'professional', symbol: 'DOGE' },
  { query: 'analyze AAPL', expectedFormat: 'professional', symbol: 'AAPL' },
  { query: 'ethereum analysis', expectedFormat: 'professional', symbol: 'ETH' }
];

async function waitForServer() {
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await axios.get(`${SERVER_URL}/api/health`);
      return true;
    } catch (e) {
      console.log(`Waiting for server... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
}

async function testQuery(test, sessionId) {
  console.log(`\n${chalk.bold.blue('Testing:')} "${test.query}"`);
  
  try {
    const response = await axios.post(`${SERVER_URL}/api/chat`, {
      message: test.query,
      sessionId: sessionId
    });
    
    const { type, response: text, data, chartData } = response.data;
    
    // Check for professional format indicators
    const hasEmojis = /[📊📈💡📍🎯⚠️💰📉📌🔔💵]/.test(text);
    const hasBullets = /•/.test(text);
    const hasStructure = /Trading Analysis|Market Insight|Key Levels|Trading Strategy|Risk/.test(text);
    
    console.log(`Response type: ${chalk.yellow(type)}`);
    console.log(`Has emojis: ${hasEmojis ? chalk.green('✅') : chalk.red('❌')}`);
    console.log(`Has bullets: ${hasBullets ? chalk.green('✅') : chalk.red('❌')}`);
    console.log(`Has structure: ${hasStructure ? chalk.green('✅') : chalk.red('❌')}`);
    
    // Check price formatting
    if (data && data.price) {
      console.log(`Price: ${chalk.cyan(data.price)}`);
      
      // Check for micro-price formatting (Dogecoin)
      if (test.symbol === 'DOGE' && data.price < 1) {
        const priceInText = text.match(/\$[\d.]+/);
        if (priceInText) {
          console.log(`Price in text: ${chalk.cyan(priceInText[0])}`);
          const correctFormat = priceInText[0].includes('0.') && priceInText[0].length > 4;
          console.log(`Micro-price format: ${correctFormat ? chalk.green('✅') : chalk.red('❌ Should show more decimals')}`);
        }
      }
      
      // Check for unrealistic prices
      if (test.symbol === 'GC' && data.price > 2500) {
        console.log(chalk.red(`⚠️ Gold price unrealistic: $${data.price}`));
      }
    }
    
    // Check chart generation
    if (chartData && chartData.imageUrl) {
      console.log(`Chart generated: ${chalk.green('✅')}`);
      console.log(`Chart type: ${chalk.yellow(chartData.chartType || 'unknown')}`);
      
      // Check if chart is base64 PNG
      const isPNG = chartData.imageUrl.startsWith('data:image/png;base64,');
      console.log(`Is PNG: ${isPNG ? chalk.green('✅') : chalk.red('❌')}`);
    } else if (test.query.includes('chart')) {
      console.log(chalk.red('❌ No chart generated for chart query'));
    }
    
    // Sample output
    console.log('\n' + chalk.gray('Sample output:'));
    const lines = text.split('\n').slice(0, 10);
    lines.forEach(line => console.log(chalk.gray('  ' + line)));
    
    // Overall result
    const isProfessional = hasEmojis && hasBullets && hasStructure;
    console.log(`\nProfessional format: ${isProfessional ? chalk.green('✅ YES') : chalk.red('❌ NO')}`);
    
    return {
      query: test.query,
      type,
      hasEmojis,
      hasBullets,
      hasStructure,
      isProfessional,
      hasChart: !!chartData?.imageUrl,
      price: data?.price
    };
    
  } catch (error) {
    console.log(chalk.red(`❌ Error: ${error.message}`));
    return {
      query: test.query,
      error: error.message
    };
  }
}

async function main() {
  console.log(chalk.bold.green('\n🔧 REAL SERVER INTEGRATION TEST\n'));
  
  // Check if server is running
  console.log('Checking server status...');
  const serverReady = await waitForServer();
  
  if (!serverReady) {
    console.log(chalk.red('\n❌ Server is not running. Please start the server with: node server.js\n'));
    process.exit(1);
  }
  
  console.log(chalk.green('✅ Server is ready\n'));
  
  // Run tests
  const results = [];
  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const sessionId = `integration-test-${Date.now()}-${i}`;
    const result = await testQuery(TEST_QUERIES[i], sessionId);
    results.push(result);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log(chalk.bold.green('\n\n📊 TEST SUMMARY\n'));
  console.log('=' .repeat(60));
  
  const professionalCount = results.filter(r => r.isProfessional).length;
  const errorCount = results.filter(r => r.error).length;
  const chartCount = results.filter(r => r.hasChart).length;
  
  console.log(`Total tests: ${results.length}`);
  console.log(`Professional format: ${chalk.green(professionalCount)}/${results.length}`);
  console.log(`Charts generated: ${chalk.green(chartCount)}/${results.filter(r => TEST_QUERIES.find(t => t.query === r.query)?.query.includes('chart')).length}`);
  console.log(`Errors: ${errorCount > 0 ? chalk.red(errorCount) : chalk.green(0)}`);
  
  // Detailed results
  console.log('\nDetailed Results:');
  results.forEach(r => {
    const status = r.error ? '❌' : r.isProfessional ? '✅' : '⚠️';
    console.log(`${status} "${r.query}": ${r.error || (r.isProfessional ? 'Professional' : 'Not professional')}`);
  });
  
  // Overall status
  const allProfessional = professionalCount === results.length - errorCount;
  console.log(`\n${allProfessional ? chalk.green('✅ ALL TESTS PASS') : chalk.red('❌ SOME TESTS FAIL')}`);
  
  if (!allProfessional) {
    console.log(chalk.yellow('\n⚠️ Issues found:'));
    results.forEach(r => {
      if (!r.isProfessional && !r.error) {
        console.log(`- "${r.query}": Missing ${!r.hasEmojis ? 'emojis ' : ''}${!r.hasBullets ? 'bullets ' : ''}${!r.hasStructure ? 'structure' : ''}`);
      }
    });
  }
}

main().catch(console.error);