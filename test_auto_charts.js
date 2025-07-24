const axios = require('axios');

const API_URL = 'http://localhost:3000/api/chat';
const SESSION_URL = 'http://localhost:3000/api/session/init';

async function testAutoCharts() {
  console.log('🧪 Testing Auto-Chart Logic\n');
  
  try {
    // Create session
    const sessionResp = await axios.post(SESSION_URL);
    const sessionId = sessionResp.data.sessionId;
    console.log(`Session created: ${sessionId}\n`);
    
    const testCases = [
      { query: "bitcoin?", expectChart: true, reason: "Single word crypto query" },
      { query: "AAPL price", expectChart: true, reason: "Price query" },
      { query: "how's tesla doing", expectChart: true, reason: "Performance query" },
      { query: "MSFT trend", expectChart: true, reason: "Trend query" },
      { query: "what's the market like", expectChart: false, reason: "General query, no symbols" },
      { query: "explain P/E ratio", expectChart: false, reason: "Educational, no symbols" },
      { query: "show me gold", expectChart: true, reason: "Commodity with 'show'" },
      { query: "nvidia performance", expectChart: true, reason: "Performance query" },
      { query: "SPY?", expectChart: true, reason: "ETF with question mark" },
      { query: "how is amazon stock doing", expectChart: true, reason: "Stock performance query" }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of testCases) {
      try {
        const response = await axios.post(API_URL, {
          message: test.query,
          sessionId: sessionId,
          conversationHistory: []
        });
        
        const data = response.data;
        const hasChart = data.showChart || !!data.chartUrl || !!data.chartData;
        const success = hasChart === test.expectChart;
        
        console.log(`${success ? '✅' : '❌'} "${test.query}"`);
        console.log(`   Expected chart: ${test.expectChart}, Got chart: ${hasChart}`);
        console.log(`   Reason: ${test.reason}`);
        console.log(`   Intent: ${data.type || 'unknown'}`);
        console.log(`   Symbols: ${data.symbols?.join(', ') || data.symbol || 'none'}`);
        console.log(`   Response preview: ${data.response.substring(0, 60)}...`);
        
        if (!success) {
          console.log(`   🔍 Debug: showChart=${data.showChart}, chartUrl=${!!data.chartUrl}, chartData=${!!data.chartData}`);
        }
        console.log();
        
        if (success) {
          passed++;
        } else {
          failed++;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`❌ "${test.query}" - Error: ${error.message}`);
        if (error.response) {
          console.log('   Response data:', error.response.data);
        }
        failed++;
      }
    }
    
    console.log(`\n📊 Results: ${passed}/${testCases.length} tests passed (${Math.round(passed/testCases.length*100)}%)`);
    if (failed > 0) {
      console.log(`   ${failed} tests failed`);
    }
    
  } catch (error) {
    console.error('❌ Failed to create session:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Server is not running!');
      console.log('Please start the server with: npm start');
    }
  }
}

// Also test comparison charts if server is running
async function testComparisonQuick() {
  console.log('\n\n🧪 Quick Comparison Chart Test\n');
  
  try {
    const testCases = [
      { query: "bitcoin vs gold", expectSymbols: ["BTC", "GOLD"] },
      { query: "compare AAPL to MSFT", expectSymbols: ["AAPL", "MSFT"] }
    ];
    
    for (const test of testCases) {
      try {
        const response = await axios.post(API_URL, {
          message: test.query,
          conversationHistory: []
        });
        
        const data = response.data;
        const symbols = data.symbols || [];
        const isComparison = data.type === 'comparison_query';
        const hasMultipleSymbols = symbols.length > 1;
        
        console.log(`${isComparison && hasMultipleSymbols ? '✅' : '❌'} "${test.query}"`);
        console.log(`   Intent: ${data.type}`);
        console.log(`   Symbols: ${symbols.join(', ')}`);
        console.log(`   Has chart: ${data.showChart}`);
        console.log();
        
      } catch (error) {
        console.log(`❌ "${test.query}" - Error: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Comparison test error:', error.message);
  }
}

// Run both tests
async function runAllTests() {
  await testAutoCharts();
  await testComparisonQuick();
}

runAllTests().catch(console.error);