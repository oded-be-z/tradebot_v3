const axios = require('axios');

async function testDetailedSymbolFlow() {
  console.log('🧪 Testing Detailed Symbol Flow\n');
  
  const queries = [
    'bitcoin vs gold',
    'compare AAPL and MSFT',
    'BTC versus ETH'
  ];
  
  for (const query of queries) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Testing: "${query}"`);
    
    try {
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: query,
        sessionId: 'test-detailed-' + Date.now()
      });
      
      const data = response.data;
      console.log('\n📊 Response Analysis:');
      console.log('Type:', data.type);
      console.log('Single symbol:', data.symbol || 'none');
      console.log('Symbols array exists:', 'symbols' in data);
      console.log('Symbols array:', data.symbols || 'missing');
      
      if (data.symbols && data.symbols.length > 0) {
        console.log('✅ SUCCESS: Found', data.symbols.length, 'symbols');
      } else {
        console.log('❌ FAIL: No symbols array');
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}

testDetailedSymbolFlow();