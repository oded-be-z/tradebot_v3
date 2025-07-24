const axios = require('axios');
const fs = require('fs');

const PORT = 3000;
const API_URL = `http://localhost:${PORT}/api/chat`;

// Helper to make API request
async function makeRequest(message, sessionId) {
  try {
    const response = await axios.post(API_URL, {
      message,
      sessionId
    });
    return response.data;
  } catch (error) {
    console.error('Request error:', error.message);
    return null;
  }
}

// Test 1: Response Variety Test
async function testResponseVariety() {
  console.log('🎯 TEST 1: RESPONSE VARIETY TEST');
  console.log('================================\n');
  
  const sessionId = `variety_test_${Date.now()}`;
  const responses = [];
  
  for (let i = 0; i < 5; i++) {
    const response = await makeRequest("AAPL price", sessionId);
    if (response) {
      responses.push(response.response);
      console.log(`Response ${i+1}: ${response.response}\n`);
    }
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Check uniqueness
  const uniqueResponses = new Set(responses);
  console.log(`\n✅ Unique responses: ${uniqueResponses.size}/5`);
  console.log(`✅ Variety achieved: ${uniqueResponses.size === 5 ? 'PASS' : 'FAIL'}\n`);
  
  return uniqueResponses.size === 5;
}

// Test 2: Portfolio Variety Test
async function testPortfolioVariety() {
  console.log('\n🎯 TEST 2: PORTFOLIO VARIETY TEST');
  console.log('==================================\n');
  
  const sessionId = `portfolio_test_${Date.now()}`;
  
  // First upload a portfolio
  console.log('Uploading test portfolio...');
  const portfolioData = {
    holdings: [
      { symbol: 'AAPL', shares: 100, avgCost: 150 },
      { symbol: 'MSFT', shares: 50, avgCost: 300 },
      { symbol: 'NVDA', shares: 25, avgCost: 400 },
      { symbol: 'GOOGL', shares: 20, avgCost: 100 }
    ]
  };
  
  try {
    await axios.post(`http://localhost:${PORT}/api/portfolio/upload`, {
      sessionId,
      portfolio: portfolioData
    });
    console.log('Portfolio uploaded successfully\n');
  } catch (error) {
    console.error('Failed to upload portfolio:', error.message);
    return false;
  }
  
  // Now ask for analysis 3 times
  const analyses = [];
  for (let i = 0; i < 3; i++) {
    const response = await makeRequest("analyze my portfolio", sessionId);
    if (response) {
      analyses.push(response.response);
      console.log(`Analysis ${i+1}: ${response.response.substring(0, 150)}...\n`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Check uniqueness
  const uniqueAnalyses = new Set(analyses);
  console.log(`\n✅ Unique analyses: ${uniqueAnalyses.size}/3`);
  console.log(`✅ Variety achieved: ${uniqueAnalyses.size === 3 ? 'PASS' : 'FAIL'}\n`);
  
  return uniqueAnalyses.size === 3;
}

// Test 3: Performance Breakdown
async function testPerformanceBreakdown() {
  console.log('\n🎯 TEST 3: PERFORMANCE BREAKDOWN');
  console.log('=================================\n');
  
  const sessionId = `perf_test_${Date.now()}`;
  
  // Make 3 requests and average the performance
  const queries = ["TSLA trend", "Compare AAPL and MSFT", "What's hot today?"];
  let totalTimes = [];
  
  for (const query of queries) {
    console.log(`Testing: "${query}"`);
    const startTime = Date.now();
    const response = await makeRequest(query, sessionId);
    const totalTime = Date.now() - startTime;
    
    if (response) {
      totalTimes.push(totalTime);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Response: ${response.response.substring(0, 100)}...\n`);
    }
  }
  
  const avgTime = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length;
  console.log(`\n✅ Average response time: ${avgTime.toFixed(0)}ms`);
  console.log(`✅ Performance target (<3000ms): ${avgTime < 3000 ? 'PASS' : 'FAIL'}\n`);
  
  return avgTime < 3000;
}

// Test 4: Chart Generation Test
async function testChartGeneration() {
  console.log('\n🎯 TEST 4: CHART GENERATION TEST');
  console.log('=================================\n');
  
  const sessionId = `chart_test_${Date.now()}`;
  
  const response = await makeRequest("show me TSLA trend", sessionId);
  
  if (response) {
    console.log(`Response: ${response.response.substring(0, 100)}...`);
    console.log(`\n✅ showChart field: ${response.showChart}`);
    console.log(`✅ Chart data present: ${response.chartData ? 'YES' : 'NO'}`);
    console.log(`✅ Response type: ${response.type}`);
    console.log(`✅ Symbol: ${response.symbol}`);
    
    if (response.chartData) {
      console.log(`✅ Chart type: ${response.chartData.type || 'Unknown'}`);
    }
    
    console.log(`\n✅ Chart generation: ${response.showChart && response.chartData ? 'PASS' : 'FAIL'}\n`);
    
    return response.showChart && response.chartData;
  }
  
  return false;
}

// Test 5: Error Handling Test
async function testErrorHandling() {
  console.log('\n🎯 TEST 5: ERROR HANDLING TEST');
  console.log('===============================\n');
  
  const sessionId = `error_test_${Date.now()}`;
  const errorResponses = [];
  
  // Test with multiple fake symbols
  const fakeSymbols = ["XYZABC", "FAKESYMBOL", "NOTREAL"];
  
  for (const symbol of fakeSymbols) {
    const response = await makeRequest(`What's the price of ${symbol}?`, sessionId);
    if (response) {
      errorResponses.push(response.response);
      console.log(`${symbol} response: ${response.response}\n`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Check if responses are different (not templated)
  const uniqueErrors = new Set(errorResponses);
  console.log(`\n✅ Unique error messages: ${uniqueErrors.size}/${fakeSymbols.length}`);
  console.log(`✅ Dynamic errors: ${uniqueErrors.size > 1 ? 'PASS' : 'FAIL'}\n`);
  
  return uniqueErrors.size > 1;
}

// Run all tests
async function runAllTests() {
  console.log('🚀 COMPREHENSIVE DUAL-LLM SYSTEM TESTS');
  console.log('======================================\n');
  
  const results = {
    variety: false,
    portfolio: false,
    performance: false,
    charts: false,
    errors: false
  };
  
  // Run tests sequentially
  results.variety = await testResponseVariety();
  results.portfolio = await testPortfolioVariety();
  results.performance = await testPerformanceBreakdown();
  results.charts = await testChartGeneration();
  results.errors = await testErrorHandling();
  
  // Summary
  console.log('\n📊 FINAL RESULTS SUMMARY');
  console.log('========================');
  console.log(`✅ Response Variety: ${results.variety ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Portfolio Variety: ${results.portfolio ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Performance (<3s): ${results.performance ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Chart Generation: ${results.charts ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Dynamic Errors: ${results.errors ? 'PASS' : 'FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r === true);
  console.log(`\n🎯 OVERALL: ${allPassed ? 'ALL TESTS PASSED! ✅' : 'SOME TESTS FAILED ❌'}`);
  
  // Save results to file
  fs.writeFileSync('dual_llm_test_results.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    allPassed
  }, null, 2));
  
  console.log('\nResults saved to dual_llm_test_results.json');
}

// Run the tests
runAllTests().catch(console.error);