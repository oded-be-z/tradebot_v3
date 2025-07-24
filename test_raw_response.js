const axios = require('axios');

async function testRawResponse() {
  console.log('🧪 Testing Raw API Response\n');
  
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'bitcoin vs gold',
      sessionId: 'test-raw-' + Date.now()
    });
    
    console.log('📊 Raw Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRawResponse();
EOF < /dev/null
