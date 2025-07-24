const axios = require('axios');

async function debugAutoChart() {
  console.log('🔍 Debugging Auto-Chart Logic\n');
  
  const testCases = [
    "what's the market like",
    "market overview", 
    "how is the market?",
    "bitcoin?",
    "show me the market"
  ];
  
  for (const query of testCases) {
    try {
      console.log(`\n📊 Testing: "${query}"`);
      
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: query,
        sessionId: 'debug-' + Date.now()
      });
      
      console.log(`  Type: ${response.data.type}`);
      console.log(`  Shows Chart: ${response.data.showChart}`);
      
      // Check if symbols are in the response data
      if (response.data.symbols) {
        console.log(`  Symbols: ${JSON.stringify(response.data.symbols)}`);
      }
      
      // Check response data keys to see what's available
      console.log(`  Response keys: ${Object.keys(response.data).join(', ')}`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error testing "${query}":`, error.message);
    }
  }
}

debugAutoChart();