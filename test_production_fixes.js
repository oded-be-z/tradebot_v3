const axios = require('axios');

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

async function testQuery(query, sessionId) {
  console.log(`\n${colors.cyan}Testing query: "${query}"${colors.reset}`);
  
  try {
    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}/api/chat`, {
      message: query,
      sessionId: sessionId
    }, {
      timeout: 15000 // 15 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    const data = response.data;
    
    console.log(`${colors.green}✓ Response received in ${responseTime}ms${colors.reset}`);
    console.log(`  Success: ${data.success}`);
    console.log(`  Response type: ${typeof data.response}`);
    console.log(`  Response length: ${data.response ? data.response.length : 0}`);
    console.log(`  Response preview: ${data.response ? data.response.substring(0, 100) + '...' : 'N/A'}`);
    console.log(`  Chart data: ${data.chartData ? 'Present' : 'None'}`);
    console.log(`  Type: ${data.type || 'N/A'}`);
    console.log(`  Symbol: ${data.symbol || 'N/A'}`);
    
    return {
      success: true,
      query,
      responseTime,
      responseType: typeof data.response,
      responseLength: data.response ? data.response.length : 0,
      hasChart: !!data.chartData,
      type: data.type,
      symbol: data.symbol,
      isObjectResponse: data.response === '[object Object]'
    };
    
  } catch (error) {
    const responseTime = 0; // Can't calculate if request failed
    console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log(`${colors.red}Server not running on port 3001${colors.reset}`);
    } else if (error.code === 'ECONNABORTED') {
      console.log(`${colors.red}Request timeout after ${responseTime}ms${colors.reset}`);
    }
    
    return {
      success: false,
      query,
      responseTime,
      error: error.message,
      code: error.code
    };
  }
}

async function runTests() {
  console.log(`${colors.bright}${colors.blue}=== PRODUCTION FIX TEST SUITE ===${colors.reset}`);
  console.log(`Testing server at: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);
  
  const sessionId = `test-${Date.now()}`;
  const testQueries = [
    'BTC?',                    // Simple crypto query
    'What is AAPL price?',     // Stock price query
    'How is MSFT doing?',      // Natural language query
    'Compare AAPL and GOOGL',  // Comparison query
    'Show me tech stocks',     // Group query
    'Hello',                   // Greeting
    'TSLA trend analysis',     // Trend query
    'What time is it?'         // Time query
  ];
  
  const results = [];
  
  for (const query of testQueries) {
    const result = await testQuery(query, sessionId);
    results.push(result);
    
    // Wait a bit between queries
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log(`\n${colors.bright}${colors.magenta}=== TEST SUMMARY ===${colors.reset}`);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const objectResponses = results.filter(r => r.isObjectResponse).length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  
  console.log(`Total tests: ${results.length}`);
  console.log(`${colors.green}Successful: ${successful}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`${colors.yellow}[object Object] responses: ${objectResponses}${colors.reset}`);
  console.log(`Average response time: ${avgResponseTime.toFixed(0)}ms`);
  
  // Detailed issues
  if (objectResponses > 0) {
    console.log(`\n${colors.red}CRITICAL: Still getting [object Object] responses!${colors.reset}`);
    results.filter(r => r.isObjectResponse).forEach(r => {
      console.log(`  - Query: "${r.query}"`);
    });
  }
  
  const timeouts = results.filter(r => r.code === 'ECONNABORTED');
  if (timeouts.length > 0) {
    console.log(`\n${colors.yellow}TIMEOUTS: ${timeouts.length} queries timed out${colors.reset}`);
    timeouts.forEach(r => {
      console.log(`  - Query: "${r.query}" (${r.responseTime}ms)`);
    });
  }
  
  // Save results
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      successful,
      failed,
      objectResponses,
      avgResponseTime
    },
    results
  };
  
  require('fs').writeFileSync(
    'production_fix_results.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log(`\n${colors.cyan}Results saved to production_fix_results.json${colors.reset}`);
  
  if (objectResponses === 0 && failed === 0) {
    console.log(`\n${colors.green}${colors.bright}✅ ALL FIXES WORKING! No [object Object] responses!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}❌ FIXES NOT COMPLETE - Issues remain${colors.reset}`);
  }
}

// Run tests
runTests().catch(console.error);