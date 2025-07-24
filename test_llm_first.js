/**
 * Test LLM-First Implementation
 * Verifies the 4-phase LLM-First approach is working correctly
 */

const axios = require('axios');
const colors = require('colors');

const API_URL = 'http://localhost:3000/api';

// Test queries that previously caused issues
const testQueries = [
  { query: "MSFT", expected: "MSFT formatting with natural response" },
  { query: "Compare AAPL and GOOGL", expected: "Comparison without JSON artifacts" },
  { query: "bitcoin?", expected: "Natural response with chart" },
  { query: "What's trending in tech stocks?", expected: "Trend analysis" },
  { query: "Analyze my portfolio", expected: "Portfolio response" }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testQuery(query, sessionId) {
  try {
    const response = await axios.post(`${API_URL}/chat`, {
      message: query,
      sessionId: sessionId
    });
    
    return {
      success: true,
      response: response.data.response,
      formatScore: calculateFormatScore(response.data.response),
      hasChart: response.data.showChart,
      symbols: response.data.symbols
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.status || error.message
    };
  }
}

function calculateFormatScore(response) {
  let score = 0;
  if (/[📊📈📉💰🎯⚠️🔍🔥⚔️]/.test(response)) score += 25;
  if (/\*\*[A-Z]{1,5}\*\*/.test(response)) score += 25;
  if (/want me to/i.test(response)) score += 25;
  if (response.includes('•') || (response.includes('\n') && response.length > 50)) score += 25;
  return score;
}

async function runTests() {
  console.log(colors.cyan('\n🚀 Testing LLM-First Implementation\n'));
  
  const results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    errors429: 0,
    avgFormatScore: 0,
    naturalResponses: 0
  };
  
  // Test 1: Rapid queries (testing rate limiting)
  console.log(colors.yellow('Test 1: Rate Limiting (5 rapid queries)'));
  const rapidResults = [];
  const sessionId = `test-${Date.now()}`;
  
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    const result = await testQuery(testQueries[0].query, sessionId);
    const duration = Date.now() - start;
    
    rapidResults.push({
      query: i + 1,
      success: result.success,
      error: result.error,
      duration: duration,
      is429: result.error === 429
    });
    
    if (result.error === 429) results.errors429++;
    
    console.log(`  Query ${i + 1}: ${result.success ? '✅' : '❌'} (${duration}ms) ${result.error || ''}`);
  }
  
  // Test 2: Response quality (testing temperature and format)
  console.log(colors.yellow('\nTest 2: Response Quality'));
  
  for (const test of testQueries) {
    await sleep(2000); // Respect rate limits
    
    const result = await testQuery(test.query, sessionId);
    results.totalTests++;
    
    if (result.success) {
      results.passed++;
      results.avgFormatScore += result.formatScore;
      
      // Check if response feels natural (not templated)
      const isNatural = !result.response.includes('TEMPLATE') && 
                       !result.response.startsWith('📊 **') &&
                       result.response.length > 100;
      if (isNatural) results.naturalResponses++;
      
      console.log(`\n  Query: "${test.query}"`);
      console.log(`  ✅ Success - Format Score: ${result.formatScore}/100`);
      console.log(`  Natural: ${isNatural ? '✅' : '⚠️'}`);
      console.log(`  Response preview: ${result.response.substring(0, 100)}...`);
      
      // Check for specific issues
      if (test.query.includes('Compare')) {
        const hasJsonArtifacts = result.response.includes('{') || result.response.includes('|');
        console.log(`  JSON artifacts: ${hasJsonArtifacts ? '❌ FOUND' : '✅ None'}`);
      }
    } else {
      results.failed++;
      console.log(`\n  Query: "${test.query}"`);
      console.log(`  ❌ Failed: ${result.error}`);
    }
  }
  
  // Calculate averages
  if (results.passed > 0) {
    results.avgFormatScore = Math.round(results.avgFormatScore / results.passed);
  }
  
  // Test 3: Smart Insights (check if they appear naturally)
  console.log(colors.yellow('\nTest 3: Smart Insights Integration'));
  
  // First query to establish context
  await sleep(2000);
  await testQuery("TSLA price", sessionId);
  
  // Second query should trigger time-based insight
  await sleep(3000);
  const insightResult = await testQuery("TSLA", sessionId);
  
  if (insightResult.success) {
    const hasTimeInsight = insightResult.response.includes('since') || 
                          insightResult.response.includes('ago') ||
                          insightResult.response.includes('last checked');
    console.log(`  Time-based insight: ${hasTimeInsight ? '✅ Found' : '⚠️ Not found'}`);
  }
  
  // Final Summary
  console.log(colors.cyan('\n📊 Test Summary\n'));
  console.log(`  Total Tests: ${results.totalTests}`);
  console.log(`  Passed: ${colors.green(results.passed)}`);
  console.log(`  Failed: ${colors.red(results.failed)}`);
  console.log(`  429 Errors: ${results.errors429 > 0 ? colors.red(results.errors429) : colors.green('0')}`);
  console.log(`  Avg Format Score: ${results.avgFormatScore}/100`);
  console.log(`  Natural Responses: ${results.naturalResponses}/${results.passed} (${Math.round(results.naturalResponses/results.passed*100)}%)`);
  
  // Success criteria
  const success = results.errors429 === 0 && 
                 results.avgFormatScore >= 50 && 
                 results.naturalResponses >= results.passed * 0.6;
  
  console.log(colors.cyan('\n🎯 LLM-First Implementation: ') + (success ? colors.green('SUCCESS') : colors.red('NEEDS WORK')));
  
  if (!success) {
    console.log(colors.yellow('\nIssues to address:'));
    if (results.errors429 > 0) console.log('  - Still getting 429 errors');
    if (results.avgFormatScore < 50) console.log('  - Format scores too low');
    if (results.naturalResponses < results.passed * 0.6) console.log('  - Responses feel too templated');
  }
}

// Run tests
runTests().catch(console.error);