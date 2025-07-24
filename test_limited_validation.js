// Limited test of the meaning variations that were failing
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Just the meaning variations that were previously failing
const testQueries = [
  { query: "apple direction", expect: "trend", category: "meaning" },
  { query: "AAPL movement", expect: "trend", category: "meaning" },
  { query: "how's apple doing", expect: "analysis", category: "meaning" },
  { query: "apple performance", expect: "analysis", category: "meaning" },
  { query: "AAPL outlook", expect: "trend", category: "meaning" },
  { query: "apple momentum", expect: "trend", category: "meaning" },
  { query: "AAPL or MSFT", expect: "comparison", category: "meaning" },
  { query: "apple versus microsoft", expect: "comparison", category: "meaning" },
  { query: "better: AAPL MSFT", expect: "comparison", category: "meaning" },
  { query: "AAPL/MSFT", expect: "comparison", category: "meaning" },
  { query: "apple > microsoft?", expect: "comparison", category: "meaning" },
  { query: "AAPL v MSFT", expect: "comparison", category: "meaning" }
];

async function runTests() {
  console.log('🧪 Testing Fixed Meaning Variations\n');

  try {
    const sessionResp = await axios.post(`${BASE_URL}/api/session/init`);
    const sessionId = sessionResp.data.sessionId;
    console.log(`✅ Session created: ${sessionId}\n`);

    let passed = 0;
    let failed = 0;

    for (const test of testQueries) {
      process.stdout.write(`Testing "${test.query}"... `);
      
      try {
        const resp = await axios.post(`${BASE_URL}/api/chat`, {
          message: test.query,
          sessionId: sessionId
        });

        const response = resp.data.response.toLowerCase();
        
        if (response.includes(test.expect)) {
          console.log(`✅ PASS`);
          passed++;
        } else {
          console.log(`❌ FAIL - Missing "${test.expect}"`);
          console.log(`   Response: "${resp.data.response.substring(0, 80)}..."`);
          failed++;
        }
        
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Results: ${passed}/${testQueries.length} passed (${Math.round(passed/testQueries.length*100)}%)`);
    
    if (passed === testQueries.length) {
      console.log(`\n✨ All meaning variation tests now pass!`);
    } else {
      console.log(`\n⚠️  ${failed} tests still failing`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

runTests();