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

async function testNLPQuery(query, sessionId, expectedBehavior) {
  console.log(`\n${colors.cyan}Testing: "${query}"${colors.reset}`);
  console.log(`Expected: ${expectedBehavior}`);
  
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
    
    // Check for critical issues
    const issues = [];
    
    // 1. Check if response is [object Object]
    if (data.response === '[object Object]') {
      issues.push('Response is [object Object]');
    }
    
    // 2. Check if response contains technical error messages
    const technicalErrors = [
      'temporarily unavailable',
      'Unable to fetch',
      'Market data for',
      'error processing',
      'failed to'
    ];
    
    const hasTechnicalError = technicalErrors.some(err => 
      data.response && data.response.toLowerCase().includes(err.toLowerCase())
    );
    
    if (hasTechnicalError) {
      issues.push('Response contains technical error message');
    }
    
    // 3. Check if response is conversational
    const conversationalPhrases = [
      'bitcoin is',
      'btc is',
      'currently trading',
      'let me check',
      'looking at',
      'the latest',
      'shows that',
      'appears to be'
    ];
    
    const isConversational = conversationalPhrases.some(phrase => 
      data.response && data.response.toLowerCase().includes(phrase.toLowerCase())
    );
    
    // 4. Check response quality
    const responseQuality = {
      isObject: data.response === '[object Object]',
      hasTechnicalError,
      isConversational,
      length: data.response ? data.response.length : 0,
      hasSymbol: !!data.symbol,
      responseTime
    };
    
    // Display results
    if (issues.length === 0 && isConversational) {
      console.log(`${colors.green}✓ PASS${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ FAIL${colors.reset}`);
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    console.log(`Response time: ${responseTime}ms`);
    console.log(`Response preview: "${data.response ? data.response.substring(0, 100) + '...' : 'N/A'}"`);
    console.log(`Symbol extracted: ${data.symbol || 'None'}`);
    console.log(`Conversational: ${isConversational ? 'Yes' : 'No'}`);
    
    return {
      query,
      success: issues.length === 0 && isConversational,
      issues,
      responseQuality,
      response: data.response
    };
    
  } catch (error) {
    console.log(`${colors.red}✗ ERROR: ${error.message}${colors.reset}`);
    
    return {
      query,
      success: false,
      issues: [`Error: ${error.message}`],
      error: true
    };
  }
}

async function runNLPTests() {
  console.log(`${colors.bright}${colors.blue}=== NLP PIPELINE TEST SUITE ===${colors.reset}`);
  console.log(`Testing natural language processing and response generation`);
  console.log(`Time: ${new Date().toISOString()}\n`);
  
  const sessionId = `nlp-test-${Date.now()}`;
  
  // Test cases focusing on NLP quality
  const testCases = [
    {
      query: 'bitcoin?',
      expected: 'Should map to BTC and give conversational response about Bitcoin'
    },
    {
      query: 'what\'s up with crypto?',
      expected: 'Should provide conversational crypto market overview'
    },
    {
      query: 'BTC price pls',
      expected: 'Should give friendly Bitcoin price update'
    },
    {
      query: 'how\'s apple doing?',
      expected: 'Should map to AAPL and provide conversational update'
    },
    {
      query: 'show me microsoft',
      expected: 'Should map to MSFT and offer to show chart'
    },
    {
      query: 'tell me about gold',
      expected: 'Should map to GC and discuss gold conversationally'
    },
    {
      query: 'oil trends',
      expected: 'Should map to CL and discuss oil trends naturally'
    },
    {
      query: 'nasdaq?',
      expected: 'Should map to QQQ and discuss Nasdaq naturally'
    }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testNLPQuery(testCase.query, sessionId, testCase.expected);
    results.push(result);
    
    // Wait between queries
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Summary
  console.log(`\n${colors.bright}${colors.magenta}=== NLP TEST SUMMARY ===${colors.reset}`);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const withTechnicalErrors = results.filter(r => 
    r.responseQuality && r.responseQuality.hasTechnicalError
  ).length;
  const conversational = results.filter(r => 
    r.responseQuality && r.responseQuality.isConversational
  ).length;
  
  console.log(`Total tests: ${results.length}`);
  console.log(`${colors.green}Conversational responses: ${conversational}${colors.reset}`);
  console.log(`${colors.red}Technical error messages: ${withTechnicalErrors}${colors.reset}`);
  console.log(`${colors.red}Failed tests: ${failed}${colors.reset}`);
  
  // Detailed failure analysis
  if (withTechnicalErrors > 0) {
    console.log(`\n${colors.yellow}Technical Error Examples:${colors.reset}`);
    results.filter(r => r.responseQuality && r.responseQuality.hasTechnicalError)
      .forEach(r => {
        console.log(`  Query: "${r.query}"`);
        console.log(`  Response: "${r.response ? r.response.substring(0, 80) + '...' : 'N/A'}"`);
      });
  }
  
  // Save results
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      successful,
      failed,
      conversational,
      technicalErrors: withTechnicalErrors
    },
    results
  };
  
  require('fs').writeFileSync(
    'nlp_pipeline_results.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log(`\n${colors.cyan}Results saved to nlp_pipeline_results.json${colors.reset}`);
  
  if (conversational === results.length) {
    console.log(`\n${colors.green}${colors.bright}✅ NLP PIPELINE FULLY WORKING!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}❌ NLP PIPELINE NEEDS WORK${colors.reset}`);
    console.log(`Only ${conversational}/${results.length} responses were conversational`);
  }
}

// Run tests
runNLPTests().catch(console.error);