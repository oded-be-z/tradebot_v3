const axios = require('axios');

// ANSI color codes
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

// Only test the failing cases from the 76.8% run
const failingTests = [
  // Chart detection
  { query: "show me NVDA chart", expectedType: "trend_analysis", expectedChart: true },
  
  // Group analysis
  { query: "analyze FAANG stocks", expectedType: "group_analysis", expectedSymbols: ["META","AAPL","AMZN","NFLX","GOOGL"] },
  { query: "tech stocks comparison", expectedType: "comparison", expectedSymbols: ["AAPL","MSFT","GOOGL","AMZN","META","NVDA"] },
  
  // Context awareness
  { query: "bitcoin", setup: true },
  { query: "ethereum", setup: true },
  { query: "compare them", expectedSymbols: ["BTC","ETH"], contextDependent: true },
  { query: "show me their trends", expectedChart: true, contextDependent: true },
  
  // Company info
  { query: "who is the CEO of Apple?", expectedContent: "Tim Cook", expectedSymbols: ["AAPL"] },
  { query: "who runs Microsoft?", expectedContent: "Satya Nadella", expectedSymbols: ["MSFT"] },
  { query: "when was Amazon founded?", expectedContent: "1994", expectedSymbols: ["AMZN"] },
  
  // Date/time (critical)
  { query: "what date is it now?", expectedType: "date_time", expectedContent: "2025" },
  { query: "what time is it?", expectedType: "date_time", expectedContent: ["AM","PM"] },
  { query: "current date", expectedType: "date_time", expectedContent: "July" },
  
  // Investment advice
  { query: "is bitcoin a good investment?", expectedSymbols: ["BTC"], expectedNotType: "refusal" }
];

async function testQuery(query, sessionId = null) {
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: query,
      sessionId: sessionId || 'test-' + Date.now()
    });
    
    return {
      success: true,
      data: response.data,
      sessionId: sessionId
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log(colors.yellow('\n=== TESTING ONLY FAILED CASES ===\n'));
  
  let passed = 0;
  let failed = 0;
  let sessionId = 'test-session-' + Date.now();
  
  for (const test of failingTests) {
    if (test.setup) {
      // Setup query for context
      const result = await testQuery(test.query, sessionId);
      if (result.sessionId) sessionId = result.sessionId;
      console.log(colors.gray(`Setup: ${test.query}`));
      continue;
    }
    
    process.stdout.write(`Testing: ${test.query.padEnd(40)} `);
    
    const result = await testQuery(test.query, test.contextDependent ? sessionId : null);
    if (result.sessionId && test.contextDependent) sessionId = result.sessionId;
    
    if (!result.success) {
      console.log(colors.red('✗ Failed to connect'));
      failed++;
      continue;
    }
    
    const data = result.data;
    const issues = [];
    
    // Check response type
    if (test.expectedType && data.type !== test.expectedType) {
      issues.push(`Expected type ${test.expectedType}, got ${data.type}`);
    }
    
    // Check not refusal
    if (test.expectedNotType && data.type === test.expectedNotType) {
      issues.push(`Should not be ${test.expectedNotType}`);
    }
    
    // Check for chart
    if (test.expectedChart && !data.chartData) {
      issues.push('Expected chart data not found');
    }
    
    // Check symbols
    if (test.expectedSymbols) {
      // Check multiple places where symbols might be stored
      const symbols = data.metadata?.symbols || data.symbols || [];
      
      // Also check if symbols are mentioned in the response
      const responseSymbols = [];
      if (data.response) {
        test.expectedSymbols.forEach(sym => {
          if (data.response.includes(sym)) {
            responseSymbols.push(sym);
          }
        });
      }
      
      // Use whichever has more symbols
      const allSymbols = symbols.length > responseSymbols.length ? symbols : responseSymbols;
      
      const hasAllSymbols = test.expectedSymbols.every(s => allSymbols.includes(s));
      if (!hasAllSymbols || allSymbols.length < test.expectedSymbols.length) {
        issues.push(`Expected symbols ${test.expectedSymbols.join(',')}, got ${allSymbols.join(',')}`);
      }
    }
    
    // Check content
    if (test.expectedContent) {
      const content = data.response || '';
      const contentArray = Array.isArray(test.expectedContent) ? test.expectedContent : [test.expectedContent];
      const hasContent = contentArray.some(c => content.includes(c));
      if (!hasContent) {
        issues.push(`Expected content not found: ${test.expectedContent}`);
      }
    }
    
    if (issues.length === 0) {
      console.log(colors.green('✓ Passed'));
      passed++;
    } else {
      console.log(colors.red(`✗ ${issues.join(', ')}`));
      failed++;
      
      // Debug info
      console.log(colors.gray(`  Type: ${data.type}`));
      console.log(colors.gray(`  Response preview: ${data.response?.substring(0, 100)}...`));
      if (data.metadata?.symbols || data.symbols) {
        console.log(colors.gray(`  Symbols: ${(data.metadata?.symbols || data.symbols || []).join(', ')}`));
      }
      if (test.expectedSymbols) {
        console.log(colors.gray(`  Full data keys: ${Object.keys(data).join(', ')}`));
      }
    }
  }
  
  console.log(colors.yellow(`\n=== RESULTS ===`));
  console.log(colors.green(`Passed: ${passed}`));
  console.log(colors.red(`Failed: ${failed}`));
  console.log(colors.yellow(`Total: ${passed + failed}`));
  console.log(colors.yellow(`Pass rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`));
  
  if (failed === 0) {
    console.log(colors.green('\n✨ ALL FAILED TESTS NOW PASSING! Ready for full E2E run.'));
  } else {
    console.log(colors.red('\n❌ Some tests still failing. Need more fixes.'));
  }
}

// Run the tests
runTests().catch(console.error);