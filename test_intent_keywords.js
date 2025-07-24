// Test the intent keyword fixes
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Queries that were failing due to missing keywords
const testQueries = [
  { query: "apple direction", expect: "trend", intent: "trend_query" },
  { query: "AAPL movement", expect: "trend", intent: "trend_query" },
  { query: "how's apple doing", expect: "analysis", intent: "analysis_query" },
  { query: "apple performance", expect: "analysis", intent: "analysis_query" },
  { query: "AAPL outlook", expect: "trend", intent: "trend_query" },
  { query: "apple momentum", expect: "trend", intent: "trend_query" },
  { query: "AAPL or MSFT", expect: "comparison", intent: "comparison_query" },
  { query: "apple versus microsoft", expect: "comparison", intent: "comparison_query" },
  { query: "better: AAPL MSFT", expect: "comparison", intent: "comparison_query" },
  { query: "AAPL/MSFT", expect: "comparison", intent: "comparison_query" }
];

async function runTests() {
  console.log('🧪 Testing Intent Keyword Enforcement\n');

  // Create session
  try {
    const sessionResp = await axios.post(`${BASE_URL}/api/session/init`);
    const sessionId = sessionResp.data.sessionId;
    console.log(`✅ Session created: ${sessionId}\n`);

    let passed = 0;
    let failed = 0;

    // Test each query
    for (const test of testQueries) {
      process.stdout.write(`Testing "${test.query}" (${test.intent})... `);
      
      try {
        const resp = await axios.post(`${BASE_URL}/api/chat`, {
          message: test.query,
          sessionId: sessionId
        });

        const response = resp.data.response.toLowerCase();
        
        // Check if expected keyword is present
        if (response.includes(test.expect)) {
          console.log(`✅ PASS - Found "${test.expect}"`);
          passed++;
        } else {
          console.log(`❌ FAIL - Missing "${test.expect}"`);
          console.log(`   Response: "${resp.data.response.substring(0, 100)}..."`);
          failed++;
        }
        
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Results: ${passed}/${testQueries.length} passed (${Math.round(passed/testQueries.length*100)}%)`);
    
    if (failed > 0) {
      console.log(`\n⚠️  ${failed} tests failed - intent keywords not being enforced properly`);
    } else {
      console.log(`\n✨ All tests passed - intent keywords working correctly!`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

runTests();