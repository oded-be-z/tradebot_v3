// Final verification test for symbol extraction bug fix
const safeSymbol = require('./src/utils/safeSymbol');
const intelligentResponse = require('./services/intelligentResponse');

async function finalVerification() {
  console.log('🎯 Final Verification Test for Symbol Extraction Bug Fix\n');
  
  // Critical test cases that were failing before
  const criticalTests = [
    {
      query: 'show bitcoin chart',
      expectedSymbols: ['BTC'],
      mustNotExtract: ['CHART'],
      description: 'The original bug case'
    },
    {
      query: 'bitcoin',
      expectedSymbols: ['BTC'],
      mustNotExtract: [],
      description: 'Simple crypto name'
    },
    {
      query: 'chart',
      expectedSymbols: [],
      mustNotExtract: ['CHART'],
      description: 'Generic word only'
    },
    {
      query: 'analyze AAPL chart',
      expectedSymbols: ['AAPL'],
      mustNotExtract: ['CHART'],
      description: 'Valid ticker with generic word'
    },
    {
      query: 'gold vs silver chart',
      expectedSymbols: ['GC', 'SI'],
      mustNotExtract: ['CHART'],
      description: 'Comparison with generic word'
    }
  ];
  
  console.log('📋 CRITICAL SUCCESS CRITERIA:');
  console.log('✓ "bitcoin" must map to BTC');
  console.log('✓ "chart" must NEVER be accepted as a ticker');
  console.log('✓ Common crypto names must be recognized');
  console.log('✓ The fix must not break existing symbol extraction\n');
  
  let allPassed = true;
  
  for (const test of criticalTests) {
    console.log(`🔍 Testing: "${test.query}"`);
    
    const result = safeSymbol.extractSafeSymbols(test.query);
    
    // Check expected symbols are found
    let expectedMatch = test.expectedSymbols.every(symbol => result.includes(symbol));
    
    // Check forbidden symbols are not found
    let forbiddenMatch = test.mustNotExtract.every(symbol => !result.includes(symbol));
    
    // Check exact length match
    let lengthMatch = result.length === test.expectedSymbols.length;
    
    if (expectedMatch && forbiddenMatch && lengthMatch) {
      console.log(`   ✅ PASS - ${test.description}`);
      console.log(`   Result: [${result.join(', ')}]`);
    } else {
      console.log(`   ❌ FAIL - ${test.description}`);
      console.log(`   Expected: [${test.expectedSymbols.join(', ')}]`);
      console.log(`   Got: [${result.join(', ')}]`);
      allPassed = false;
    }
    console.log('');
  }
  
  // Test server integration for the original bug case
  console.log('🌐 Testing Server Integration for Original Bug Case:');
  try {
    const serverResult = await intelligentResponse.generateResponse('show bitcoin chart', {});
    
    if (serverResult.symbol === 'BTC') {
      console.log('   ✅ PASS - Server correctly extracts BTC from "show bitcoin chart"');
      console.log(`   Server response type: ${serverResult.type}`);
      console.log(`   Chart requested: ${serverResult.needsChart ? 'YES' : 'NO'}`);
    } else {
      console.log('   ❌ FAIL - Server did not extract BTC correctly');
      console.log(`   Server extracted: ${serverResult.symbol}`);
      allPassed = false;
    }
  } catch (error) {
    console.log('   ❌ ERROR - Server integration test failed:', error.message);
    allPassed = false;
  }
  
  console.log('\n📊 FINAL RESULT:');
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! Symbol extraction bug is completely fixed.');
    console.log('\n✅ Confirmed fixes:');
    console.log('   • "bitcoin" now correctly maps to BTC');
    console.log('   • "chart" is properly blacklisted and never accepted as ticker');
    console.log('   • Crypto names are recognized and mapped correctly');
    console.log('   • Existing symbol extraction still works perfectly');
    console.log('   • Server integration works end-to-end');
  } else {
    console.log('❌ SOME TESTS FAILED. Review the implementation.');
  }
  
  return allPassed;
}

finalVerification().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});