// Simple test to see middleware logs
const axios = require('axios');

async function testSimpleFormat() {
  console.log('🧪 Simple format test - checking server logs for [FORMAT-MIDDLEWARE]');
  
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'hello',
      sessionId: 'simple-test'
    });
    
    console.log(`Response: "${response.data.response.substring(0, 100)}..."`);
    console.log('✅ Test completed - check server console for middleware logs');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSimpleFormat();