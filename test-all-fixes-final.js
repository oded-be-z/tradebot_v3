// Final comprehensive test for all production fixes
const axios = require('axios');
const chalk = require('chalk');

const SERVER_URL = 'http://localhost:3000';

const CRITICAL_TESTS = [
  {
    name: 'Professional Format - Bitcoin',
    query: 'analyze bitcoin',
    checks: {
      hasEmojis: true,
      hasBullets: true,
      hasStructure: true,
      expectedSymbol: 'BTC'
    }
  },
  {
    name: 'Professional Format - Oil Trends',
    query: 'oil trends with chart',
    checks: {
      hasEmojis: true,
      hasBullets: true,
      hasStructure: true,
      hasChart: true,
      chartType: 'trend'
    }
  },
  {
    name: 'Professional Format - Gold vs Silver',
    query: 'gold vs silver comparison',
    checks: {
      hasEmojis: true,
      hasBullets: true,
      goldPriceRealistic: true,
      maxGoldPrice: 4000
    }
  },
  {
    name: 'Micro-price Formatting - Dogecoin',
    query: "what's happening with dogecoin",
    checks: {
      hasEmojis: true,
      hasBullets: true,
      microPriceFormat: true
    }
  },
  {
    name: 'Chart Generation - Bitcoin',
    query: 'show bitcoin chart',
    checks: {
      hasChart: true,
      chartType: 'price',
      isPNG: true
    }
  },
  {
    name: 'Symbol Extraction - No WHATS',
    query: "what's the bitcoin price",
    checks: {
      noInvalidSymbols: true,
      invalidSymbols: ['WHATS', 'WHAT', 'CHART']
    }
  }
];

async function runTest(test) {
  console.log(`\n${chalk.bold.blue('Testing:')} ${test.name}`);
  console.log(`Query: "${test.query}"`);
  
  try {
    const response = await axios.post(`${SERVER_URL}/api/chat`, {
      message: test.query,
      sessionId: `test-${Date.now()}`
    });
    
    const { type, response: text, chartData, data } = response.data;
    
    let passed = true;
    const results = [];
    
    // Check professional format
    if (test.checks.hasEmojis) {
      const hasEmojis = /[📊📈💡📍🎯⚠️💰📉📌🔔💵]/.test(text);
      results.push(`Emojis: ${hasEmojis ? '✅' : '❌'}`);
      if (!hasEmojis) passed = false;
    }
    
    if (test.checks.hasBullets) {
      const hasBullets = /•/.test(text);
      results.push(`Bullets: ${hasBullets ? '✅' : '❌'}`);
      if (!hasBullets) passed = false;
    }
    
    if (test.checks.hasStructure) {
      const hasStructure = /Trading Analysis|Market Insight|Key Levels|Trading Strategy|Risk/.test(text);
      results.push(`Structure: ${hasStructure ? '✅' : '❌'}`);
      if (!hasStructure) passed = false;
    }
    
    // Check chart generation
    if (test.checks.hasChart) {
      const hasChart = !!chartData?.imageUrl;
      results.push(`Chart: ${hasChart ? '✅' : '❌'}`);
      if (!hasChart) passed = false;
      
      if (hasChart && test.checks.chartType) {
        const correctType = chartData.chartType === test.checks.chartType;
        results.push(`Chart type: ${correctType ? '✅' : '❌'} (${chartData.chartType})`);
        if (!correctType) passed = false;
      }
      
      if (hasChart && test.checks.isPNG) {
        const isPNG = chartData.imageUrl.startsWith('data:image/png;base64,');
        results.push(`PNG format: ${isPNG ? '✅' : '❌'}`);
        if (!isPNG) passed = false;
      }
    }
    
    // Check gold price
    if (test.checks.goldPriceRealistic) {
      const goldMatch = text.match(/\$(\d{1,3},?\d{3}\.\d{2})/);
      if (goldMatch) {
        const goldPrice = parseFloat(goldMatch[1].replace(',', ''));
        const realistic = goldPrice <= test.checks.maxGoldPrice;
        results.push(`Gold price: ${realistic ? '✅' : '❌'} ($${goldPrice})`);
        if (!realistic) passed = false;
      }
    }
    
    // Check micro-price formatting
    if (test.checks.microPriceFormat) {
      const priceMatch = text.match(/\$0\.(\d+)/);
      if (priceMatch) {
        const decimals = priceMatch[1].length;
        const correctFormat = decimals >= 6;
        results.push(`Micro-price decimals: ${correctFormat ? '✅' : '❌'} (${decimals} decimals)`);
        if (!correctFormat) passed = false;
      }
    }
    
    // Check symbol extraction
    if (test.checks.noInvalidSymbols) {
      let hasInvalid = false;
      for (const invalid of test.checks.invalidSymbols) {
        if (text.includes(`${invalid} Trading Analysis`)) {
          hasInvalid = true;
          results.push(`No ${invalid}: ❌`);
          passed = false;
          break;
        }
      }
      if (!hasInvalid) {
        results.push(`No invalid symbols: ✅`);
      }
    }
    
    // Print results
    results.forEach(r => console.log(`  ${r}`));
    console.log(`\nOverall: ${passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL')}`);
    
    // Show sample output
    if (!passed) {
      console.log(chalk.gray('\nSample output:'));
      text.split('\n').slice(0, 5).forEach(line => 
        console.log(chalk.gray('  ' + line))
      );
    }
    
    return { test: test.name, passed, results };
    
  } catch (error) {
    console.log(chalk.red(`❌ Error: ${error.message}`));
    return { test: test.name, passed: false, error: error.message };
  }
}

