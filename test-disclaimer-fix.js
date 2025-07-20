const axios = require('axios');
const logger = require('./utils/logger');

const API_URL = 'http://localhost:3000/api/chat';

async function testQuery(query, expectedBehavior) {
  try {
    console.log(`\n📝 Testing: "${query}"`);
    console.log(`Expected: ${expectedBehavior}`);
    
    const response = await axios.post(API_URL, {
      message: query,
      sessionId: `test-${Date.now()}`
    });
    
    const data = response.data;
    const hasDisclaimer = data.response?.includes("I'm a financial assistant - let's talk about markets!");
    const responseType = data.type;
    
    console.log(`Response type: ${responseType}`);
    console.log(`Has disclaimer: ${hasDisclaimer}`);
    console.log(`Response preview: ${data.response?.substring(0, 100)}...`);
    
    // Check if behavior matches expected
    if (expectedBehavior === 'NO_DISCLAIMER' && hasDisclaimer) {
      console.log('❌ FAIL: Disclaimer appeared when it shouldn\'t');
    } else if (expectedBehavior === 'DISCLAIMER' && !hasDisclaimer) {
      console.log('❌ FAIL: Disclaimer didn\'t appear when it should');
    } else if (expectedBehavior === 'HELP_RESPONSE' && responseType !== 'capability') {
      console.log('❌ FAIL: Expected help response but got different type');
    } else {
      console.log('✅ PASS');
    }
    
    return { query, hasDisclaimer, responseType, success: true };
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return { query, error: error.message, success: false };
  }
}

async function runTests() {
  console.log('🚀 Testing Disclaimer Fix Implementation\n');
  
  const testCases = [
    // Help queries - should show capability response, not disclaimer
    { query: "what can you do?", expected: "HELP_RESPONSE" },
    { query: "help", expected: "HELP_RESPONSE" },
    { query: "how can you help me?", expected: "HELP_RESPONSE" },
    
    // Normal market queries - should NOT show disclaimer
    { query: "what's the price of AAPL?", expected: "NO_DISCLAIMER" },
    { query: "show me Bitcoin price", expected: "NO_DISCLAIMER" },
    { query: "analyze TSLA stock", expected: "NO_DISCLAIMER" },
    { query: "compare MSFT and GOOGL", expected: "NO_DISCLAIMER" },
    { query: "what are FAANG stocks?", expected: "NO_DISCLAIMER" },
    { query: "is NVDA a good investment?", expected: "NO_DISCLAIMER" },
    { query: "show me tech stocks", expected: "NO_DISCLAIMER" },
    { query: "market analysis for crypto", expected: "NO_DISCLAIMER" },
    
    // Date/time queries - should NOT show disclaimer
    { query: "what date is it?", expected: "NO_DISCLAIMER" },
    { query: "current time please", expected: "NO_DISCLAIMER" },
    
    // Company info queries - should NOT show disclaimer  
    { query: "who is the CEO of Apple?", expected: "NO_DISCLAIMER" },
    { query: "when was Microsoft founded?", expected: "NO_DISCLAIMER" },
    
    // Truly non-financial queries - SHOULD show disclaimer
    { query: "what's the weather?", expected: "DISCLAIMER" },
    { query: "tell me a joke", expected: "DISCLAIMER" },
    { query: "how to make pasta?", expected: "DISCLAIMER" },
    { query: "relationship advice", expected: "DISCLAIMER" }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testQuery(testCase.query, testCase.expected);
    results.push(result);
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  // Show any queries that had unexpected disclaimers
  const unexpectedDisclaimers = results.filter(r => 
    r.hasDisclaimer && testCases.find(tc => tc.query === r.query)?.expected === 'NO_DISCLAIMER'
  );
  
  if (unexpectedDisclaimers.length > 0) {
    console.log('\n⚠️  Queries with unexpected disclaimers:');
    unexpectedDisclaimers.forEach(r => {
      console.log(`- "${r.query}"`);
    });
  }
}

// Run tests if server is running
runTests().catch(console.error);