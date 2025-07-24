const axios = require('axios');

async function testEdgeCases() {
  console.log('🔍 Testing specific edge cases...\n');
  
  const edgeCases = [
    { query: "bitcoin?", expectChart: true, description: "Should show chart" },
    { query: "what's the market like", expectChart: false, description: "Should NOT show chart unless specific index" },
    { query: "market overview", expectChart: false, description: "General market - no chart" },
    { query: "how is the market?", expectChart: false, description: "General market question" },
    { query: "show me the market", expectChart: true, description: "Explicit show keyword" },
  ];
  
  for (const test of edgeCases) {
    try {
      console.log(`Testing: "${test.query}"`);
      
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: test.query,
        sessionId: 'edge-test-' + Date.now()
      });
      
      const showChart = response.data.showChart;
      const type = response.data.type;
      const success = showChart === test.expectChart;
      
      console.log(`  Type: ${type}`);
      console.log(`  Shows Chart: ${showChart}`);
      console.log(`  Expected: ${test.expectChart}`);
      console.log(`  ${success ? '✅' : '❌'} ${test.description}`);
      
      if (!success) {
        console.log(`  Response preview: ${response.data.response.substring(0, 100)}...`);
      }
      
      console.log('');
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error testing "${test.query}":`, error.message);
    }
  }
}

testEdgeCases();