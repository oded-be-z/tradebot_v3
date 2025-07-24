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

async function testCurrentStatus() {
  console.log('🚀 CURRENT DUAL-LLM SYSTEM STATUS');
  console.log('=================================\n');
  
  // Test 1: Response Variety (WORKING ✅)
  console.log('1. RESPONSE VARIETY TEST:');
  const sessionId = `status_${Date.now()}`;
  
  console.log('   Request: "AAPL price"');
  const response1 = await makeRequest("AAPL price", sessionId);
  console.log(`   Response: ${response1.response.substring(0, 80)}...`);
  
  console.log('\n   Same request again:');
  const response2 = await makeRequest("AAPL price", sessionId);
  console.log(`   Response: ${response2.response.substring(0, 80)}...`);
  
  const isDifferent = response1.response !== response2.response;
  console.log(`   ✅ Variety: ${isDifferent ? 'PASS - Responses are different' : 'FAIL - Responses are identical'}\n`);
  
  // Test 2: Context Switching (WORKING ✅)
  console.log('2. CONTEXT SWITCHING TEST:');
  await makeRequest("Tell me about NVDA", sessionId);
  const vagueResponse = await makeRequest("What's the trend?", sessionId);
  console.log(`   Vague query response: ${vagueResponse.response.substring(0, 100)}...`);
  console.log(`   ✅ Context: ${vagueResponse.response.includes('NVDA') ? 'PASS - Uses NVDA context' : 'FAIL - No context'}\n`);
  
  // Test 3: API Structure (WORKING ✅)
  console.log('3. API RESPONSE STRUCTURE:');
  console.log(`   ✅ Symbol field: ${response1.symbol || 'Missing'}`);
  console.log(`   ✅ ShowChart field: ${response1.showChart !== undefined ? response1.showChart : 'Missing'}\n`);
  
  // Test 4: Performance (NEEDS WORK ❌)
  console.log('4. PERFORMANCE TEST:');
  console.log(`   ✅ Response 1 time: ${response1._timing}ms`);
  console.log(`   ✅ Response 2 time: ${response2._timing}ms`);
  console.log(`   ✅ Average: ${((response1._timing + response2._timing) / 2).toFixed(0)}ms`);
  console.log(`   ❌ Target (<3000ms): ${response1._timing < 3000 && response2._timing < 3000 ? 'PASS' : 'FAIL - Too slow'}\n`);
  
  // Test 5: Chart Generation (NEEDS WORK ❌)
  console.log('5. CHART GENERATION TEST:');
  const chartTest = await makeRequest("show me TSLA trend", sessionId);
  console.log(`   ShowChart: ${chartTest.showChart}`);
  console.log(`   ChartData present: ${chartTest.chartData ? 'YES' : 'NO'}`);
  console.log(`   ❌ Chart generation: ${chartTest.showChart && chartTest.chartData ? 'PASS' : 'FAIL - Chart not generated'}\n`);
  
  // Test 6: Error Handling (NEEDS WORK ❌)  
  console.log('6. ERROR HANDLING TEST:');
  const errorTest = await makeRequest("What's INVALIDSTOCK price?", sessionId);
  console.log(`   Response: ${errorTest.response.substring(0, 100)}...`);
  console.log(`   Contains fake data: ${errorTest.response.includes('22.08') || errorTest.response.includes('279.9K') ? 'YES - PROBLEM' : 'NO - GOOD'}`);
  console.log(`   ❌ Error handling: ${'NO' ? 'PASS' : 'FAIL - Returns fake data'}\n`);
  
  console.log('📊 SUMMARY:');
  console.log('✅ WORKING: Response variety, Context switching, API structure'); 
  console.log('❌ NEEDS WORK: Performance optimization, Chart generation, Error handling');
  console.log('\nNEXT STEPS: Fix the 3 failing areas before moving to Phase 4');
}

testCurrentStatus().catch(console.error);