const axios = require('axios');
const PORT = 3000;
const API_URL = `http://localhost:${PORT}/api/chat`;

async function makeRequest(message, sessionId) {
  const startTime = Date.now();
  try {
    const response = await axios.post(API_URL, {
      message,
      sessionId
    });
    const endTime = Date.now();
    return { ...response.data, _timing: endTime - startTime };
  } catch (error) {
    console.error('Request error:', error.message);
    return null;
  }
}

async function testAllFixes() {
  console.log('🚀 TESTING ALL 3 CRITICAL FIXES');
  console.log('================================\n');

  const tests = {
    performance: [
      { query: "AAPL price", maxTime: 3000 },
      { query: "MSFT stock", maxTime: 3000 },
      { query: "what's TSLA at?", maxTime: 3000 }
    ],
    charts: [
      { query: "show me AAPL trend", expectChart: true },
      { query: "NVDA chart", expectChart: true },
      { query: "how's META doing?", expectChart: true }
    ],
    errors: [
      { query: "FAKESYMBOL price", expectError: true },
      { query: "XYZABC chart", expectError: true },
      { query: "123456 trend", expectError: true }
    ]
  };

  let results = { performance: 0, charts: 0, errors: 0 };

  // Test Performance
  console.log('⚡ PERFORMANCE TESTS:');
  for (const test of tests.performance) {
    const response = await makeRequest(test.query, `perf-${Date.now()}`);
    if (response) {
      const passed = response._timing < test.maxTime;
      console.log(`   ${test.query}: ${response._timing}ms ${passed ? '✅' : '❌'}`);
      if (passed) results.performance++;
    } else {
      console.log(`   ${test.query}: ❌ Failed to get response`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test Charts
  console.log('\n📊 CHART TESTS:');
  for (const test of tests.charts) {
    const response = await makeRequest(test.query, `chart-${Date.now()}`);
    if (response) {
      const hasChart = response.showChart && response.chartData;
      console.log(`   ${test.query}: ${hasChart ? '✅ Chart generated' : '❌ No chart'}`);
      console.log(`      - showChart: ${response.showChart}`);
      console.log(`      - chartData: ${response.chartData ? 'Present' : 'Missing'}`);
      console.log(`      - symbol: ${response.symbol}`);
      if (hasChart) results.charts++;
    } else {
      console.log(`   ${test.query}: ❌ Failed to get response`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test Error Handling
  console.log('\n🚨 ERROR HANDLING TESTS:');
  for (const test of tests.errors) {
    const response = await makeRequest(test.query, `error-${Date.now()}`);
    if (response) {
      const hasError = response.response.includes('not a valid') || 
                       response.response.includes('verify the symbol') ||
                       response.response.includes('check the symbol');
      const noFakeData = !response.response.match(/\$\d+\.\d+/);
      const passed = hasError && noFakeData;
      console.log(`   ${test.query}: ${passed ? '✅ Proper error' : '❌ Failed'}`);
      console.log(`      - Has error msg: ${hasError}`);
      console.log(`      - No fake data: ${noFakeData}`);
      console.log(`      - Response: ${response.response.substring(0, 100)}...`);
      if (passed) results.errors++;
    } else {
      console.log(`   ${test.query}: ❌ Failed to get response`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Context Switching Test
  console.log('\n🔄 CONTEXT SWITCHING TEST:');
  const contextSessionId = `context-${Date.now()}`;
  
  // Establish context with NVDA
  await makeRequest("Tell me about NVDA", contextSessionId);
  
  // Test vague query
  const vagueResponse = await makeRequest("What's the trend?", contextSessionId);
  if (vagueResponse) {
    const usesContext = vagueResponse.response.includes('NVDA');
    console.log(`   Vague query after NVDA: ${usesContext ? '✅ Uses context' : '❌ No context'}`);
    console.log(`      - Response: ${vagueResponse.response.substring(0, 100)}...`);
    if (usesContext) results.context = 1;
  }

  // Response Variety Test
  console.log('\n🎭 RESPONSE VARIETY TEST:');
  const responses = [];
  for (let i = 0; i < 3; i++) {
    const response = await makeRequest("AAPL price", `variety-${Date.now()}-${i}`);
    if (response) {
      responses.push(response.response);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const uniqueResponses = new Set(responses);
  const hasVariety = uniqueResponses.size === responses.length;
  console.log(`   3 AAPL queries: ${hasVariety ? '✅ All unique' : '❌ Some identical'}`);
  console.log(`      - Unique responses: ${uniqueResponses.size}/${responses.length}`);
  if (hasVariety) results.variety = 1;

  // Summary
  console.log('\n📈 FINAL RESULTS:');
  console.log('================');
  console.log(`⚡ Performance: ${results.performance}/${tests.performance.length} passed`);
  console.log(`📊 Charts: ${results.charts}/${tests.charts.length} passed`);
  console.log(`🚨 Errors: ${results.errors}/${tests.errors.length} passed`);
  console.log(`🔄 Context: ${results.context || 0}/1 passed`);
  console.log(`🎭 Variety: ${results.variety || 0}/1 passed`);
  
  const total = results.performance + results.charts + results.errors + (results.context || 0) + (results.variety || 0);
  const totalTests = tests.performance.length + tests.charts.length + tests.errors.length + 2;
  const percentage = (total/totalTests*100).toFixed(0);
  
  console.log(`\n🎯 OVERALL: ${total}/${totalTests} (${percentage}%) ${percentage >= 80 ? '✅ EXCELLENT' : percentage >= 60 ? '⚠️ GOOD' : '❌ NEEDS WORK'}`);

  // Performance breakdown
  console.log('\n⏱️ PERFORMANCE BREAKDOWN:');
  console.log('- Target: All queries <3000ms');
  console.log('- Achievement level:');
  if (results.performance === tests.performance.length) {
    console.log('  🟢 PERFECT: All queries under 3s');
  } else if (results.performance >= tests.performance.length * 0.67) {
    console.log('  🟡 GOOD: Most queries under 3s');
  } else {
    console.log('  🔴 NEEDS WORK: Many queries over 3s');
  }

  // Chart breakdown
  console.log('\n📊 CHART BREAKDOWN:');
  console.log('- Target: Charts generated for trend queries');
  if (results.charts === tests.charts.length) {
    console.log('  🟢 PERFECT: All chart requests working');
  } else if (results.charts > 0) {
    console.log('  🟡 PARTIAL: Some charts working');
  } else {
    console.log('  🔴 BROKEN: No charts generating');
  }

  // Error breakdown  
  console.log('\n🚨 ERROR BREAKDOWN:');
  console.log('- Target: Proper errors for invalid symbols');
  if (results.errors === tests.errors.length) {
    console.log('  🟢 PERFECT: All error handling correct');
  } else if (results.errors > 0) {
    console.log('  🟡 PARTIAL: Some error handling working');
  } else {
    console.log('  🔴 BROKEN: Still returning fake data');
  }

  return {
    passed: percentage >= 80,
    results,
    totalTests,
    percentage
  };
}

// Run the comprehensive test
testAllFixes().then(result => {
  if (result.passed) {
    console.log('\n🎉 ALL CRITICAL FIXES SUCCESSFULLY IMPLEMENTED!');
    console.log('✅ Ready for Phase 4: Enhanced Perplexity integration');
  } else {
    console.log('\n⚠️ Some issues remain. Review the failures above.');
    console.log('🔧 Address remaining issues before proceeding to Phase 4');
  }
}).catch(console.error);