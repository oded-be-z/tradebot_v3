const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test result tracking
const testResults = {
  basicMarket: { total: 0, passed: 0, failed: 0, times: [], failures: [] },
  nlpConversational: { total: 0, passed: 0, failed: 0, times: [], failures: [] },
  contextFollowup: { total: 0, passed: 0, failed: 0, times: [], failures: [] },
  complexAnalysis: { total: 0, passed: 0, failed: 0, times: [], failures: [] },
  longConversations: { total: 0, passed: 0, failed: 0, times: [], failures: [] },
  errorCases: { total: 0, passed: 0, failed: 0, times: [], failures: [] },
  performance: { times: [], under1s: 0, between1_3s: 0, between3_5s: 0, over5s: 0 }
};

// Helper function to make API call
async function makeQuery(query, sessionId, timeout = 10000) {
  const startTime = Date.now();
  try {
    const response = await axios.post(`${BASE_URL}/api/chat`, {
      message: query,
      sessionId: sessionId
    }, { timeout });
    
    const responseTime = Date.now() - startTime;
    return {
      success: true,
      data: response.data,
      responseTime,
      query
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      error: error.message,
      responseTime,
      query
    };
  }
}

// Helper to evaluate response quality
function evaluateResponse(result) {
  if (!result.success) return { passed: false, reason: 'Request failed: ' + result.error };
  
  const data = result.data;
  const issues = [];
  
  // Check for critical issues
  if (!data.success) issues.push('Response not successful');
  if (!data.response) issues.push('No response text');
  if (data.response === '[object Object]') issues.push('Response is [object Object]');
  if (data.response && data.response.includes('temporarily unavailable')) issues.push('Technical error message');
  if (data.response && data.response.includes('\\')) issues.push('Escaped characters (double stringify)');
  
  // Check for conversational quality
  const isConversational = data.response && (
    !data.response.includes('Unable to fetch') &&
    !data.response.includes('error processing') &&
    data.response.length > 20
  );
  
  if (!isConversational && issues.length === 0) {
    issues.push('Response not conversational');
  }
  
  return {
    passed: issues.length === 0,
    reason: issues.join(', '),
    isConversational,
    hasSymbol: !!data.symbol,
    hasChart: !!data.chartData,
    responseLength: data.response ? data.response.length : 0
  };
}

// Test Categories

