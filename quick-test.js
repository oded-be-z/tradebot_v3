const axios = require('axios');

// Test only the critical failing cases
const criticalTests = [
  { query: "who is the CEO of Apple?", expect: "Tim Cook", description: "Company info - CEO query" },
  { query: "what date is it now?", expect: "2025", description: "Date/time query" },
  { query: "what time is it?", expect: ["AM", "PM"], description: "Time query" },
  { query: "bitcoin", expect: "BTC", description: "Crypto query" },
  { query: "ethereum", expect: "ETH", description: "Crypto query 2" },
  { query: "compare them", expect: ["comparison", "BTC", "ETH"], description: "Context-aware comparison", needsContext: true },
  { query: "show me NVDA chart", expect: "trend", description: "Chart request" },
  { query: "market hours?", expect: "9:30", description: "Market hours education" },
  { query: "what is inflation?", expect: ["inflation", "rate", "prices"], description: "Financial education" },
  { query: "FAANG stocks", expect: ["META", "AAPL", "AMZN"], description: "Group analysis" }
];

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

async function runQuickTests() {
  console.log(`${colors.blue}=== QUICK TEST SUITE - Critical Issues Only ===${colors.reset}\n`);
  
  const baseURL = 'http://localhost:3000';
  let passed = 0;
  let failed = 0;
  let sessionId = 'quick-test-' + Date.now();
  
  // First establish context for "compare them" test
  console.log(`${colors.yellow}Establishing context...${colors.reset}`);
  
  for (const test of criticalTests) {
    try {
      // Use same session for context-dependent tests
      const currentSession = test.needsContext ? sessionId : 'test-' + Date.now();
      
      console.log(`\nTesting: "${test.query}"`);
      
      const response = await axios.post(`${baseURL}/api/chat`, {
        message: test.query,
        sessionId: currentSession
      });
      
      const data = response.data;
      let testPassed = false;
      let reason = '';
      
      // Check if response contains expected content
      const expectedValues = Array.isArray(test.expect) ? test.expect : [test.expect];
      const responseText = JSON.stringify(data).toLowerCase();
      
      const foundValues = expectedValues.filter(val => 
        responseText.includes(val.toLowerCase())
      );
      
      if (foundValues.length === expectedValues.length) {
        testPassed = true;
      } else {
        reason = `Expected ${expectedValues.join(', ')}, found ${foundValues.join(', ')}`;
      }
      
      // Special check for non-blocking
      if (data.type === 'refusal' || data.type === 'non_financial_refusal') {
        if (!test.expectBlocked) {
          testPassed = false;
          reason = 'Query was blocked but should not be';
        }
      }
      
      if (testPassed) {
        console.log(`${colors.green}✓ PASSED${colors.reset} - ${test.description}`);
        passed++;
      } else {
        console.log(`${colors.red}✗ FAILED${colors.reset} - ${test.description}`);
        console.log(`  Reason: ${reason}`);
        console.log(`  Response type: ${data.type}`);
        console.log(`  Response preview: ${data.response?.substring(0, 100)}...`);
        failed++;
      }
      
    } catch (error) {
      console.log(`${colors.red}✗ ERROR${colors.reset} - ${test.description}`);
      console.log(`  Error: ${error.message}`);
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log(`\n${colors.blue}=== SUMMARY ===${colors.reset}`);
  console.log(`Total: ${criticalTests.length}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Success Rate: ${((passed / criticalTests.length) * 100).toFixed(1)}%`);
  
  // Run diagnostic on a failing query
  if (failed > 0) {
    console.log(`\n${colors.yellow}Running diagnostic on a failing query...${colors.reset}`);
    try {
      await axios.post(`${baseURL}/api/debug/diagnose`, {
        message: "what date is it now?"
      });
      console.log('Check server logs for diagnostic output');
    } catch (e) {
      console.log('Diagnostic endpoint not available');
    }
  }
  
  return { passed, failed };
}

// Run the tests
runQuickTests().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error(`${colors.red}Test execution failed:${colors.reset}`, error.message);
  process.exit(1);
});