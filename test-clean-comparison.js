const axios = require('axios');

const API_URL = 'http://localhost:3000/api/chat';

async function testCleanComparison(query) {
  try {
    console.log(`\n🧪 Testing clean comparison format: "${query}"`);
    
    const response = await axios.post(API_URL, {
      message: query,
      sessionId: `test-clean-${Date.now()}`
    });
    
    const data = response.data;
    const responseText = data.response;
    
    console.log('\n📊 Response Analysis:');
    console.log('Type:', data.type);
    console.log('Has chart:', !!data.chartData);
    console.log('Success:', data.success);
    
    if (responseText) {
      console.log('\n📄 Formatted Response:');
      console.log('─'.repeat(60));
      console.log(responseText);
      console.log('─'.repeat(60));
      
      // Check formatting requirements
      const checks = {
        hasTitle: responseText.includes(' vs '),
        hasCurrent: responseText.includes('Current:'),
        has24hChange: responseText.includes('24h Change:'),
        hasQuickTake: responseText.includes('Quick Take:'),
        hasSimpleEnding: responseText.includes('Want to dive deeper?'),
        isNotVerbose: responseText.length < 500, // Should be concise
        noExcessiveEmojis: (responseText.match(/📊|📈|💡|🎯|🔥|⚡|🚀/g) || []).length <= 2,
        noExcessiveFormatting: (responseText.match(/\*\*/g) || []).length === 0 // No bold markdown
      };
      
      console.log('\n✅ Format checks:');
      Object.entries(checks).forEach(([check, passed]) => {
        console.log(`${passed ? '✓' : '✗'} ${check}`);
      });
      
      // Check readability
      const lines = responseText.split('\n').filter(line => line.trim());
      const readabilityChecks = {
        hasReasonableLines: lines.length <= 6, // Should be 4-6 lines max
        noWallsOfText: lines.every(line => line.length < 100), // No super long lines
        clearStructure: responseText.includes('\n\n') // Has proper spacing
      };
      
      console.log('\n📖 Readability checks:');
      Object.entries(readabilityChecks).forEach(([check, passed]) => {
        console.log(`${passed ? '✓' : '✗'} ${check}`);
      });
      
      // Overall assessment
      const allFormatPassed = Object.values(checks).every(v => v);
      const allReadabilityPassed = Object.values(readabilityChecks).every(v => v);
      
      if (allFormatPassed && allReadabilityPassed) {
        console.log('\n🎉 SUCCESS: Clean, scannable comparison format!');
        return true;
      } else {
        console.log('\n❌ FAIL: Format needs improvement');
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

async function runCleanComparisonTests() {
  console.log('🚀 Testing Clean Comparison Format\n');
  
  const testQueries = [
    'compare gold and silver',
    'gold vs silver',
    'AAPL vs MSFT',
    'Bitcoin vs Ethereum'
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const query of testQueries) {
    const success = await testCleanComparison(query);
    if (success) passed++;
    else failed++;
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n\n📊 Final Results:');
  console.log('================');
  console.log(`Total tests: ${testQueries.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (passed === testQueries.length) {
    console.log('\n🎉 All tests passed! Clean comparison format working perfectly.');
    console.log('\n✅ Format is now:');
    console.log('  - Scannable and concise');
    console.log('  - Key info only (price, change, insight)');
    console.log('  - No emoji overload');
    console.log('  - No excessive formatting');
    console.log('  - Quick to read');
  } else {
    console.log('\n🔧 Some tests failed. Check the format requirements.');
  }
}

// Run the tests
runCleanComparisonTests().catch(console.error);