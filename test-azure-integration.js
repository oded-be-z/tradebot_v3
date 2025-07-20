#!/usr/bin/env node

/**
 * Comprehensive test suite for Azure OpenAI integration
 * Tests intent classification, symbol extraction, and context understanding
 */

const intelligentResponse = require('./services/intelligentResponse');
const azureOpenAI = require('./services/azureOpenAI');
const logger = require('./utils/logger');

// Test results storage
const testResults = {
  intentClassification: [],
  contextUnderstanding: [],
  edgeCases: [],
  performanceMetrics: {
    totalTests: 0,
    totalTime: 0,
    apiCalls: 0,
    fallbacks: 0
  }
};

// Helper function to run a test
async function runTest(testName, testFn) {
  console.log(`\n${testName}`);
  console.log('='.repeat(testName.length));
  
  const startTime = Date.now();
  try {
    await testFn();
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  }
  const endTime = Date.now();
  
  testResults.performanceMetrics.totalTests++;
  testResults.performanceMetrics.totalTime += (endTime - startTime);
}

// Test 1: Intent Classification
async function testIntentClassification() {
  const testCases = [
    { query: "what date is it now?", expected: "date_time", description: "Date/time query" },
    { query: "BTC price", expected: "standard", description: "Stock query" },
    { query: "compare AAPL and MSFT", expected: "comparison", description: "Comparison query" },
    { query: "bitcoin trends?", expected: "trend_analysis", description: "Trend query" },
    { query: "who is elon musk?", expected: "non_financial", description: "General question" },
    { query: "show my portfolio", expected: "portfolio_analysis", description: "Portfolio query" },
    { query: "what's the time?", expected: "date_time", description: "Time query" },
    { query: "TSLA vs NVDA", expected: "comparison", description: "Short comparison" },
    { query: "oil price forecast", expected: "trend_analysis", description: "Commodity trend" },
    { query: "analyze my holdings", expected: "portfolio_analysis", description: "Portfolio analysis" }
  ];

  for (const test of testCases) {
    const result = await intelligentResponse.analyzeQueryIntent(test.query, {});
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${status} "${test.query}" → ${result} (expected: ${test.expected})`);
    
    testResults.intentClassification.push({
      query: test.query,
      expected: test.expected,
      actual: result,
      passed: result === test.expected,
      description: test.description
    });
  }
}

// Test 2: Context Understanding
async function testContextUnderstanding() {
  console.log('\nTesting conversation context...\n');
  
  // Test case 1: Compare them
  const context1 = {
    conversationHistory: [
      { role: "user", content: "TSLA" },
      { role: "assistant", content: "Tesla analysis..." },
      { role: "user", content: "AAPL" },
      { role: "assistant", content: "Apple analysis..." }
    ]
  };
  
  const symbols1 = await intelligentResponse.extractComparisonSymbols("compare them", context1);
  console.log(`✅ "compare them" after TSLA/AAPL → ${symbols1.join(', ')}`);
  
  // Test case 2: What about its trends
  const context2 = {
    conversationHistory: [
      { role: "user", content: "what's the price of bitcoin?" },
      { role: "assistant", content: "BTC analysis..." }
    ]
  };
  
  const symbol2 = await intelligentResponse.extractSymbol("what about its trends?", context2);
  console.log(`✅ "what about its trends?" after BTC → ${symbol2}`);
  
  // Test case 3: Compare these two
  const context3 = {
    conversationHistory: [
      { role: "user", content: "tell me about gold" },
      { role: "assistant", content: "GC analysis..." },
      { role: "user", content: "and silver?" },
      { role: "assistant", content: "SI analysis..." }
    ]
  };
  
  const symbols3 = await intelligentResponse.extractComparisonSymbols("compare these two", context3);
  console.log(`✅ "compare these two" after GC/SI → ${symbols3.join(', ')}`);
  
  testResults.contextUnderstanding = [
    { test: "compare them", result: symbols1, passed: symbols1.length === 2 },
    { test: "contextual trends", result: symbol2, passed: symbol2 === 'BTC' },
    { test: "compare these two", result: symbols3, passed: symbols3.length === 2 }
  ];
}

// Test 3: Edge Cases
async function testEdgeCases() {
  console.log('\nTesting edge cases...\n');
  
  // Ambiguous queries
  const edgeCases = [
    { query: "DATE", description: "Ambiguous - could be date or DATE ETF" },
    { query: "NOW", description: "Ambiguous - could be now or NOW Inc" },
    { query: "tell me about apple", description: "Natural language - should map to AAPL" },
    { query: "microsoft vs google charts", description: "Comparison with chart request" },
    { query: "what's happening with oil?", description: "Natural language commodity query" }
  ];
  
  for (const test of edgeCases) {
    const intent = await intelligentResponse.analyzeQueryIntent(test.query, {});
    const symbols = await azureOpenAI.extractStockSymbols(test.query, []);
    console.log(`📊 "${test.query}"`);
    console.log(`   Intent: ${intent}`);
    console.log(`   Symbols: ${symbols.length > 0 ? symbols.join(', ') : 'none'}`);
    console.log(`   ${test.description}\n`);
    
    testResults.edgeCases.push({
      query: test.query,
      intent: intent,
      symbols: symbols,
      description: test.description
    });
  }
}

// Test 4: Response Generation
async function testResponseGeneration() {
  console.log('\nTesting response generation...\n');
  
  // Test date/time response
  const dateResponse = await intelligentResponse.generateResponse("what date is it now?", {});
  console.log('Date/Time Response:');
  console.log(dateResponse.response);
  console.log(`Type: ${dateResponse.type}`);
  
  // Test comparison with context
  const compContext = {
    conversationHistory: [
      { role: "user", content: "MSFT price" },
      { role: "assistant", content: "Microsoft trading at..." },
      { role: "user", content: "GOOGL" },
      { role: "assistant", content: "Google trading at..." }
    ]
  };
  
  console.log('\n\nComparison Response:');
  const compResponse = await intelligentResponse.generateResponse("compare them", compContext);
  console.log(`Type: ${compResponse.type}`);
  console.log(`Symbols compared: ${compResponse.symbols ? compResponse.symbols.join(' vs ') : 'N/A'}`);
}

// Test 5: Performance Metrics
async function testPerformance() {
  console.log('\nTesting API performance...\n');
  
  const queries = [
    "BTC price",
    "compare AAPL and MSFT",
    "what's the trend for gold?",
    "portfolio analysis"
  ];
  
  for (const query of queries) {
    const start = Date.now();
    await intelligentResponse.analyzeQueryIntent(query, {});
    const time = Date.now() - start;
    console.log(`Query: "${query}" - ${time}ms`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 AZURE OPENAI INTEGRATION TEST SUITE');
  console.log('=====================================\n');
  
  // Disable LLM for baseline tests
  console.log('Running baseline tests (regex-only)...');
  intelligentResponse.useLLM = false;
  const baselineStart = Date.now();
  await runTest('BASELINE: Intent Classification', testIntentClassification);
  const baselineTime = Date.now() - baselineStart;
  
  // Clear results for LLM tests
  testResults.intentClassification = [];
  
  // Enable LLM for enhanced tests
  console.log('\n\nRunning enhanced tests (with LLM)...');
  intelligentResponse.useLLM = true;
  const llmStart = Date.now();
  
  await runTest('TEST 1: Intent Classification', testIntentClassification);
  await runTest('TEST 2: Context Understanding', testContextUnderstanding);
  await runTest('TEST 3: Edge Cases', testEdgeCases);
  await runTest('TEST 4: Response Generation', testResponseGeneration);
  await runTest('TEST 5: Performance Metrics', testPerformance);
  
  const llmTime = Date.now() - llmStart;
  
  // Generate summary report
  console.log('\n\n📊 TEST SUMMARY');
  console.log('===============\n');
  
  // Intent classification results
  const intentPassed = testResults.intentClassification.filter(t => t.passed).length;
  const intentTotal = testResults.intentClassification.length;
  console.log(`Intent Classification: ${intentPassed}/${intentTotal} passed (${Math.round(intentPassed/intentTotal * 100)}%)`);
  
  // Context understanding results
  const contextPassed = testResults.contextUnderstanding.filter(t => t.passed).length;
  const contextTotal = testResults.contextUnderstanding.length;
  console.log(`Context Understanding: ${contextPassed}/${contextTotal} passed (${Math.round(contextPassed/contextTotal * 100)}%)`);
  
  // Performance comparison
  console.log(`\nPerformance:`);
  console.log(`- Baseline (regex-only): ${baselineTime}ms`);
  console.log(`- Enhanced (with LLM): ${llmTime}ms`);
  console.log(`- Overhead: ${llmTime - baselineTime}ms`);
  console.log(`- Average per test: ${Math.round(testResults.performanceMetrics.totalTime / testResults.performanceMetrics.totalTests)}ms`);
  
  // Failed tests
  console.log('\n❌ Failed Tests:');
  testResults.intentClassification.filter(t => !t.passed).forEach(t => {
    console.log(`- "${t.query}": expected ${t.expected}, got ${t.actual}`);
  });
  
  // Edge case insights
  console.log('\n🔍 Edge Case Insights:');
  testResults.edgeCases.forEach(t => {
    console.log(`- "${t.query}": ${t.intent} intent, symbols: ${t.symbols.join(', ') || 'none'}`);
  });
}

// Run tests
runAllTests().catch(console.error);