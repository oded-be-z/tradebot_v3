// test_logging_verification.js
// Agent 1: Test to verify pipeline logging is working correctly

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/chat';
const SESSION_URL = 'http://localhost:3000/api/session/init';

async function testLogging() {
  console.log('🧪 Testing Pipeline Logging\n');
  
  try {
    // Create session
    const sessionResp = await axios.post(SESSION_URL);
    const sessionId = sessionResp.data.sessionId;
    console.log(`Session created: ${sessionId}\n`);
    
    console.log('📋 Running test queries to verify logging...\n');
    console.log('Check the server console for detailed pipeline logs.\n');
    
    // Test 1: Simple price query
    console.log('Test 1: Price query - "bitcoin price"');
    await axios.post(API_URL, {
      message: "bitcoin price",
      sessionId: sessionId
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Comparison query
    console.log('\nTest 2: Comparison query - "bitcoin vs gold"');
    await axios.post(API_URL, {
      message: "bitcoin vs gold",
      sessionId: sessionId
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Portfolio query (without portfolio)
    console.log('\nTest 3: Portfolio query - "analyze my portfolio"');
    await axios.post(API_URL, {
      message: "analyze my portfolio",
      sessionId: sessionId
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 4: Educational query (no chart expected)
    console.log('\nTest 4: Educational query - "explain P/E ratio"');
    await axios.post(API_URL, {
      message: "explain P/E ratio",
      sessionId: sessionId
    });
    
    console.log('\n✅ Logging test complete!');
    console.log('\n📊 Expected log sections in server console:');
    console.log('  1. QUERY PIPELINE START');
    console.log('  2. UNDERSTANDING - Azure');
    console.log('  3. DATA FETCHING - Start/Complete');
    console.log('  4. SYNTHESIS - Start/Complete');
    console.log('  4.1 AUTO-CHART DECISION');
    console.log('  5. RESPONSE BUILDING');
    console.log('  6. CHART GENERATION (if applicable)');
    console.log('  7. PIPELINE COMPLETE');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Server is not running!');
      console.log('Please start the server with: npm start');
    }
  }
}

// Run the test
testLogging().catch(console.error);