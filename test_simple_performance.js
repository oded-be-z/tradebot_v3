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

async function testCachedPerformance() {
  console.log('🚀 TESTING CACHED PERFORMANCE');
  console.log('=============================\n');
  
  const sessionId = `cache_test_${Date.now()}`;
  
  // First request to populate cache
  console.log('1. First request (populating cache):');
  const first = await makeRequest("AAPL price", sessionId);
  console.log(`⏱️ Time: ${first._timing}ms`);
  console.log(`📝 Response: ${first.response.substring(0, 60)}...\n`);
  
  // Second identical request (should be cached)
  console.log('2. Second identical request (should use cache):');
  const second = await makeRequest("AAPL price", sessionId);
  console.log(`⏱️ Time: ${second._timing}ms`);
  console.log(`📝 Response: ${second.response.substring(0, 60)}...\n`);
  
  // Third similar request (should partially use cache)
  console.log('3. Similar request (AAPL with different wording):');
  const third = await makeRequest("what is AAPL current price", sessionId);
  console.log(`⏱️ Time: ${third._timing}ms`);
  console.log(`📝 Response: ${third.response.substring(0, 60)}...\n`);
  
  console.log('📊 CACHE PERFORMANCE ANALYSIS:');
  console.log(`✅ First request: ${first._timing}ms (uncached)`);
  console.log(`✅ Second request: ${second._timing}ms (should be faster)`);
  console.log(`✅ Third request: ${third._timing}ms (partially cached)`);
  
  const cacheSpeedup = first._timing / second._timing;
  console.log(`✅ Cache speedup: ${cacheSpeedup.toFixed(1)}x`);
  
  const fastEnough = second._timing < 3000 && third._timing < 3000;
  console.log(`✅ Cached requests under 3s: ${fastEnough ? 'YES ✅' : 'NO ❌'}`);
}

testCachedPerformance().catch(console.error);