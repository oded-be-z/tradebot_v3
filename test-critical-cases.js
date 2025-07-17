// Test critical production cases
const intelligentResponse = require('./services/intelligentResponse');
const safeSymbol = require('./src/utils/safeSymbol');

async function testCriticalCases() {
  console.log('🎯 TESTING CRITICAL PRODUCTION CASES\n');
  
  const criticalTests = [
    { query: 'show bitcoin chart', expectedSymbol: 'BTC', description: 'Original bug case' },
    { query: 'ethereum price', expectedSymbol: 'ETH', description: 'Simple crypto query' },
    { query: 'oil trends with chart', expectedSymbol: 'CL', description: 'Commodity with chart' },
    { query: 'analyze AAPL chart', expectedSymbol: 'AAPL', description: 'Stock with chart' },
    { query: 'gold vs silver', expectedSymbol: 'GC', description: 'Commodity comparison' }
  ];
  
  for (const test of criticalTests) {
    console.log(`\n📊 Test: "${test.query}"`);
    console.log(`   Expected: ${test.expectedSymbol}`);
    console.log(`   Description: ${test.description}`);
    
    // Test symbol extraction
    const symbols = safeSymbol.extractSafeSymbols(test.query);
    console.log(`   Extracted symbols: [${symbols.join(', ')}]`);
    
    // Verify no CHART ticker
    const hasChartTicker = symbols.includes('CHART') || symbols.includes('GRAPH') || symbols.includes('TREND');
    console.log(`   No CHART ticker: ${!hasChartTicker ? '✅' : '❌'}`);
    
    // Test full response
    try {
      const response = await intelligentResponse.generateResponse(test.query, {});
      console.log(`   Response symbol: ${response.symbol || 'None'}`);
      console.log(`   Response type: ${response.type}`);
      console.log(`   Has analysis: ${response.analysis ? 'Yes' : 'No'}`);
      
      // Check data consistency
      if (response.data && response.data.price) {
        console.log(`   Data price: $${response.data.price}`);
        
        // Extract price from analysis
        const analysisMatch = response.analysis && response.analysis.match(/\$([0-9,]+\.?\d*)/);
        if (analysisMatch) {
          const analysisPrice = parseFloat(analysisMatch[1].replace(/,/g, ''));
          console.log(`   Analysis price: $${analysisPrice}`);
          console.log(`   Price consistency: ${Math.abs(analysisPrice - response.data.price) < 0.01 ? '✅' : '❌'}`);
        }
      }
      
      // Overall result
      const passed = response.symbol === test.expectedSymbol && !hasChartTicker;
      console.log(`   Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }
  
  console.log('\n✅ Critical test cases completed!');
}

testCriticalCases().catch(console.error);