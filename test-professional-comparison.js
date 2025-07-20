const axios = require('axios');

const API_URL = 'http://localhost:3000/api/chat';

async function testProfessionalComparison(query, assetType) {
  try {
    console.log(`\n🧪 Testing ${assetType}: "${query}"`);
    
    const response = await axios.post(API_URL, {
      message: query,
      sessionId: `test-pro-${Date.now()}`
    });
    
    const data = response.data;
    const responseText = data.response;
    
    console.log('Response type:', data.type);
    console.log('Has chart:', !!data.chartData);
    console.log('Success:', data.success);
    
    if (responseText) {
      console.log('\n📄 Professional Comparison:');
      console.log('─'.repeat(60));
      console.log(responseText);
      console.log('─'.repeat(60));
      
      // Check professional format requirements
      const formatChecks = {
        hasTitle: responseText.includes('📊') && responseText.includes('Comparison'),
        hasSeparators: responseText.includes('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'),
        hasPricesSection: responseText.includes('💰 CURRENT PRICES'),
        hasPerformanceSection: responseText.includes('📈 24H PERFORMANCE'),
        hasInsightSection: responseText.includes('💡 MARKET INSIGHT'),
        hasTradingSection: responseText.includes('🎯 TRADING CONSIDERATION'),
        hasCallToAction: responseText.includes('Need deeper analysis? Just ask! 🔍')
      };
      
      // Check content quality
      const contentChecks = {
        hasRealInsight: !responseText.includes('showing similar performance') || responseText.includes('ratio') || responseText.includes('momentum'),
        hasActionableAdvice: responseText.includes('Consider') || responseText.includes('wait for') || responseText.includes('scaling'),
        isReadableLength: responseText.length > 200 && responseText.length < 800,
        hasProperStructure: (responseText.match(/\n\n/g) || []).length >= 4 // Proper spacing
      };
      
      // Check visual appeal
      const visualChecks = {
        appropriateEmojis: (responseText.match(/📊|📈|💰|💡|🎯|🔍/g) || []).length >= 5,
        noOverformatting: (responseText.match(/\*\*/g) || []).length === 0,
        clearSections: responseText.split('\n').filter(line => line.includes('━')).length >= 2
      };
      
      console.log('\n✅ Format checks:');
      Object.entries(formatChecks).forEach(([check, passed]) => {
        console.log(`${passed ? '✓' : '✗'} ${check}`);
      });
      
      console.log('\n📊 Content checks:');
      Object.entries(contentChecks).forEach(([check, passed]) => {
        console.log(`${passed ? '✓' : '✗'} ${check}`);
      });
      
      console.log('\n🎨 Visual checks:');
      Object.entries(visualChecks).forEach(([check, passed]) => {
        console.log(`${passed ? '✓' : '✗'} ${check}`);
      });
      
      // Overall assessment
      const allFormatPassed = Object.values(formatChecks).every(v => v);
      const allContentPassed = Object.values(contentChecks).every(v => v);
      const allVisualPassed = Object.values(visualChecks).every(v => v);
      
      if (allFormatPassed && allContentPassed && allVisualPassed) {
        console.log('\n🎉 SUCCESS: Professional comparison format!');
        return true;
      } else {
        console.log('\n❌ FAIL: Some requirements not met');
        return false;
      }
    } else {
      console.log('\n❌ No response text found');
      return false;
    }
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    return false;
  }
}

async function runProfessionalComparisonTests() {
  console.log('🚀 Testing Professional Comparison Format Across Asset Types\n');
  
  const testCases = [
    { query: 'compare gold and silver', type: 'Commodities' },
    { query: 'AAPL vs MSFT', type: 'Stocks' },
    { query: 'Bitcoin vs Ethereum', type: 'Crypto' },
    { query: 'NVDA vs AMD', type: 'Tech Stocks' },
    { query: 'JPM vs BAC', type: 'Bank Stocks' },
    { query: 'oil vs gold', type: 'Mixed Commodities' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const success = await testProfessionalComparison(testCase.query, testCase.type);
    if (success) passed++;
    else failed++;
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n\n📊 Final Professional Format Results:');
  console.log('=====================================');
  console.log(`Total tests: ${testCases.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (passed === testCases.length) {
    console.log('\n🎉 All tests passed! Professional comparison format working perfectly.');
    console.log('\n✅ The format now includes:');
    console.log('  📊 Professional title with visual separators');
    console.log('  💰 Clear current prices section');
    console.log('  📈 24h performance data');
    console.log('  💡 Asset-specific market insights');
    console.log('  🎯 Actionable trading considerations');
    console.log('  🔍 Clear call-to-action');
    console.log('\n🏆 This looks like a mini professional report!');
  } else {
    console.log('\n🔧 Some tests failed. The professional format needs refinement.');
    console.log('\nCheck that all sections are present and insights are meaningful.');
  }
}

// Run the tests
runProfessionalComparisonTests().catch(console.error);