// 1. Basic Market Queries
async function testBasicMarketQueries() {
  console.log(`\n${colors.cyan}=== TESTING BASIC MARKET QUERIES ===${colors.reset}`);
  
  const queries = [
    // Direct price queries
    'AAPL price', 'what is apple stock price?', 'apple share price',
    'MSFT price', 'Microsoft stock price', 'how much is MSFT?',
    'TSLA price', 'Tesla stock', 'what\'s TSLA at?',
    'NVDA price', 'Nvidia stock price', 'NVDA current price',
    'GOOGL price', 'Google stock', 'Alphabet price',
    
    // Natural variations
    'how\'s apple doing?', 'how is Microsoft performing?', 'what\'s up with Tesla?',
    'tell me about NVDA', 'Google stock update', 'AMZN status',
    'Meta stock price', 'Netflix shares', 'AMD price check',
    'Intel stock today', 'IBM current price', 'Oracle shares',
    
    // With chart requests
    'show me AAPL', 'MSFT chart', 'display TSLA trend',
    'NVDA graph', 'plot GOOGL', 'visualize AMZN',
    
    // Trend queries
    'AAPL trend', 'MSFT direction', 'is TSLA up or down?',
    'NVDA momentum', 'GOOGL performance today',
    
    // Quick checks
    'AAPL?', 'MSFT?', 'TSLA?', 'NVDA?', 'GOOGL?',
    
    // Crypto
    'BTC price', 'Bitcoin price', 'ETH price', 'Ethereum cost',
    
    // Indices
    'SPY price', 'QQQ status', 'DIA today', 'IWM performance',
    
    // Commodities
    'gold price', 'silver cost', 'oil price', 'natural gas'
  ];
  
  const sessionId = `basic-${Date.now()}`;
  
  for (const query of queries) {
    process.stdout.write(`  Testing: "${query}"... `);
    const result = await makeQuery(query, sessionId);
    const evaluation = evaluateResponse(result);
    
    testResults.basicMarket.total++;
    testResults.performance.times.push(result.responseTime);
    
    if (result.responseTime < 1000) testResults.performance.under1s++;
    else if (result.responseTime < 3000) testResults.performance.between1_3s++;
    else if (result.responseTime < 5000) testResults.performance.between3_5s++;
    else testResults.performance.over5s++;
    
    if (evaluation.passed) {
      testResults.basicMarket.passed++;
      testResults.basicMarket.times.push(result.responseTime);
      console.log(`${colors.green}✓${colors.reset} (${result.responseTime}ms)`);
    } else {
      testResults.basicMarket.failed++;
      testResults.basicMarket.failures.push({ query, reason: evaluation.reason });
      console.log(`${colors.red}✗${colors.reset} - ${evaluation.reason}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// 2. Conversational NLP
async function testConversationalNLP() {
  console.log(`\n${colors.cyan}=== TESTING CONVERSATIONAL NLP ===${colors.reset}`);
  
  const queries = [
    // Crypto casual
    'bitcoin?', 'what\'s up with crypto?', 'how\'s crypto doing?',
    'tell me about ethereum', 'is bitcoin up?', 'crypto market update',
    
    // Market overview
    'is the market up today?', 'how are stocks doing?', 'market status',
    'what\'s happening in the market?', 'any big movers today?',
    
    // Sector queries
    'tell me about tech stocks', 'how are bank stocks?', 'energy sector update',
    'best performing sectors', 'which sectors are down?',
    
    // Advice queries (should handle gracefully)
    'should I buy gold?', 'is AAPL a good investment?', 'when to sell TSLA?',
    'what stocks to buy?', 'investment recommendations',
    
    // Casual questions
    'what\'s hot today?', 'any stock tips?', 'market winners',
    'biggest losers today', 'trending stocks'
  ];
  
  const sessionId = `nlp-${Date.now()}`;
  
  for (const query of queries) {
    process.stdout.write(`  Testing: "${query}"... `);
    const result = await makeQuery(query, sessionId);
    const evaluation = evaluateResponse(result);
    
    testResults.nlpConversational.total++;
    testResults.performance.times.push(result.responseTime);
    
    if (result.responseTime < 1000) testResults.performance.under1s++;
    else if (result.responseTime < 3000) testResults.performance.between1_3s++;
    else if (result.responseTime < 5000) testResults.performance.between3_5s++;
    else testResults.performance.over5s++;
    
    if (evaluation.passed && evaluation.isConversational) {
      testResults.nlpConversational.passed++;
      testResults.nlpConversational.times.push(result.responseTime);
      console.log(`${colors.green}✓${colors.reset} (${result.responseTime}ms)`);
    } else {
      testResults.nlpConversational.failed++;
      testResults.nlpConversational.failures.push({ query, reason: evaluation.reason });
      console.log(`${colors.red}✗${colors.reset} - ${evaluation.reason}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// 3. Context & Follow-ups
async function testContextFollowups() {
  console.log(`\n${colors.cyan}=== TESTING CONTEXT & FOLLOW-UPS ===${colors.reset}`);
  
  const conversations = [
    // Basic follow-up
    ['AAPL price', 'what about Microsoft?', 'compare them'],
    ['TSLA trend', 'zoom out to 6 months', 'add volume data'],
    ['show me NVDA', 'what\'s the PE ratio?', 'is it overvalued?'],
    ['BTC price', 'how about ETH?', 'which is performing better?'],
    
    // Context switching
    ['tell me about tech stocks', 'focus on AAPL', 'compare to SPY'],
    ['gold price', 'what drives gold prices?', 'how about silver?'],
    
    // Pronoun resolution
    ['MSFT analysis', 'what\'s its market cap?', 'how does it compare to peers?'],
    ['crypto update', 'focus on bitcoin', 'what\'s driving it?']
  ];
  
  let totalTests = 0;
  
  for (let i = 0; i < conversations.length; i++) {
    const sessionId = `context-${Date.now()}-${i}`;
    console.log(`\n  Conversation ${i + 1}:`);
    
    for (let j = 0; j < conversations[i].length; j++) {
      const query = conversations[i][j];
      process.stdout.write(`    ${j + 1}. "${query}"... `);
      
      const result = await makeQuery(query, sessionId);
      const evaluation = evaluateResponse(result);
      
      totalTests++;
      testResults.contextFollowup.total++;
      testResults.performance.times.push(result.responseTime);
      
      if (result.responseTime < 1000) testResults.performance.under1s++;
      else if (result.responseTime < 3000) testResults.performance.between1_3s++;
      else if (result.responseTime < 5000) testResults.performance.between3_5s++;
      else testResults.performance.over5s++;
      
      // For follow-ups, also check if context was maintained
      const contextMaintained = j === 0 || (result.data && result.data.response && 
        !result.data.response.includes('I don\'t understand'));
      
      if (evaluation.passed && contextMaintained) {
        testResults.contextFollowup.passed++;
        testResults.contextFollowup.times.push(result.responseTime);
        console.log(`${colors.green}✓${colors.reset} (${result.responseTime}ms)`);
      } else {
        testResults.contextFollowup.failed++;
        const reason = !contextMaintained ? 'Lost context' : evaluation.reason;
        testResults.contextFollowup.failures.push({ query: `Conv ${i+1}, Q${j+1}: ${query}`, reason });
        console.log(`${colors.red}✗${colors.reset} - ${reason}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

// 4. Complex Analysis
async function testComplexAnalysis() {
  console.log(`\n${colors.cyan}=== TESTING COMPLEX ANALYSIS ===${colors.reset}`);
  
  const queries = [
    // Multi-symbol comparisons
    'compare AAPL, MSFT, and GOOGL',
    'FAANG stocks comparison',
    'NVDA vs AMD vs INTC',
    'top 5 tech stocks',
    
    // Portfolio analysis
    'analyze portfolio: 100 AAPL, 50 TSLA, 200 MSFT',
    'portfolio: 500 SPY, 200 QQQ, 100 GLD',
    'my holdings: BTC 2, ETH 10, SOL 50',
    
    // Performance queries
    'which tech stock performed best this month?',
    'worst performing sectors today',
    'best dividend stocks',
    'highest volume stocks',
    
    // Sector/theme analysis
    'show me defensive stocks',
    'AI stocks analysis',
    'renewable energy plays',
    'banking sector overview',
    
    // Market analysis
    'market breadth analysis',
    'volatility report',
    'sector rotation update',
    'risk on vs risk off'
  ];
  
  const sessionId = `complex-${Date.now()}`;
  
  for (const query of queries) {
    process.stdout.write(`  Testing: "${query}"... `);
    const result = await makeQuery(query, sessionId, 15000); // Longer timeout for complex queries
    const evaluation = evaluateResponse(result);
    
    testResults.complexAnalysis.total++;
    testResults.performance.times.push(result.responseTime);
    
    if (result.responseTime < 1000) testResults.performance.under1s++;
    else if (result.responseTime < 3000) testResults.performance.between1_3s++;
    else if (result.responseTime < 5000) testResults.performance.between3_5s++;
    else testResults.performance.over5s++;
    
    if (evaluation.passed) {
      testResults.complexAnalysis.passed++;
      testResults.complexAnalysis.times.push(result.responseTime);
      console.log(`${colors.green}✓${colors.reset} (${result.responseTime}ms)`);
    } else {
      testResults.complexAnalysis.failed++;
      testResults.complexAnalysis.failures.push({ query, reason: evaluation.reason });
      console.log(`${colors.red}✗${colors.reset} - ${evaluation.reason}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Longer delay for complex queries
  }
}

// 5. Long Conversations
async function testLongConversations() {
  console.log(`\n${colors.cyan}=== TESTING LONG CONVERSATIONS ===${colors.reset}`);
  
  const longConversations = [
    // Tech stock deep dive
    [
      'tell me about AAPL',
      'what\'s their latest product?',
      'how does it affect the stock?',
      'compare to last quarter',
      'what are analysts saying?',
      'show me the chart',
      'zoom out to 1 year',
      'add moving averages',
      'what\'s the support level?',
      'resistance levels?',
      'volume analysis',
      'compare to MSFT'
    ],
    
    // Crypto exploration
    [
      'bitcoin update',
      'what\'s driving the price?',
      'technical analysis',
      'compare to gold',
      'ethereum comparison',
      'which is more volatile?',
      'market cap comparison',
      'adoption trends',
      'regulatory updates',
      'future outlook'
    ]
  ];
  
  for (let i = 0; i < longConversations.length; i++) {
    const sessionId = `long-${Date.now()}-${i}`;
    console.log(`\n  Long Conversation ${i + 1} (${longConversations[i].length} messages):`);
    
    let conversationPassed = true;
    const conversationTimes = [];
    
    for (let j = 0; j < longConversations[i].length; j++) {
      const query = longConversations[i][j];
      process.stdout.write(`    ${j + 1}. "${query}"... `);
      
      const result = await makeQuery(query, sessionId);
      const evaluation = evaluateResponse(result);
      
      testResults.performance.times.push(result.responseTime);
      conversationTimes.push(result.responseTime);
      
      if (result.responseTime < 1000) testResults.performance.under1s++;
      else if (result.responseTime < 3000) testResults.performance.between1_3s++;
      else if (result.responseTime < 5000) testResults.performance.between3_5s++;
      else testResults.performance.over5s++;
      
      if (evaluation.passed) {
        console.log(`${colors.green}✓${colors.reset} (${result.responseTime}ms)`);
      } else {
        conversationPassed = false;
        console.log(`${colors.red}✗${colors.reset} - ${evaluation.reason}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    testResults.longConversations.total++;
    if (conversationPassed) {
      testResults.longConversations.passed++;
      testResults.longConversations.times.push(
        conversationTimes.reduce((a, b) => a + b, 0) / conversationTimes.length
      );
    } else {
      testResults.longConversations.failed++;
      testResults.longConversations.failures.push({ 
        query: `Conversation ${i + 1}`, 
        reason: 'One or more messages failed' 
      });
    }
  }
}

// 6. Error Cases
async function testErrorCases() {
  console.log(`\n${colors.cyan}=== TESTING ERROR CASES ===${colors.reset}`);
  
  const errorQueries = [
    // Invalid symbols
    'FAKESYMBOL price', 'XXXYYY stock', 'NOTREAL trend',
    
    // Empty/nonsense
    'price of nothing', 'stock of', 'show me',
    
    // Weird input
    ']][[weird input', '!!!###$$$', '12345678',
    'πππ', '你好', '🚀🚀🚀',
    
    // Injection attempts
    '<script>alert(1)</script>', 'DROP TABLE stocks;', '${process.env.API_KEY}',
    
    // Very long input
    'a'.repeat(1000),
    
    // Mixed valid/invalid
    'AAPL and FAKESYMBOL comparison', 'show me MSFT and XXXYYY'
  ];
  
  const sessionId = `error-${Date.now()}`;
  
  for (const query of errorQueries) {
    const displayQuery = query.length > 50 ? query.substring(0, 50) + '...' : query;
    process.stdout.write(`  Testing: "${displayQuery}"... `);
    
    const result = await makeQuery(query, sessionId);
    
    testResults.errorCases.total++;
    testResults.performance.times.push(result.responseTime);
    
    if (result.responseTime < 1000) testResults.performance.under1s++;
    else if (result.responseTime < 3000) testResults.performance.between1_3s++;
    else if (result.responseTime < 5000) testResults.performance.between3_5s++;
    else testResults.performance.over5s++;
    
    // For error cases, we want graceful handling
    const handledGracefully = result.success && result.data && result.data.response && 
      !result.data.response.includes('error') && 
      !result.data.response.includes('crashed') &&
      result.data.response !== '[object Object]';
    
    if (handledGracefully) {
      testResults.errorCases.passed++;
      testResults.errorCases.times.push(result.responseTime);
      console.log(`${colors.green}✓${colors.reset} (handled gracefully, ${result.responseTime}ms)`);
    } else {
      testResults.errorCases.failed++;
      const reason = !result.success ? 'Request failed' : 'Poor error handling';
      testResults.errorCases.failures.push({ query: displayQuery, reason });
      console.log(`${colors.red}✗${colors.reset} - ${reason}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// 7. Performance Tests
async function testPerformance() {
  console.log(`\n${colors.cyan}=== TESTING PERFORMANCE (100 rapid queries) ===${colors.reset}`);
  
  const queries = [
    'AAPL price', 'MSFT?', 'TSLA trend', 'BTC?', 'SPY status',
    'NVDA chart', 'gold price', 'oil update', 'ETH?', 'QQQ today'
  ];
  
  const sessionId = `perf-${Date.now()}`;
  const concurrentRequests = [];
  
  console.log('  Sending 100 queries in batches of 10...');
  
  for (let batch = 0; batch < 10; batch++) {
    const batchPromises = [];
    
    for (let i = 0; i < 10; i++) {
      const query = queries[i % queries.length];
      batchPromises.push(makeQuery(query, `${sessionId}-${batch}-${i}`));
    }
    
    const batchResults = await Promise.all(batchPromises);
    
    batchResults.forEach(result => {
      testResults.performance.times.push(result.responseTime);
      
      if (result.responseTime < 1000) testResults.performance.under1s++;
      else if (result.responseTime < 3000) testResults.performance.between1_3s++;
      else if (result.responseTime < 5000) testResults.performance.between3_5s++;
      else testResults.performance.over5s++;
    });
    
    console.log(`  Batch ${batch + 1}/10 complete`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1s between batches
  }
}

// Generate final report
function generateReport() {
  console.log(`\n${colors.bright}${colors.blue}=== COMPREHENSIVE TEST RESULTS ===${colors.reset}`);
  
  // Calculate totals
  let totalTests = 0;
  let totalPassed = 0;
  
  Object.entries(testResults).forEach(([category, data]) => {
    if (category !== 'performance' && data.total) {
      totalTests += data.total;
      totalPassed += data.passed;
    }
  });
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${totalPassed} (${((totalPassed/totalTests)*100).toFixed(1)}%)`);
  console.log(`Failed: ${totalTests - totalPassed} (${(((totalTests - totalPassed)/totalTests)*100).toFixed(1)}%)`);
  
  console.log(`\n${colors.cyan}By Category:${colors.reset}`);
  
  // Category results
  const categories = [
    ['Basic Queries', 'basicMarket', 50],
    ['NLP Understanding', 'nlpConversational', 30],
    ['Context Retention', 'contextFollowup', 20],
    ['Complex Analysis', 'complexAnalysis', 20],
    ['Long Conversations', 'longConversations', 10],
    ['Error Handling', 'errorCases', 20]
  ];
  
  categories.forEach(([name, key, expected]) => {
    const data = testResults[key];
    const avgTime = data.times.length > 0 
      ? (data.times.reduce((a, b) => a + b, 0) / data.times.length).toFixed(0)
      : 'N/A';
    
    const passRate = data.total > 0 ? ((data.passed/data.total)*100).toFixed(1) : '0.0';
    const status = data.passed === data.total ? colors.green : colors.yellow;
    
    console.log(`${name}: ${status}${data.passed}/${data.total}${colors.reset} (${passRate}%) - Avg: ${avgTime}ms`);
  });
  
  // Top failures
  console.log(`\n${colors.cyan}Top Failures:${colors.reset}`);
  const allFailures = [];
  
  Object.entries(testResults).forEach(([category, data]) => {
    if (data.failures) {
      data.failures.forEach(failure => {
        allFailures.push({ category, ...failure });
      });
    }
  });
  
  allFailures.slice(0, 10).forEach(failure => {
    console.log(`[${failure.category}] "${failure.query}" - ${failure.reason}`);
  });
  
  // Performance distribution
  console.log(`\n${colors.cyan}Performance:${colors.reset}`);
  const totalPerf = testResults.performance.times.length;
  console.log(`Under 1s: ${((testResults.performance.under1s/totalPerf)*100).toFixed(1)}%`);
  console.log(`1-3s: ${((testResults.performance.between1_3s/totalPerf)*100).toFixed(1)}%`);
  console.log(`3-5s: ${((testResults.performance.between3_5s/totalPerf)*100).toFixed(1)}%`);
  console.log(`Over 5s: ${((testResults.performance.over5s/totalPerf)*100).toFixed(1)}%`);
  
  const avgResponseTime = testResults.performance.times.length > 0
    ? (testResults.performance.times.reduce((a, b) => a + b, 0) / testResults.performance.times.length).toFixed(0)
    : 'N/A';
  console.log(`Average response time: ${avgResponseTime}ms`);
  
  // Recommendations
  console.log(`\n${colors.cyan}Recommendations:${colors.reset}`);
  
  const recommendations = [];
  
  if (testResults.basicMarket.passed < testResults.basicMarket.total * 0.9) {
    recommendations.push('- Basic market queries need improvement - many failing basic price lookups');
  }
  
  if (testResults.nlpConversational.passed < testResults.nlpConversational.total * 0.8) {
    recommendations.push('- NLP understanding needs work - not handling natural language well');
  }
  
  if (testResults.contextFollowup.passed < testResults.contextFollowup.total * 0.7) {
    recommendations.push('- Context retention is poor - losing track of conversation state');
  }
  
  if (testResults.performance.over5s > totalPerf * 0.2) {
    recommendations.push('- Performance issues - over 20% of requests take more than 5 seconds');
  }
  
  if (avgResponseTime > 3000) {
    recommendations.push('- Average response time too high - needs optimization');
  }
  
  const errorRate = (totalTests - totalPassed) / totalTests;
  if (errorRate > 0.1) {
    recommendations.push('- High error rate - over 10% of queries failing');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('- System performing well! Consider adding more edge cases');
  }
  
  recommendations.forEach(rec => console.log(rec));
  
  // Save detailed report
  const detailedReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests,
      totalPassed,
      totalFailed: totalTests - totalPassed,
      passRate: ((totalPassed/totalTests)*100).toFixed(1) + '%'
    },
    categories: testResults,
    allFailures,
    recommendations
  };
  
  fs.writeFileSync(
    'comprehensive_test_report.json',
    JSON.stringify(detailedReport, null, 2)
  );
  
  console.log(`\n${colors.cyan}Detailed report saved to comprehensive_test_report.json${colors.reset}`);
  
  // Final verdict
  const passRate = (totalPassed/totalTests)*100;
  if (passRate >= 90) {
    console.log(`\n${colors.green}${colors.bright}✅ EXCELLENT - System is production ready!${colors.reset}`);
  } else if (passRate >= 80) {
    console.log(`\n${colors.yellow}${colors.bright}⚠️  GOOD - System works but needs some fixes${colors.reset}`);
  } else if (passRate >= 70) {
    console.log(`\n${colors.yellow}${colors.bright}⚠️  FAIR - System has issues that need attention${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}❌ POOR - System is not ready for production${colors.reset}`);
  }
}

// Main test runner
async function runComprehensiveTests() {
  console.log(`${colors.bright}${colors.blue}=== COMPREHENSIVE FINANCEBOT TEST SUITE ===${colors.reset}`);
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Started at: ${new Date().toISOString()}\n`);
  
  const startTime = Date.now();
  
  try {
    // Check if server is running
    console.log('Checking server health...');
    try {
      await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
      console.log(`${colors.green}✓ Server is running${colors.reset}\n`);
    } catch (error) {
      console.log(`${colors.red}✗ Server not responding at ${BASE_URL}${colors.reset}`);
      console.log('Please start the server and try again.');
      return;
    }
    
    // Run all test categories
    await testBasicMarketQueries();
    await testConversationalNLP();
    await testContextFollowups();
    await testComplexAnalysis();
    await testLongConversations();
    await testErrorCases();
    await testPerformance();
    
    // Generate report
    generateReport();
    
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\nTotal test time: ${totalTime} minutes`);
    
  } catch (error) {
    console.error(`\n${colors.red}Test suite error:${colors.reset}`, error.message);
  }
}

// Run the tests
runComprehensiveTests().catch(console.error);