async function main() {
  console.log(chalk.bold.green('\n🎯 FINAL PRODUCTION FIXES TEST\n'));
  
  // Check server
  try {
    await axios.get(`${SERVER_URL}/api/health`);
    console.log(chalk.green('✅ Server is running\n'));
  } catch (e) {
    console.log(chalk.red('❌ Server not running. Start with: node server.js\n'));
    process.exit(1);
  }
  
  // Run all tests
  const results = [];
  for (const test of CRITICAL_TESTS) {
    const result = await runTest(test);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log(chalk.bold.green('\n\n📊 FINAL TEST SUMMARY\n'));
  console.log('=' .repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${chalk.green(passed)}`);
  console.log(`Failed: ${failed > 0 ? chalk.red(failed) : chalk.green(0)}`);
  
  console.log('\nCritical Issues Status:');
  console.log('1. Professional format (emojis/bullets): ' + 
    (results.every(r => !r.results || r.results.every(res => !res.includes('Emojis: ❌') && !res.includes('Bullets: ❌'))) 
      ? chalk.green('✅ FIXED') : chalk.red('❌ NOT FIXED')));
  console.log('2. Chart generation: ' + 
    (results.filter(r => r.test.includes('Chart')).every(r => r.passed) 
      ? chalk.green('✅ FIXED') : chalk.red('❌ NOT FIXED')));
  console.log('3. Gold price validation: ' + 
    (results.find(r => r.test.includes('Gold'))?.passed 
      ? chalk.green('✅ FIXED') : chalk.red('❌ NOT FIXED')));
  console.log('4. Micro-price formatting: ' + 
    (results.find(r => r.test.includes('Dogecoin'))?.passed 
      ? chalk.green('✅ FIXED') : chalk.red('❌ NOT FIXED')));
  console.log('5. Symbol extraction: ' + 
    (results.find(r => r.test.includes('WHATS'))?.passed 
      ? chalk.green('✅ FIXED') : chalk.red('❌ NOT FIXED')));
  
  if (passed === results.length) {
    console.log(chalk.bold.green('\n✅ ALL PRODUCTION ISSUES FIXED!'));
    console.log(chalk.green('The system is ready for deployment.'));
  } else {
    console.log(chalk.bold.red('\n❌ SOME ISSUES REMAIN'));
    console.log(chalk.yellow('Failed tests:'));
    results.filter(r => !r.passed).forEach(r => {
      console.log(chalk.red(`- ${r.test}`));
    });
  }
}

main().catch(console.error);