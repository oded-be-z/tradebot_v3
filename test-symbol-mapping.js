const axios = require('axios');

const API_URL = 'http://localhost:3000/api/chat';

async function testSymbolMapping(query, expectedSymbols) {
  try {
    console.log(`\n🧪 Testing: "${query}"`);
    console.log(`Expected symbols: [${expectedSymbols.join(', ')}]`);
    
    const response = await axios.post(API_URL, {
      message: query,
      sessionId: `test-symbols-${Date.now()}`
    });
    
    const data = response.data;
    
    console.log('Response type:', data.type);
    console.log('Actual symbols:', data.symbols);
    console.log('Has chart:', !!data.chartData);
    console.log('Success:', data.success);
    
    // Check symbol mapping
    const symbolsMatch = data.symbols && 
                        data.symbols.length === expectedSymbols.length &&
                        expectedSymbols.every(symbol => data.symbols.includes(symbol));
    
    const hasChart = !!data.chartData;
    const isComparisonType = data.type === 'comparison_table' || data.type === 'comparison';
    
    console.log('\n✅ Checks:');
    console.log(`${symbolsMatch ? '✓' : '✗'} Correct symbols (${data.symbols?.join(', ') || 'none'} vs ${expectedSymbols.join(', ')})`);
    console.log(`${isComparisonType ? '✓' : '✗'} Comparison type`);
    console.log(`${hasChart ? '✓' : '✗'} Chart generated`);
    
    if (symbolsMatch && hasChart && isComparisonType) {
      console.log('\n🎉 SUCCESS: All checks passed!');
      return true;
    } else {
      console.log('\n❌ FAIL: Some checks failed');
      if (!symbolsMatch) {
        console.log(`   - Wrong symbols: got [${data.symbols?.join(', ') || 'none'}], expected [${expectedSymbols.join(', ')}]`);
      }
      if (!hasChart) {
        console.log('   - No chart generated');
      }
      if (!isComparisonType) {
        console.log(`   - Wrong type: got "${data.type}", expected comparison_table`);
      }
      return false;
    }
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    return false;
  }
}

async function runSymbolMappingTests() {
  console.log('🚀 Testing Symbol Mapping Fixes\n');
  
  const testCases = [
    {
      query: 'compare gold and silver',
      expectedSymbols: ['GC', 'SI']
    },
    {
      query: 'gold vs silver',
      expectedSymbols: ['GC', 'SI']  
    },
    {
      query: 'GC vs SI',
      expectedSymbols: ['GC', 'SI']
    },
    {
      query: 'compare AAPL and MSFT',
      expectedSymbols: ['AAPL', 'MSFT']
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const success = await testSymbolMapping(testCase.query, testCase.expectedSymbols);
    if (success) passed++;
    else failed++;
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n\n📊 Final Results:');
  console.log('================');
  console.log(`Total tests: ${testCases.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n🔧 If tests are failing:');
    console.log('1. Check server logs to see what symbols Azure OpenAI is returning');
    console.log('2. Verify azureOpenAI.js has the updated commodity mapping');
    console.log('3. Make sure gold→GC and silver→SI in the prompt examples');
    console.log('4. Check that comparison_table type triggers chart generation');
  } else {
    console.log('\n🎉 All symbol mapping tests passed!');
    console.log('✅ Gold/Silver correctly map to GC/SI');
    console.log('✅ Comparison charts are being generated');
  }
}

// Run the tests
runSymbolMappingTests().catch(console.error);