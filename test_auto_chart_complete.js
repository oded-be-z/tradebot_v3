const axios = require('axios');

async function testAutoChartComplete() {
  console.log('🧪 Testing Auto-Chart Intelligence\n');
  
  const testCases = [
    // Should show charts
    { query: "bitcoin?", expected: true, reason: "Single word with ?" },
    { query: "SPY?", expected: true, reason: "ETF with ?" },
    { query: "AAPL price", expected: true, reason: "Price query" },
    { query: "tesla trend", expected: true, reason: "Trend query" },
    { query: "show me gold", expected: true, reason: "Show keyword" },
    { query: "bitcoin vs ethereum", expected: true, reason: "Comparison" },
    
    // Should NOT show charts
    { query: "what is a stock?", expected: false, reason: "Educational" },
    { query: "explain P/E ratio", expected: false, reason: "Explanation" },
    { query: "how does trading work?", expected: false, reason: "How-to" },
    { query: "market news", expected: false, reason: "General news" }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    try {
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: test.query,
        sessionId: 'auto-chart-test-' + Date.now()
      });
      
      const showChart = response.data.showChart;
      const success = showChart === test.expected;
      
      if (success) {
        console.log(`✅ "${test.query}" - ${test.reason} (showChart: ${showChart})`);
        passed++;
      } else {
        console.log(`❌ "${test.query}" - Expected: ${test.expected}, Got: ${showChart}`);
        failed++;
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Error testing "${test.query}":`, error.message);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed}/${testCases.length} passed (${Math.round(passed/testCases.length*100)}%)`);
  
  if (passed / testCases.length >= 0.9) {
    console.log('🎉 SUCCESS: Auto-chart logic is working correctly!');
  } else {
    console.log('⚠️  WARNING: Auto-chart logic needs improvement');
  }
}

testAutoChartComplete().catch(console.error);