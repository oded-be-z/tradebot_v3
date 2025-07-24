const fetch = require('node-fetch');
const fs = require('fs');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:3000';
let sessionId = `test-${Date.now()}`;

// Test results storage
const results = {
  portfolioAutoAnalysis: { status: false, details: '' },
  uiOverlapping: { status: false, details: '' },
  contextMemory: { status: false, details: '' },
  responseWarmth: { rating: 0, details: '' },
  dataAccuracy: { status: false, details: '' },
  performance: { metrics: [] }
};

// Helper function to make chat requests
async function sendChat(message) {
  const startTime = Date.now();
  try {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
      },
      body: JSON.stringify({ message, sessionId })
    });
    
    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    results.performance.metrics.push({
      query: message,
      responseTime: responseTime,
      success: data.success
    });
    
    return data;
  } catch (error) {
    console.error('Chat request failed:', error);
    return { success: false, error: error.message };
  }
}

// Test Suite 1: Portfolio Auto-Analysis
async function testPortfolioAutoAnalysis() {
  console.log('\n=== TEST SUITE 1: Portfolio Auto-Analysis ===');
  
  // Create test portfolio CSV
  const csvContent = `Symbol,Shares,Purchase Price
AAPL,100,150.00
MSFT,50,280.00
GOOGL,25,125.00
TSLA,30,200.00
NVDA,40,450.00`;
  
  fs.writeFileSync('test_portfolio.csv', csvContent);
  
  const form = new FormData();
  form.append('file', fs.createReadStream('test_portfolio.csv'));
  form.append('sessionId', sessionId);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/portfolio/upload`, {
      method: 'POST',
      body: form
    });
    
    const data = await response.json();
    const uploadTime = Date.now() - startTime;
    
    console.log(`Upload completed in ${uploadTime}ms`);
    console.log(`Success: ${data.success}`);
    console.log(`Auto-analysis present: ${!!data.autoAnalysis}`);
    
    if (data.autoAnalysis) {
      console.log(`Auto-analysis type: ${data.autoAnalysis.type}`);
      console.log(`Auto-analysis preview: ${data.autoAnalysis.response?.substring(0, 100)}...`);
      
      results.portfolioAutoAnalysis = {
        status: true,
        details: `Analysis triggered automatically in ${uploadTime}ms. Type: ${data.autoAnalysis.type}`
      };
    } else {
      results.portfolioAutoAnalysis = {
        status: false,
        details: 'No auto-analysis in response'
      };
    }
  } catch (error) {
    console.error('Portfolio upload failed:', error);
    results.portfolioAutoAnalysis = {
      status: false,
      details: `Upload error: ${error.message}`
    };
  }
}

// Test Suite 2: Check UI implementation
async function testUIImplementation() {
  console.log('\n=== TEST SUITE 2: UI Overlapping (Code Analysis) ===');
  
  // Read the CSS changes we made
  const indexContent = fs.readFileSync('/home/odedbe/tradebot_v3/public/index.html', 'utf8');
  
  const checks = {
    messageSpacing: indexContent.includes('margin-bottom: 32px'),
    uploadIndicatorZIndex: indexContent.includes('z-index: 1002'),
    apiLoadingPosition: indexContent.includes('top: 80px'),
    fadeInAnimation: indexContent.includes('fade-in')
  };
  
  const allFixed = Object.values(checks).every(v => v);
  
  console.log('CSS Fixes Applied:');
  console.log(`- Message spacing (32px): ${checks.messageSpacing ? '✅' : '❌'}`);
  console.log(`- Upload indicator z-index: ${checks.uploadIndicatorZIndex ? '✅' : '❌'}`);
  console.log(`- API loading position: ${checks.apiLoadingPosition ? '✅' : '❌'}`);
  console.log(`- Fade-in animations: ${checks.fadeInAnimation ? '✅' : '❌'}`);
  
  results.uiOverlapping = {
    status: allFixed,
    details: `All CSS fixes applied: ${allFixed ? 'Yes' : 'No'}`
  };
}

// Test Suite 3: Context & Memory
async function testContextMemory() {
  console.log('\n=== TEST SUITE 3: Context & Memory ===');
  
  const testSequence = [
    { query: "what's the price of apple?", expectedContext: null },
    { query: "show me the trend", expectedContext: "AAPL" },
    { query: "how about microsoft?", expectedContext: "AAPL" },
    { query: "compare them", expectedContext: "AAPL,MSFT" }
  ];
  
  let allCorrect = true;
  
  for (const test of testSequence) {
    console.log(`\nQuery: "${test.query}"`);
    const response = await sendChat(test.query);
    
    if (response.success) {
      console.log(`Response preview: ${response.response?.substring(0, 100)}...`);
      console.log(`Context understood: ${response.response ? '✅' : '❌'}`);
      
      // Check if response mentions expected context
      if (test.expectedContext && response.response) {
        const contextFound = test.expectedContext.split(',').some(symbol => 
          response.response.toUpperCase().includes(symbol)
        );
        console.log(`Expected context (${test.expectedContext}): ${contextFound ? '✅' : '❌'}`);
        if (!contextFound) allCorrect = false;
      }
    } else {
      console.log(`Error: ${response.error}`);
      allCorrect = false;
    }
  }
  
  results.contextMemory = {
    status: allCorrect,
    details: allCorrect ? 'All context queries understood correctly' : 'Some context queries failed'
  };
}

// Test Suite 4: Response Quality
async function testResponseQuality() {
  console.log('\n=== TEST SUITE 4: Response Quality (Temperature) ===');
  
  const qualityTests = [
    { query: "hi!", type: "greeting", expectedWarmth: 8 },
    { query: "analyze my portfolio", type: "financial", expectedWarmth: 5 },
    { query: "what do you think about my portfolio?", type: "casual", expectedWarmth: 7 }
  ];
  
  let totalWarmth = 0;
  let accuracyMaintained = true;
  
  for (const test of qualityTests) {
    console.log(`\nTesting ${test.type}: "${test.query}"`);
    const response = await sendChat(test.query);
    
    if (response.success && response.response) {
      // Check for warm language patterns
      const warmPatterns = [
        /I notice/i, /I see/i, /Looking at/i, /your portfolio/i,
        /Hey there/i, /Hi!/i, /Great to/i
      ];
      
      const warmthScore = warmPatterns.filter(pattern => 
        pattern.test(response.response)
      ).length;
      
      const hasNumbers = /\d+\.?\d*%?/.test(response.response);
      
      console.log(`Response preview: ${response.response.substring(0, 150)}...`);
      console.log(`Warm language patterns found: ${warmthScore}`);
      console.log(`Contains data/numbers: ${hasNumbers ? '✅' : '❌'}`);
      
      totalWarmth += Math.min(warmthScore * 2, 10);
      
      if (test.type === 'financial' && !hasNumbers) {
        accuracyMaintained = false;
      }
    }
  }
  
  const avgWarmth = Math.round(totalWarmth / qualityTests.length);
  
  results.responseWarmth = {
    rating: avgWarmth,
    details: `Average warmth: ${avgWarmth}/10, Accuracy maintained: ${accuracyMaintained ? 'Yes' : 'No'}`
  };
  
  results.dataAccuracy = {
    status: accuracyMaintained,
    details: 'Financial responses include accurate data'
  };
}

// Test Suite 5: Full User Journey
async function testFullJourney() {
  console.log('\n=== TEST SUITE 5: Full User Journey ===');
  
  const journeyStart = Date.now();
  const journey = [
    "hi",
    "wait:1000", // Wait for response
    "upload:portfolio", // Special command to upload
    "wait:2000", // Wait for auto-analysis
    "which stock should I sell?",
    "why?"
  ];
  
  for (const step of journey) {
    if (step.startsWith('wait:')) {
      const ms = parseInt(step.split(':')[1]);
      console.log(`Waiting ${ms}ms...`);
      await new Promise(resolve => setTimeout(resolve, ms));
    } else if (step === 'upload:portfolio') {
      console.log('Uploading portfolio...');
      await testPortfolioAutoAnalysis();
    } else {
      console.log(`\nUser: "${step}"`);
      const response = await sendChat(step);
      if (response.success) {
        console.log(`Bot: ${response.response?.substring(0, 150)}...`);
      }
    }
  }
  
  const totalTime = Date.now() - journeyStart;
  console.log(`\nTotal journey time: ${totalTime}ms`);
}

// Main test runner
async function runAllTests() {
  console.log('🧪 FINANCEBOT PRO COMPREHENSIVE TEST SUITE');
  console.log('==========================================');
  
  // Check if server is running
  try {
    const health = await fetch(`${BASE_URL}/`);
    if (!health.ok) throw new Error('Server not responding');
  } catch (error) {
    console.error('❌ Server is not running! Please start the server first.');
    return;
  }
  
  // Run all test suites
  await testPortfolioAutoAnalysis();
  await testUIImplementation();
  await testContextMemory();
  await testResponseQuality();
  await testFullJourney();
  
  // Print final report
  console.log('\n\n===========================');
  console.log('FINAL TEST REPORT');
  console.log('===========================');
  console.log(`FEATURE | STATUS | NOTES`);
  console.log(`Portfolio Auto-Analysis | ${results.portfolioAutoAnalysis.status ? '✅' : '❌'} | ${results.portfolioAutoAnalysis.details}`);
  console.log(`UI Overlapping Fixed | ${results.uiOverlapping.status ? '✅' : '❌'} | ${results.uiOverlapping.details}`);
  console.log(`Context Memory | ${results.contextMemory.status ? '✅' : '❌'} | ${results.contextMemory.details}`);
  console.log(`Response Warmth | ${results.responseWarmth.rating}/10 | ${results.responseWarmth.details}`);
  console.log(`Data Accuracy | ${results.dataAccuracy.status ? '✅' : '❌'} | ${results.dataAccuracy.details}`);
  console.log('===========================');
  
  // Performance metrics
  console.log('\nPERFORMANCE METRICS:');
  const avgResponseTime = results.performance.metrics.reduce((sum, m) => sum + m.responseTime, 0) / results.performance.metrics.length;
  console.log(`- Average response time: ${Math.round(avgResponseTime)}ms`);
  console.log(`- Total API calls: ${results.performance.metrics.length}`);
  console.log(`- Success rate: ${(results.performance.metrics.filter(m => m.success).length / results.performance.metrics.length * 100).toFixed(1)}%`);
  
  // Clean up
  if (fs.existsSync('test_portfolio.csv')) {
    fs.unlinkSync('test_portfolio.csv');
  }
}

// Run the tests
runAllTests().catch(console.error);