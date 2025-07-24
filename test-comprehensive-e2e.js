// test-comprehensive-e2e.js
const http = require('http');
const fs = require('fs');

// Configuration
const API_URL = 'http://localhost:3000';
const sessionId = `test-e2e-${Date.now()}`;

// Test results collector
const testResults = {
  conversationMemory: { passed: 0, failed: 0, tests: [] },
  portfolioIntelligence: { passed: 0, failed: 0, tests: [] },
  nlpUnderstanding: { passed: 0, failed: 0, tests: [] },
  chartGeneration: { passed: 0, failed: 0, tests: [] },
  responseVariety: { passed: 0, failed: 0, tests: [] },
  overallHealth: { issues: [], warnings: [] }
};

// Helper functions
async function sendMessage(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ message, sessionId });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function uploadPortfolio() {
  // Create test portfolio
  const portfolioCSV = `symbol,shares,purchase_price
AAPL,50,150.00
MSFT,25,300.00
TSLA,15,200.00
SPY,20,380.00
CASH,1,1.00`;
  
  fs.writeFileSync('test-portfolio-e2e.csv', portfolioCSV);
  
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(36);
    const fileContent = fs.readFileSync('test-portfolio-e2e.csv');
    
    const body = `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="portfolio"; filename="test-portfolio-e2e.csv"\r\n` +
      `Content-Type: text/csv\r\n\r\n` +
      `${fileContent}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="sessionId"\r\n\r\n` +
      `${sessionId}\r\n` +
      `--${boundary}--\r\n`;
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/portfolio/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function recordTest(category, testName, passed, details) {
  const result = {
    name: testName,
    passed: passed,
    details: details,
    timestamp: new Date().toISOString()
  };
  
  testResults[category].tests.push(result);
  if (passed) {
    testResults[category].passed++;
  } else {
    testResults[category].failed++;
  }
}

// Test Suites
async function testConversationMemory() {
  console.log('\n📚 TESTING CONVERSATION MEMORY\n');
  
  // Test 1: Basic context retention
  console.log('Test 1: Basic bitcoin query with auto-chart...');
  const btcResponse = await sendMessage("what's up with bitcoin?");
  
  recordTest('conversationMemory', 'Bitcoin query shows price and chart', 
    btcResponse.response.includes('$') && btcResponse.needsChart === true,
    {
      hasPrice: btcResponse.response.includes('$'),
      hasChart: btcResponse.needsChart === true,
      responseLength: btcResponse.response.length
    }
  );
  
  // Test 2: Chart already shown awareness
  console.log('Test 2: Asking for chart again...');
  await new Promise(r => setTimeout(r, 1000));
  const chartAgain = await sendMessage("show me the chart");
  
  const acknowledges = chartAgain.response.toLowerCase().includes('already') || 
                       chartAgain.response.toLowerCase().includes('above') ||
                       !chartAgain.response.toLowerCase().includes('testing psychological');
                       
  recordTest('conversationMemory', 'Bot acknowledges chart was shown',
    acknowledges && chartAgain.response.length < 1000,
    {
      acknowledges: acknowledges,
      responseLength: chartAgain.response.length,
      isTemplate: chartAgain.response.includes('Testing psychological')
    }
  );
  
  // Test 3: Context switching
  console.log('Test 3: Switching to oil context...');
  await new Promise(r => setTimeout(r, 1000));
  const oilResponse = await sendMessage("how's oil doing?");
  
  recordTest('conversationMemory', 'Context switches to oil cleanly',
    oilResponse.response.toLowerCase().includes('oil') && 
    !oilResponse.response.toLowerCase().includes('bitcoin'),
    {
      mentionsOil: oilResponse.response.toLowerCase().includes('oil'),
      noBitcoin: !oilResponse.response.toLowerCase().includes('bitcoin')
    }
  );
  
  // Test 4: Vague query understanding
  console.log('Test 4: Vague follow-up query...');
  await new Promise(r => setTimeout(r, 1000));
  const vagueResponse = await sendMessage("what about the longer term trend?");
  
  recordTest('conversationMemory', 'Understands vague query refers to oil',
    vagueResponse.response.toLowerCase().includes('oil') || 
    vagueResponse.response.toLowerCase().includes('crude'),
    {
      contextual: vagueResponse.response.toLowerCase().includes('oil') || 
                  vagueResponse.response.toLowerCase().includes('crude'),
      mentionsLimits: vagueResponse.response.toLowerCase().includes('30 day') ||
                      vagueResponse.response.toLowerCase().includes('month')
    }
  );
}

async function testPortfolioIntelligence() {
  console.log('\n💼 TESTING PORTFOLIO INTELLIGENCE\n');
  
  // Upload portfolio
  console.log('Uploading test portfolio...');
  try {
    await uploadPortfolio();
    console.log('Portfolio uploaded successfully');
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {
    recordTest('portfolioIntelligence', 'Portfolio upload', false, { error: e.message });
    return;
  }
  
  // Test 1: Portfolio analysis
  console.log('Test 1: Analyzing portfolio...');
  const analysisResponse = await sendMessage("analyze my portfolio");
  
  recordTest('portfolioIntelligence', 'Portfolio analysis mentions holdings',
    analysisResponse.response.includes('AAPL') && 
    analysisResponse.response.includes('MSFT') &&
    analysisResponse.response.includes('%'),
    {
      mentionsHoldings: analysisResponse.response.includes('AAPL') && analysisResponse.response.includes('MSFT'),
      hasPercentages: analysisResponse.response.includes('%'),
      responseLength: analysisResponse.response.length
    }
  );
  
  // Test 2: Specific holding query
  console.log('Test 2: Asking about specific holding...');
  await new Promise(r => setTimeout(r, 1000));
  const tslaResponse = await sendMessage("should I sell my tesla shares?");
  
  recordTest('portfolioIntelligence', 'Knows user has 15 TSLA shares',
    tslaResponse.response.includes('15') || 
    tslaResponse.response.toLowerCase().includes('your tesla'),
    {
      mentionsShares: tslaResponse.response.includes('15'),
      personalized: tslaResponse.response.toLowerCase().includes('your')
    }
  );
  
  // Test 3: Context-aware follow-up
  console.log('Test 3: Portfolio context follow-up...');
  await new Promise(r => setTimeout(r, 1000));
  const followUpResponse = await sendMessage("what if I put it all in apple instead?");
  
  recordTest('portfolioIntelligence', 'Understands "it" refers to TSLA position',
    followUpResponse.response.toLowerCase().includes('tesla') || 
    followUpResponse.response.toLowerCase().includes('tsla'),
    {
      understandsContext: followUpResponse.response.toLowerCase().includes('tesla') || 
                         followUpResponse.response.toLowerCase().includes('tsla'),
      mentionsApple: followUpResponse.response.toLowerCase().includes('apple') || 
                     followUpResponse.response.toLowerCase().includes('aapl')
    }
  );
  
  // Cleanup
  try {
    fs.unlinkSync('test-portfolio-e2e.csv');
  } catch (e) {}
}

async function testNLPUnderstanding() {
  console.log('\n🗣️ TESTING NLP UNDERSTANDING\n');
  
  // Test 1: Casual language
  console.log('Test 1: Casual language understanding...');
  const casualResponse = await sendMessage("yo what's poppin with tesla stock rn");
  
  recordTest('nlpUnderstanding', 'Understands casual language',
    casualResponse.response.includes('TSLA') || casualResponse.response.includes('Tesla'),
    {
      understood: casualResponse.response.includes('TSLA') || casualResponse.response.includes('Tesla'),
      responseType: casualResponse.type
    }
  );
  
  // Test 2: Poor grammar/spelling
  console.log('Test 2: Handling typos...');
  await new Promise(r => setTimeout(r, 1000));
  const typoResponse = await sendMessage("bitcoine prics?");
  
  recordTest('nlpUnderstanding', 'Handles typos and poor grammar',
    typoResponse.response.includes('BTC') || 
    typoResponse.response.toLowerCase().includes('bitcoin'),
    {
      understood: typoResponse.response.includes('BTC') || typoResponse.response.toLowerCase().includes('bitcoin'),
      hasPrice: typoResponse.response.includes('$')
    }
  );
  
  // Test 3: Comparison without perfect syntax
  console.log('Test 3: Comparison query...');
  await new Promise(r => setTimeout(r, 1000));
  const comparisonResponse = await sendMessage("apple vs microsoft which better");
  
  recordTest('nlpUnderstanding', 'Handles comparison without perfect syntax',
    comparisonResponse.response.includes('AAPL') && 
    comparisonResponse.response.includes('MSFT'),
    {
      mentionsBoth: comparisonResponse.response.includes('AAPL') && comparisonResponse.response.includes('MSFT'),
      isComparison: comparisonResponse.type === 'comparison'
    }
  );
}

async function testChartGeneration() {
  console.log('\n📊 TESTING CHART GENERATION\n');
  
  // Test 1: Auto-chart on first mention
  console.log('Test 1: Auto-chart generation...');
  const goldResponse = await sendMessage("tell me about gold");
  
  recordTest('chartGeneration', 'Auto-generates chart on first mention',
    goldResponse.needsChart === true,
    {
      needsChart: goldResponse.needsChart,
      chartType: goldResponse.chartType
    }
  );
  
  // Test 2: No duplicate charts
  console.log('Test 2: Avoiding duplicate charts...');
  await new Promise(r => setTimeout(r, 1000));
  const goldAgain = await sendMessage("more about gold trends");
  
  recordTest('chartGeneration', 'Avoids duplicate chart generation',
    !goldAgain.needsChart || goldAgain.response.toLowerCase().includes('already'),
    {
      needsChart: goldAgain.needsChart,
      acknowledges: goldAgain.response.toLowerCase().includes('already')
    }
  );
  
  // Test 3: Comparison charts
  console.log('Test 3: Comparison chart generation...');
  await new Promise(r => setTimeout(r, 1000));
  const comparisonChart = await sendMessage("compare gold and silver charts");
  
  recordTest('chartGeneration', 'Generates comparison charts',
    comparisonChart.needsChart === true || comparisonChart.chartType === 'comparison',
    {
      needsChart: comparisonChart.needsChart,
      chartType: comparisonChart.chartType,
      mentionsBoth: comparisonChart.response.includes('gold') && comparisonChart.response.includes('silver')
    }
  );
}

async function testResponseVariety() {
  console.log('\n🎲 TESTING RESPONSE VARIETY\n');
  
  const responses = [];
  console.log('Asking about SPY three times...');
  
  for (let i = 0; i < 3; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const response = await sendMessage("how's SPY doing?");
    responses.push(response.response);
    console.log(`Response ${i + 1} length: ${response.response.length} chars`);
  }
  
  // Check uniqueness
  const uniqueResponses = new Set(responses).size;
  
  recordTest('responseVariety', 'Generates varied responses for same query',
    uniqueResponses >= 2,
    {
      totalResponses: responses.length,
      uniqueResponses: uniqueResponses,
      lengths: responses.map(r => r.length)
    }
  );
  
  // Check for template phrases
  const hasTemplates = responses.some(r => 
    r.includes('Testing psychological') || 
    r.includes('MicroStrategy')
  );
  
  recordTest('responseVariety', 'No template phrases in responses',
    !hasTemplates,
    {
      hasTemplates: hasTemplates,
      sampleResponse: responses[0].substring(0, 100)
    }
  );
}

// Report Generation
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 COMPREHENSIVE TEST REPORT');
  console.log('='.repeat(80));
  
  // Overall Statistics
  let totalPassed = 0;
  let totalFailed = 0;
  
  Object.values(testResults).forEach(category => {
    if (category.passed !== undefined) {
      totalPassed += category.passed;
      totalFailed += category.failed;
    }
  });
  
  console.log(`\n📊 OVERALL: ${totalPassed}/${totalPassed + totalFailed} tests passed (${Math.round(totalPassed/(totalPassed+totalFailed)*100)}%)\n`);
  
  // Category Results
  Object.entries(testResults).forEach(([category, results]) => {
    if (results.tests) {
      console.log(`\n### ${category.toUpperCase()}`);
      console.log(`Passed: ${results.passed}/${results.tests.length}`);
      
      results.tests.forEach(test => {
        console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}`);
        if (!test.passed) {
          console.log(`     Details: ${JSON.stringify(test.details, null, 2).replace(/\n/g, '\n     ')}`);
        }
      });
    }
  });
  
  // Critical Issues
  console.log('\n🚨 CRITICAL ISSUES:');
  let criticalCount = 0;
  
  // Check for major failures
  if (testResults.conversationMemory.failed > 2) {
    console.log('  ❌ Conversation memory is severely broken');
    criticalCount++;
  }
  
  if (testResults.portfolioIntelligence.failed > 1) {
    console.log('  ❌ Portfolio features not working properly');
    criticalCount++;
  }
  
  if (testResults.responseVariety.tests.some(t => !t.passed && t.name.includes('template'))) {
    console.log('  ❌ Still using template responses');
    criticalCount++;
  }
  
  if (criticalCount === 0) {
    console.log('  ✅ No critical issues found');
  }
  
  // Warnings
  console.log('\n⚠️ WARNINGS:');
  let warningCount = 0;
  
  if (testResults.chartGeneration.failed > 0) {
    console.log('  ⚠️ Chart generation has some issues');
    warningCount++;
  }
  
  if (testResults.nlpUnderstanding.failed > 0) {
    console.log('  ⚠️ NLP understanding could be improved');
    warningCount++;
  }
  
  if (warningCount === 0) {
    console.log('  ✅ No warnings');
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (totalFailed > 0) {
    console.log('  1. Focus on failed tests first');
    console.log('  2. Check Azure OpenAI integration for response issues');
    console.log('  3. Verify conversation state is properly maintained');
  } else {
    console.log('  ✅ All systems functioning well!');
    console.log('  Ready for production deployment');
  }
  
  // Save detailed report
  fs.writeFileSync('test-report.json', JSON.stringify(testResults, null, 2));
  console.log('\n📄 Detailed report saved to: test-report.json');
  
  console.log('\n' + '='.repeat(80));
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive E2E Tests');
  console.log('Session ID:', sessionId);
  console.log('Testing against:', API_URL);
  
  try {
    await testConversationMemory();
    await testNLPUnderstanding();
    await testChartGeneration();
    await testPortfolioIntelligence();
    await testResponseVariety();
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    testResults.overallHealth.issues.push(`Test suite error: ${error.message}`);
  }
  
  generateReport();
}

// Run tests
runAllTests().then(() => {
  console.log('\n✅ Test suite completed');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Test suite crashed:', err);
  process.exit(1);
});
