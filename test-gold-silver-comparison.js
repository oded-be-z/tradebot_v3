const axios = require('axios');

const API_URL = 'http://localhost:3000/api/chat';

async function testComparison(query) {
  try {
    console.log(`\n🧪 Testing: "${query}"`);
    console.log('Expected: Properly formatted comparison with GC and SI symbols');
    
    const response = await axios.post(API_URL, {
      message: query,
      sessionId: `test-gold-silver-${Date.now()}`
    });
    
    const data = response.data;
    console.log('\n📥 Response type:', data.type);
    console.log('Has chart:', data.needsChart);
    console.log('Symbols:', data.symbols);
    
    // Check the response text
    const responseText = data.response || JSON.stringify(data);
    
    // Check for key formatting elements
    const checks = {
      hasComparison: responseText.includes('Gold vs Silver Comparison'),
      hasCurrentPrices: responseText.includes('📊 **Current Prices:**'),
      hasPerformance: responseText.includes('📈 **Performance (24h):**'),
      hasMarketAnalysis: responseText.includes('📊 **Market Analysis:**'),
      hasKeyInsight: responseText.includes('💡 **Key Insight:**'),
      hasEngagement: responseText.includes('Would you like me to dive deeper'),
      usesGC: responseText.includes('GC') || data.symbols?.includes('GC'),
      usesSI: responseText.includes('SI') || data.symbols?.includes('SI'),
      hasGoldPrice: responseText.includes('Gold:') && responseText.includes('$'),
      hasSilverPrice: responseText.includes('Silver:') && responseText.includes('$')
    };
    
    console.log('\n✅ Formatting checks:');
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`${passed ? '✓' : '✗'} ${check}`);
    });
    
    // Show the formatted response
    console.log('\n📄 Formatted Response:');
    console.log('─'.repeat(60));
    console.log(responseText);
    console.log('─'.repeat(60));
    
    // Check if all requirements are met
    const allPassed = Object.values(checks).every(v => v);
    if (allPassed) {
      console.log('\n✅ SUCCESS: Comparison properly formatted!');
    } else {
      console.log('\n❌ FAIL: Some formatting requirements not met');
    }
    
    return allPassed;
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    if (error.response) {
      console.log('Response data:', error.response.data);
    }
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing Gold vs Silver Comparison Formatting\n');
  
  const testQueries = [
    'compare gold and silver',
    'gold vs silver',
    'compare GC vs SI',
    'show me gold versus silver'
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const query of testQueries) {
    const success = await testComparison(query);
    if (success) passed++;
    else failed++;
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n\n📊 Final Summary:');
  console.log('================');
  console.log(`Total tests: ${testQueries.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n⚠️  Troubleshooting tips:');
    console.log('1. Check that azureOpenAI.extractStockSymbols maps gold→GC, silver→SI');
    console.log('2. Verify generateComparisonAnalysis uses the new formatting');
    console.log('3. Check server logs for symbol extraction results');
    console.log('4. Ensure NumberFormatter is working for commodity prices');
    console.log('5. Check that comparison type returns "comparison" not "comparison_table"');
  }
}

// Run tests
runTests().catch(console.error);