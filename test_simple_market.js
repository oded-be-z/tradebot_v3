const axios = require('axios');

async function testSimpleMarket() {
  console.log('🔍 Testing simple market query\n');
  
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: "what's the market like",
      sessionId: 'simple-test-' + Date.now()
    });
    
    console.log('Full response data:');
    console.log(JSON.stringify({
      type: response.data.type,
      showChart: response.data.showChart,
      symbols: response.data.symbols,
      chartData: !!response.data.chartData,
      responseLength: response.data.response.length
    }, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSimpleMarket();