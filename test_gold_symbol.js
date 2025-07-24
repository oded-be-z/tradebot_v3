const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testGoldSymbol() {
  console.log('🧪 Testing Gold Symbol Extraction\n');
  
  // Create session
  const sessionRes = await axios.post(`${BASE_URL}/api/session/init`);
  const sessionId = sessionRes.data.sessionId;
  console.log(`Session created: ${sessionId}\n`);
  
  // Test gold query
  try {
    const res = await axios.post(`${BASE_URL}/api/chat`, {
      message: "how's gold doing?",
      sessionId: sessionId
    });
    
    console.log('Full response:', JSON.stringify(res.data, null, 2));
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

testGoldSymbol().catch(console.error);