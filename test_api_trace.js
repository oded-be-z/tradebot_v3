const axios = require('axios');

const PORT = 3000;
const API_URL = `http://localhost:${PORT}/api/chat`;

async function testApiTrace() {
  const sessionId = `trace_${Date.now()}`;
  
  console.log('🔍 Testing API Response Structure\n');
  
  try {
    // Make request
    console.log('Making request to /api/chat...');
    const response = await axios.post(API_URL, {
      message: "How about NVDA?",
      sessionId: sessionId
    });
    
    console.log('\n📦 Full Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n🔍 Response Analysis:');
    console.log('Top-level keys:', Object.keys(response.data));
    console.log('Has symbol field at top:', 'symbol' in response.data);
    console.log('Symbol value:', response.data.symbol);
    console.log('Has showChart field:', 'showChart' in response.data);
    console.log('ShowChart value:', response.data.showChart);
    
    if (response.data.metadata) {
      console.log('\nMetadata contents:', response.data.metadata);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testApiTrace();