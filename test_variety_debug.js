const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testVariety() {
  console.log('🧪 Testing Response Variety\n');
  
  // Create session
  const sessionRes = await axios.post(`${BASE_URL}/api/session/init`);
  const sessionId = sessionRes.data.sessionId;
  console.log(`Session created: ${sessionId}\n`);
  
  // Test with a simple query 3 times
  const responses = [];
  const query = "what's the price of AAPL?";
  
  for (let i = 0; i < 3; i++) {
    console.log(`\nAttempt ${i + 1}:`);
    try {
      const res = await axios.post(`${BASE_URL}/api/chat`, {
        message: query,
        sessionId: sessionId
      });
      
      const response = res.data.response;
      responses.push(response);
      console.log(`Response length: ${response.length}`);
      console.log(`Response: ${response.substring(0, 100)}...`);
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }
  
  // Check variety
  const uniqueResponses = new Set(responses).size;
  console.log(`\n\nVariety Check: ${uniqueResponses}/${responses.length} unique responses`);
  console.log(uniqueResponses === responses.length ? '✅ PASS' : '❌ FAIL');
  
  // Show all responses for comparison
  console.log('\nAll responses:');
  responses.forEach((r, i) => {
    console.log(`\n${i + 1}. ${r}`);
  });
}

testVariety().catch(console.error);