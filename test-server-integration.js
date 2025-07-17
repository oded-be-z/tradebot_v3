// Test server integration flow for symbol extraction
const intelligentResponse = require('./services/intelligentResponse');

async function testServerIntegration() {
  console.log('🌐 Testing Server Integration Flow...\n');
  
  const testCases = [
    {
      query: 'show bitcoin chart',
      expectedSymbol: 'BTC',
      expectedType: 'standard_analysis',
      description: 'Bitcoin chart request should extract BTC and generate standard analysis'
    },
    {
      query: 'oil trends with chart',
      expectedSymbol: 'CL',
      expectedType: 'trend_analysis',
      description: 'Oil trends should extract CL and generate trend analysis'
    },
    {
      query: 'ethereum price',
      expectedSymbol: 'ETH',
      expectedType: 'standard_analysis',
      description: 'Ethereum price should extract ETH and generate standard analysis'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: "${testCase.query}"`);
    console.log(`   Expected symbol: ${testCase.expectedSymbol}`);
    console.log(`   Expected type: ${testCase.expectedType}`);
    
    try {
      const result = await intelligentResponse.generateResponse(testCase.query, {});
      
      console.log(`   Result type: ${result.type}`);
      console.log(`   Result symbol: ${result.symbol || 'N/A'}`);
      
      // Check if the correct symbol was extracted
      const symbolMatch = result.symbol === testCase.expectedSymbol;
      const typeMatch = result.type === testCase.expectedType;
      
      if (symbolMatch && typeMatch) {
        console.log(`   ✅ PASS - ${testCase.description}`);
      } else {
        console.log(`   ❌ FAIL - ${testCase.description}`);
        if (!symbolMatch) console.log(`      Symbol mismatch: expected ${testCase.expectedSymbol}, got ${result.symbol}`);
        if (!typeMatch) console.log(`      Type mismatch: expected ${testCase.expectedType}, got ${result.type}`);
      }
      
      // Check if chart is requested when appropriate
      if (testCase.query.includes('chart')) {
        console.log(`   Chart requested: ${result.needsChart ? 'YES' : 'NO'}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR - ${error.message}`);
    }
  }
  
  // Test that "chart" alone doesn't create phantom symbols
  console.log(`\n🔍 Testing edge case: "chart" alone`);
  try {
    const result = await intelligentResponse.generateResponse('chart', {});
    console.log(`   Result type: ${result.type}`);
    console.log(`   Result symbol: ${result.symbol || 'N/A'}`);
    
    if (!result.symbol || result.symbol === null) {
      console.log(`   ✅ PASS - "chart" alone doesn't create phantom symbols`);
    } else {
      console.log(`   ❌ FAIL - "chart" alone created symbol: ${result.symbol}`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}`);
  }
  
  console.log(`\n🎯 Server Integration Test Complete`);
}

testServerIntegration().catch(console.error);