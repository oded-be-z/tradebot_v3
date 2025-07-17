// Comprehensive Production Testing Suite
const intelligentResponse = require('./services/intelligentResponse');
const safeSymbol = require('./src/utils/safeSymbol');
const chartGenerator = require('./services/chartGenerator');

// Test assets organized by category
const TEST_ASSETS = {
  cryptocurrencies: [
    { natural: 'bitcoin', symbol: 'BTC', type: 'crypto' },
    { natural: 'ethereum', symbol: 'ETH', type: 'crypto' },
    { natural: 'binance coin', symbol: 'BNB', type: 'crypto' },
    { natural: 'solana', symbol: 'SOL', type: 'crypto' },
    { natural: 'cardano', symbol: 'ADA', type: 'crypto' },
    { natural: 'ripple', symbol: 'XRP', type: 'crypto' },
    { natural: 'dogecoin', symbol: 'DOGE', type: 'crypto' },
    { natural: 'polygon', symbol: 'MATIC', type: 'crypto' },
    { natural: 'avalanche', symbol: 'AVAX', type: 'crypto' },
    { natural: 'chainlink', symbol: 'LINK', type: 'crypto' }
  ],
  commodities: [
    { natural: 'gold', symbol: 'GC', type: 'commodity' },
    { natural: 'silver', symbol: 'SI', type: 'commodity' },
    { natural: 'oil', symbol: 'CL', type: 'commodity' },
    { natural: 'natural gas', symbol: 'NG', type: 'commodity' },
    { natural: 'copper', symbol: 'HG', type: 'commodity' },
    { natural: 'wheat', symbol: 'ZW', type: 'commodity' },
    { natural: 'corn', symbol: 'ZC', type: 'commodity' },
    { natural: 'soybeans', symbol: 'ZS', type: 'commodity' },
    { natural: 'coffee', symbol: 'KC', type: 'commodity' },
    { natural: 'sugar', symbol: 'SB', type: 'commodity' }
  ],
  stocks: [
    { natural: 'apple', symbol: 'AAPL', type: 'stock' },
    { natural: 'microsoft', symbol: 'MSFT', type: 'stock' },
    { natural: 'google', symbol: 'GOOGL', type: 'stock' },
    { natural: 'amazon', symbol: 'AMZN', type: 'stock' },
    { natural: 'tesla', symbol: 'TSLA', type: 'stock' },
    { natural: 'nvidia', symbol: 'NVDA', type: 'stock' },
    { natural: 'meta', symbol: 'META', type: 'stock' },
    { natural: 'berkshire', symbol: 'BRK.B', type: 'stock' },
    { natural: 'jpmorgan', symbol: 'JPM', type: 'stock' },
    { natural: 'visa', symbol: 'V', type: 'stock' }
  ]
};

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  details: []
};

async function testAsset(asset, category) {
  const result = {
    category,
    asset: asset.symbol,
    natural: asset.natural,
    tests: {
      naturalExtraction: false,
      directExtraction: false,
      noChartTicker: false,
      responseGeneration: false,
      chartGeneration: false,
      dataConsistency: false,
      professionalAnalysis: false
    },
    errors: []
  };

  try {
    // Test 1: Natural language extraction
    const naturalQuery = `show ${asset.natural} chart`;
    const naturalSymbols = safeSymbol.extractSafeSymbols(naturalQuery);
    result.tests.naturalExtraction = naturalSymbols.includes(asset.symbol) && !naturalSymbols.includes('CHART');
    if (!result.tests.naturalExtraction) {
      result.errors.push(`Natural extraction failed: "${naturalQuery}" → [${naturalSymbols.join(', ')}]`);
    }

    // Test 2: Direct symbol extraction
    const directQuery = `analyze ${asset.symbol} performance`;
    const directSymbols = safeSymbol.extractSafeSymbols(directQuery);
    result.tests.directExtraction = directSymbols.includes(asset.symbol);
    if (!result.tests.directExtraction) {
      result.errors.push(`Direct extraction failed: "${directQuery}" → [${directSymbols.join(', ')}]`);
    }

    // Test 3: No "CHART" ticker appearing
    const chartQuery = `${asset.natural} chart graph trend`;
    const chartSymbols = safeSymbol.extractSafeSymbols(chartQuery);
    result.tests.noChartTicker = !chartSymbols.includes('CHART') && 
                                 !chartSymbols.includes('GRAPH') && 
                                 !chartSymbols.includes('TREND');
    if (!result.tests.noChartTicker) {
      result.errors.push(`Chart ticker leaked: "${chartQuery}" → [${chartSymbols.join(', ')}]`);
    }

    // Test 4: Response generation
    const response = await intelligentResponse.generateResponse(naturalQuery, {});
    result.tests.responseGeneration = response && response.symbol === asset.symbol;
    if (!result.tests.responseGeneration) {
      result.errors.push(`Response generation failed: got symbol "${response?.symbol}" instead of "${asset.symbol}"`);
    }

    // Test 5: Chart generation
    if (response && response.data && response.data.price) {
      const chart = await chartGenerator.generateSmartChart(
        asset.symbol, 
        'price', 
        null, 
        response.data.price
      );
      result.tests.chartGeneration = chart && chart.imageUrl && chart.currentPrice === response.data.price;
      if (!result.tests.chartGeneration) {
        result.errors.push(`Chart generation failed or price mismatch`);
      }
    }

    // Test 6: Data consistency
    if (response && response.data) {
      const analysisPrice = extractPriceFromAnalysis(response.analysis);
      result.tests.dataConsistency = Math.abs(analysisPrice - response.data.price) < 0.01;
      if (!result.tests.dataConsistency) {
        result.errors.push(`Data inconsistency: analysis shows $${analysisPrice}, data shows $${response.data.price}`);
      }
    }

    // Test 7: Professional analysis quality
    if (response && response.analysis) {
      result.tests.professionalAnalysis = checkAnalysisQuality(response.analysis, asset);
      if (!result.tests.professionalAnalysis) {
        result.errors.push(`Analysis quality check failed`);
      }
    }

  } catch (error) {
    result.errors.push(`Exception: ${error.message}`);
  }

  // Calculate pass/fail
  const passed = Object.values(result.tests).every(test => test === true);
  result.status = passed ? 'PASS' : 'FAIL';
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  testResults.details.push(result);
  return result;
}

