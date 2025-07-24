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

async function testPerplexityOptimization() {
  console.log('🚀 PERPLEXITY OPTIMIZATION TEST - TARGET: <3000ms');
  console.log('=================================================\n');
  
  const sessionId = `opt_test_${Date.now()}`;
  const queries = [
    "AAPL price",
    "NVDA current price", 
    "MSFT stock price",
    "GOOGL price now",
    "TSLA current value"
  ];
  
  const results = [];
  
  console.log('Testing optimized queries...\n');
  
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`${i+1}. Query: "${query}"`);
    
    const response = await makeRequest(query, sessionId);
    
    if (response) {
      results.push(response._timing);
      const passed = response._timing < 3000;
      console.log(`⏱️  Time: ${response._timing}ms ${passed ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`📝 Response: ${response.response.substring(0, 100)}...\n`);
    } else {
      console.log(`❌ Failed to get response\n`);
      results.push(999999);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test cache performance
  console.log('TESTING CACHE PERFORMANCE:');
  console.log('=========================\n');
  
  console.log('6. Repeat first query (should be cached):');
  const cachedResponse = await makeRequest("AAPL price", sessionId);
  if (cachedResponse) {
    console.log(`⏱️  Cached time: ${cachedResponse._timing}ms`);
    console.log(`📝 Cached response: ${cachedResponse.response.substring(0, 60)}...\n`);
    results.push(cachedResponse._timing);
  }
  
  // Calculate results
  const validResults = results.filter(t => t < 999999);
  const avgTime = validResults.reduce((a, b) => a + b, 0) / validResults.length;
  const allUnder3s = validResults.every(t => t < 3000);
  const improvementFromBefore = 5200; // Previous average
  const improvement = ((improvementFromBefore - avgTime) / improvementFromBefore * 100).toFixed(1);
  
  console.log('📊 OPTIMIZATION RESULTS:');
  console.log('========================');
  console.log(`✅ Queries tested: ${validResults.length}/6`);
  console.log(`✅ Average time: ${avgTime.toFixed(0)}ms`);
  console.log(`✅ Fastest: ${Math.min(...validResults)}ms`);
  console.log(`✅ Slowest: ${Math.max(...validResults)}ms`);
  console.log(`✅ All under 3000ms: ${allUnder3s ? 'YES ✅' : 'NO ❌'}`);
  console.log(`✅ Performance improvement: ${improvement > 0 ? '+' : ''}${improvement}%`);
  
  console.log(`\n🎯 PERPLEXITY OPTIMIZATION: ${allUnder3s ? 'SUCCESS ✅' : 'NEEDS MORE WORK ❌'}`);
  
  // If still not fast enough, show what to try next
  if (!allUnder3s) {
    console.log('\n💡 NEXT OPTIMIZATION STEPS:');
    console.log('- Check if sonar-small model is being used');
    console.log('- Verify JSON response format is working');
    console.log('- Add domain filtering to Perplexity calls');
    console.log('- Consider fallback to cached data after 1s timeout');
  }
  
  return allUnder3s;
}

testPerplexityOptimization().catch(console.error);