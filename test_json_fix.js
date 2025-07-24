const axios = require('axios');

async function testJsonFix() {
  try {
    const response = await axios.post('http://localhost:3001/api/chat', {
      message: 'AAPL price',
      sessionId: 'test-json-fix-' + Date.now()
    });
    
    console.log('\n=== API RESPONSE ===');
    console.log('Response type:', typeof response.data.response);
    console.log('Response content:', response.data.response);
    console.log('\n=== FULL DATA ===');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Check if response contains JSON structure
    if (response.data.response && response.data.response.includes('"response":')) {
      console.log('\n❌ ERROR: Response still contains JSON structure!');
    } else {
      console.log('\n✅ SUCCESS: Response is clean text!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testJsonFix();