function extractPriceFromAnalysis(analysis) {
  // Extract price from analysis text
  const priceMatch = analysis.match(/\$([0-9,]+\.?\d*)/);
  if (priceMatch) {
    return parseFloat(priceMatch[1].replace(/,/g, ''));
  }
  return 0;
}

function checkAnalysisQuality(analysis, asset) {
  // Check for professional analysis elements
  const checks = {
    hasPrice: /\$[0-9,]+/.test(analysis),
    hasMovement: /(up|down|trades at|trading)/.test(analysis),
    hasContext: /(support|resistance|momentum|sentiment)/.test(analysis),
    hasStrategy: /(strategy|entry|target|accumulate|scale)/.test(analysis),
    noPlaceholder: !/(Live charts|available below)/.test(analysis),
    appropriate: true
  };

  // Asset-specific checks
  if (asset.type === 'crypto') {
    checks.appropriate = /(institutional|RSI|network|DeFi)/.test(analysis);
  } else if (asset.type === 'commodity') {
    checks.appropriate = /(supply|demand|inventory|OPEC|dollar)/.test(analysis);
  } else if (asset.type === 'stock') {
    checks.appropriate = /(earnings|revenue|analyst|market|sector)/.test(analysis);
  }

  return Object.values(checks).every(check => check === true);
}

async function runAllTests() {
  console.log('🔬 COMPREHENSIVE PRODUCTION TESTING SUITE\n');
  console.log('Testing 30 assets across 3 categories...\n');

  // Test all cryptocurrencies
  console.log('📊 CRYPTOCURRENCIES (10 assets)');
  for (const asset of TEST_ASSETS.cryptocurrencies) {
    process.stdout.write(`Testing ${asset.symbol}...`);
    const result = await testAsset(asset, 'Cryptocurrency');
    console.log(result.status === 'PASS' ? ' ✅' : ' ❌');
  }

  // Test all commodities
  console.log('\n📊 COMMODITIES (10 assets)');
  for (const asset of TEST_ASSETS.commodities) {
    process.stdout.write(`Testing ${asset.symbol}...`);
    const result = await testAsset(asset, 'Commodity');
    console.log(result.status === 'PASS' ? ' ✅' : ' ❌');
  }

  // Test all stocks
  console.log('\n📊 STOCKS (10 assets)');
  for (const asset of TEST_ASSETS.stocks) {
    process.stdout.write(`Testing ${asset.symbol}...`);
    const result = await testAsset(asset, 'Stock');
    console.log(result.status === 'PASS' ? ' ✅' : ' ❌');
  }

  // Generate results table
  console.log('\n📋 TEST RESULTS TABLE\n');
  console.log('Category      | Asset  | Natural    | Direct | No CHART | Response | Chart | Data Match | Analysis');
  console.log('--------------|--------|------------|--------|----------|----------|-------|------------|----------');
  
  testResults.details.forEach(result => {
    const row = [
      result.category.padEnd(13),
      result.asset.padEnd(6),
      (result.tests.naturalExtraction ? '✓' : '✗').padEnd(10),
      (result.tests.directExtraction ? '✓' : '✗').padEnd(6),
      (result.tests.noChartTicker ? '✓' : '✗').padEnd(8),
      (result.tests.responseGeneration ? '✓' : '✗').padEnd(8),
      (result.tests.chartGeneration ? '✓' : '✗').padEnd(5),
      (result.tests.dataConsistency ? '✓' : '✗').padEnd(10),
      (result.tests.professionalAnalysis ? '✓' : '✗')
    ];
    console.log(row.join(' | '));
  });

  // Summary
  console.log('\n📊 SUMMARY');
  console.log(`Total Tests: 30 assets`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / 30) * 100).toFixed(1)}%`);

  // Show failures if any
  if (testResults.failed > 0) {
    console.log('\n⚠️  FAILURES:');
    testResults.details.filter(r => r.status === 'FAIL').forEach(result => {
      console.log(`\n${result.asset} (${result.category}):`);
      result.errors.forEach(error => console.log(`  - ${error}`));
    });
  }

  // Final verdict
  console.log('\n🎯 PRODUCTION READINESS:');
  if (testResults.passed === 30) {
    console.log('✅ ALL TESTS PASSED - READY FOR PRODUCTION!');
  } else {
    console.log('❌ SOME TESTS FAILED - NOT READY FOR PRODUCTION');
  }
}

// Run the tests
runAllTests().catch(console.error);