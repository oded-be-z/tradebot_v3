const axios = require('axios');
const logger = require('./utils/logger');

// Test configuration
const API_URL = 'http://localhost:3000/api/chat';
const SESSION_ID = 'test-llm-first-' + Date.now();

// Test queries that should now work with LLM understanding
const testQueries = [
  // Company-related queries that should be recognized as financial
  { query: "who is the CEO of Apple?", expected: "financial", description: "Company leadership query" },
  { query: "Apple news", expected: "financial", description: "Company news request" },
  { query: "tell me about Microsoft", expected: "financial", description: "Company information" },
  { query: "Amazon earnings", expected: "financial", description: "Company earnings" },
  { query: "Tesla CEO", expected: "financial", description: "Specific company info" },
  
  // Educational finance queries
  { query: "what is inflation?", expected: "financial", description: "Economic concept" },
  { query: "market hours?", expected: "financial", description: "Trading hours" },
  { query: "when does the market open?", expected: "financial", description: "Market timing" },
  { query: "explain P/E ratio", expected: "financial", description: "Financial metric education" },
  { query: "what are options?", expected: "financial", description: "Financial instrument education" },
  { query: "how does the fed impact stocks?", expected: "financial", description: "Economic relationship" },
  
  // Context-aware queries
  { query: "compare them", expected: "financial", description: "Context-dependent comparison" },
  { query: "how is it doing?", expected: "financial", description: "Context-dependent status" },
  { query: "is it overvalued?", expected: "financial", description: "Context-dependent valuation" },
  
  // These should still be blocked as non-financial
  { query: "what's the weather?", expected: "non-financial", description: "Weather query" },
  { query: "tell me a joke", expected: "non-financial", description: "Entertainment request" },
  { query: "recipe for pizza", expected: "non-financial", description: "Cooking query" },
  { query: "how to tie a tie", expected: "non-financial", description: "Fashion/lifestyle" },
  { query: "explain photosynthesis", expected: "non-financial", description: "Biology topic" },
  
  // Edge cases that LLM should understand
  { query: "Apple vs Samsung market cap", expected: "financial", description: "Company comparison" },
  { query: "is Apple a good investment?", expected: "financial", description: "Investment advice" },
  { query: "Fed meeting impact on tech stocks", expected: "financial", description: "Complex financial relationship" },
  { query: "crypto market overview", expected: "financial", description: "Cryptocurrency market" },
  { query: "S&P 500 performance", expected: "financial", description: "Index performance" }
];

// Color codes for output
const colors = {
  success: '\x1b[32m',
  failure: '\x1b[31m',
  info: '\x1b[36m',
  warning: '\x1b[33m',
  reset: '\x1b[0m'
};

async function testQuery(queryObj, sessionId) {
  try {
    const response = await axios.post(API_URL, {
      message: queryObj.query,
      sessionId: sessionId
    });
    
    const data = response.data;
    const isFinancialResponse = data.type !== 'refusal' && data.type !== 'non_financial_refusal';
    const expectedFinancial = queryObj.expected === 'financial';
    const passed = isFinancialResponse === expectedFinancial;
    
    return {
      query: queryObj.query,
      expected: queryObj.expected,
      actual: isFinancialResponse ? 'financial' : 'non-financial',
      passed: passed,
      responseType: data.type,
      response: data.response ? data.response.substring(0, 100) + '...' : 'No response',
      description: queryObj.description,
      llmDetermined: data.metadata?.llmDetermined || false,
      fallbackUsed: data.metadata?.fallbackUsed || false
    };
  } catch (error) {
    return {
      query: queryObj.query,
      expected: queryObj.expected,
      actual: 'error',
      passed: false,
      error: error.message,
      description: queryObj.description
    };
  }
}

async function runTests() {
  console.log(`${colors.info}Starting LLM-First Pipeline Tests${colors.reset}\n`);
  console.log(`Testing ${testQueries.length} queries...\n`);
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  // Test with context building
  let contextSessionId = SESSION_ID;
  
  // First, establish context with AAPL
  console.log(`${colors.info}Establishing context with AAPL...${colors.reset}`);
  await axios.post(API_URL, {
    message: "Tell me about AAPL",
    sessionId: contextSessionId
  });
  
  for (const queryObj of testQueries) {
    console.log(`Testing: "${queryObj.query}"`);
    
    // Use context session for context-dependent queries
    const sessionToUse = queryObj.query.includes('them') || queryObj.query.includes('it') 
      ? contextSessionId 
      : SESSION_ID + '-' + Date.now();
    
    const result = await testQuery(queryObj, sessionToUse);
    results.push(result);
    
    if (result.passed) {
      console.log(`${colors.success}✓ PASSED${colors.reset} - ${result.description}`);
      console.log(`  Expected: ${result.expected}, Got: ${result.actual}`);
      if (result.llmDetermined) {
        console.log(`  ${colors.info}(LLM determined)${colors.reset}`);
      }
      passed++;
    } else {
      console.log(`${colors.failure}✗ FAILED${colors.reset} - ${result.description}`);
      console.log(`  Expected: ${result.expected}, Got: ${result.actual}`);
      if (result.fallbackUsed) {
        console.log(`  ${colors.warning}(Fallback used)${colors.reset}`);
      }
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      } else {
        console.log(`  Response type: ${result.responseType}`);
      }
      failed++;
    }
    console.log('');
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.info}TEST SUMMARY${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`Total tests: ${testQueries.length}`);
  console.log(`${colors.success}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.failure}Failed: ${failed}${colors.reset}`);
  console.log(`Success rate: ${((passed / testQueries.length) * 100).toFixed(1)}%`);
  
  // Detailed failure analysis
  if (failed > 0) {
    console.log(`\n${colors.failure}Failed Tests:${colors.reset}`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`- "${r.query}" (${r.description})`);
      console.log(`  Expected: ${r.expected}, Got: ${r.actual}`);
    });
  }
  
  // Success stories
  const successStories = results.filter(r => 
    r.passed && 
    r.expected === 'financial' && 
    ['who is the CEO of Apple?', 'what is inflation?', 'market hours?'].includes(r.query)
  );
  
  if (successStories.length > 0) {
    console.log(`\n${colors.success}Key Improvements:${colors.reset}`);
    successStories.forEach(r => {
      console.log(`✓ "${r.query}" now correctly recognized as financial!`);
    });
  }
  
  return { passed, failed, total: testQueries.length };
}

// Run the tests
console.log(`${colors.warning}Make sure the server is running on http://localhost:3000${colors.reset}\n`);

runTests().then(results => {
  const exitCode = results.failed > 0 ? 1 : 0;
  process.exit(exitCode);
}).catch(error => {
  console.error(`${colors.failure}Test execution failed:${colors.reset}`, error.message);
  process.exit(1);
});