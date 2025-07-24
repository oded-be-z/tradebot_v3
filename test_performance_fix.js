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

async function testPerformanceFix() {
  console.log('🚀 PERFORMANCE FIX TEST - TARGET: ALL <3000ms');
  console.log('===============================================\n');
  
  const sessionId = `perf_test_${Date.now()}`;
  const queries = [
    "AAPL price",
    "MSFT trend", 
    "NVDA analysis",
    "GOOGL outlook",
    "TSLA performance"
  ];
  
  const results = [];
  
  console.log('Running 5 test queries...\n');
  
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`Query ${i+1}: "${query}"`);
    
    const response = await makeRequest(query, sessionId);
    
    if (response) {
      results.push(response._timing);
      const passed = response._timing < 3000;
      console.log(`⏱️  Time: ${response._timing}ms ${passed ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`📝 Response: ${response.response.substring(0, 80)}...\n`);
    } else {
      console.log(`❌ Failed to get response\n`);
      results.push(999999); // Mark as failed
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Calculate results
  const validResults = results.filter(t => t < 999999);
  const avgTime = validResults.reduce((a, b) => a + b, 0) / validResults.length;
  const allUnder3s = validResults.every(t => t < 3000);
  
  console.log('📊 PERFORMANCE TEST RESULTS:');
  console.log('============================');
  console.log(`✅ Queries tested: ${validResults.length}/5`);
  console.log(`✅ Average time: ${avgTime.toFixed(0)}ms`);
  console.log(`✅ Fastest: ${Math.min(...validResults)}ms`);
  console.log(`✅ Slowest: ${Math.max(...validResults)}ms`);
  console.log(`✅ All under 3000ms: ${allUnder3s ? 'YES ✅' : 'NO ❌'}`);
  
  console.log(`\n🎯 PERFORMANCE FIX: ${allUnder3s ? 'SUCCESS ✅' : 'NEEDS MORE WORK ❌'}`);
  
  return allUnder3s;
}

testPerformanceFix().catch(console.error);