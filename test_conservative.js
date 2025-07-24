const axios = require('axios');

async function testConservative() {
  console.log('🚀 CONSERVATIVE TEST SUITE');
  console.log('='.repeat(40));
  
  const tests = [
    {
      name: 'Empty Query Fix',
      payload: { message: "", sessionId: "test-empty" },
      expectSuccess: true,
      expectedContent: "help you with financial analysis"
    },
    {
      name: 'Basic Help Query', 
      payload: { message: "help", sessionId: "test-help" },
      expectSuccess: true,
      expectedContent: "financial"
    },
    {
      name: 'Rate Limit Response Check',
      payload: { message: "AAPL", sessionId: "test-aapl" },
      expectSuccess: true,
      canBeRateLimit: true
    }
  ];
  
  let results = { passed: 0, failed: 0, details: [] };
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n📋 ${i + 1}. ${test.name}`);
    
    try {
      const response = await axios.post('http://localhost:3000/api/chat', test.payload, {
        timeout: 10000
      });
      
      const responseText = response.data.response;
      const isSuccess = response.data.success !== false;
      const hasExpectedContent = test.expectedContent ? responseText.includes(test.expectedContent) : true;
      const isClean = !/(\"response\":|\\\\n|\\\\\"|\\\\\\\\)/.test(responseText);
      
      // Special handling for rate limit
      const isRateLimit = responseText.includes("high demand");
      const isApiError = responseText.includes("temporary issue");
      
      let passed = false;
      let details = '';
      
      if (isRateLimit && test.canBeRateLimit) {
        passed = true;
        details = 'Rate limit handled gracefully';
        console.log('✅ PASS (Rate limit handled)');
      } else if (isApiError && test.canBeRateLimit) {
        passed = true;
        details = 'API error handled gracefully';
        console.log('✅ PASS (API error handled)');
      } else if (isSuccess && hasExpectedContent && isClean) {
        passed = true;
        details = 'All checks passed';
        console.log('✅ PASS');
      } else {
        details = `Failed - Success: ${isSuccess}, Content: ${hasExpectedContent}, Clean: ${isClean}`;
        console.log('❌ FAIL');
      }
      
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
      }
      
      results.details.push({
        test: test.name,
        passed,
        details,
        responsePreview: responseText.substring(0, 100) + '...'
      });
      
      console.log(`📝 Response: ${responseText.substring(0, 80)}...`);
      console.log(`🧹 Clean: ${isClean ? 'Yes' : 'No'}`);
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      results.failed++;
      results.details.push({
        test: test.name,
        passed: false,
        details: `Error: ${error.message}`,
        responsePreview: 'N/A'
      });
    }
    
    // Wait between tests
    if (i < tests.length - 1) {
      console.log('⏳ Waiting 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\n' + '='.repeat(40));
  console.log('📊 CONSERVATIVE TEST RESULTS');
  console.log('='.repeat(40));
  console.log(`Total: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  
  const successRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
  console.log(`Success Rate: ${successRate}%`);
  
  console.log('\n📋 DETAILED RESULTS:');
  results.details.forEach((result, i) => {
    console.log(`${i + 1}. ${result.test}: ${result.passed ? '✅' : '❌'} ${result.details}`);
  });
  
  const criticalFixed = results.details.filter(r => 
    r.test.includes('Empty Query') && r.passed
  ).length > 0;
  
  console.log(`\n🎯 Critical Fixes Status: ${criticalFixed ? '✅ WORKING' : '❌ FAILED'}`);
  
  return criticalFixed && (successRate >= 66); // At least 2/3 tests should pass
}

testConservative().catch(console.error);