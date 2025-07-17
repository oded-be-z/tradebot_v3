// Comprehensive test for symbol extraction bug fix
const safeSymbol = require('./src/utils/safeSymbol');

function testSymbolExtraction() {
  console.log('🔧 Testing Symbol Extraction Bug Fix...\n');
  
  const testCases = [
    {
      input: 'show bitcoin chart',
      expected: ['BTC'],
      description: 'Critical bug: bitcoin should map to BTC, chart should be ignored'
    },
    {
      input: 'ethereum price',
      expected: ['ETH'],
      description: 'Crypto name mapping: ethereum → ETH'
    },
    {
      input: 'analyze AAPL chart',
      expected: ['AAPL'],
      description: 'Stock symbol with chart: should extract AAPL, ignore chart'
    },
    {
      input: 'gold vs silver',
      expected: ['GC', 'SI'],
      description: 'Commodity mapping: gold → GC, silver → SI'
    },
    {
      input: 'chart trend graph',
      expected: [],
      description: 'Generic words only: should return empty array'
    },
    {
      input: 'show me a chart',
      expected: [],
      description: 'No financial symbols: should return empty array'
    },
    {
      input: 'bitcoin ethereum chart',
      expected: ['BTC', 'ETH'],
      description: 'Multiple crypto names: should map both, ignore chart'
    },
    {
      input: 'oil trends with chart',
      expected: ['CL'],
      description: 'Commodity with generic words: oil → CL, ignore trends/chart'
    },
    {
      input: 'apple vs microsoft',
      expected: ['AAPL', 'MSFT'],
      description: 'Company names: apple → AAPL, microsoft → MSFT'
    },
    {
      input: 'TSLA stock chart',
      expected: ['TSLA'],
      description: 'Mixed case: TSLA valid, ignore stock/chart'
    },
    {
      input: '$BTC price',
      expected: ['BTC'],
      description: 'Dollar format: $BTC should work'
    },
    {
      input: 'display data analysis',
      expected: [],
      description: 'All blacklisted words: should return empty'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. Testing: "${testCase.input}"`);
    console.log(`   Expected: [${testCase.expected.join(', ')}]`);
    
    const result = safeSymbol.extractSafeSymbols(testCase.input);
    console.log(`   Got:      [${result.join(', ')}]`);
    
    // Check if arrays are equal
    const isEqual = result.length === testCase.expected.length && 
                   result.every(symbol => testCase.expected.includes(symbol));
    
    if (isEqual) {
      console.log(`   ✅ PASS - ${testCase.description}`);
      passed++;
    } else {
      console.log(`   ❌ FAIL - ${testCase.description}`);
      failed++;
    }
  });
  
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Total: ${testCases.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Symbol extraction bug is fixed.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the implementation.');
  }
  
  // Test critical success criteria
  console.log('\n🔍 Critical Success Criteria Check:');
  
  // Test 1: "bitcoin" must map to BTC
  const bitcoinResult = safeSymbol.extractSafeSymbols('bitcoin');
  console.log(`✓ "bitcoin" → BTC: ${bitcoinResult.includes('BTC') ? 'PASS' : 'FAIL'}`);
  
  // Test 2: "chart" must NEVER be accepted as ticker
  const chartResult = safeSymbol.extractSafeSymbols('chart');
  console.log(`✓ "chart" rejected: ${chartResult.length === 0 ? 'PASS' : 'FAIL'}`);
  
  // Test 3: "show bitcoin chart" must return only BTC
  const showBitcoinResult = safeSymbol.extractSafeSymbols('show bitcoin chart');
  console.log(`✓ "show bitcoin chart" → [BTC]: ${JSON.stringify(showBitcoinResult) === JSON.stringify(['BTC']) ? 'PASS' : 'FAIL'}`);
  
  // Test 4: Existing symbols still work
  const aaplResult = safeSymbol.extractSafeSymbols('AAPL');
  console.log(`✓ "AAPL" still works: ${aaplResult.includes('AAPL') ? 'PASS' : 'FAIL'}`);
  
  return failed === 0;
}

// Run the test
const success = testSymbolExtraction();
process.exit(success ? 0 : 1);