const axios = require('axios');

async function testFinalCheck() {
  console.log('🧪 Final Symbol Propagation Check\n');
  
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'bitcoin vs gold',
      sessionId: 'test-final-' + Date.now()
    });
    
    console.log('✅ Request successful');
    console.log('\n📊 Response structure:');
    console.log('- Type:', response.data.type);
    console.log('- Has symbols field:', 'symbols' in response.data);
    console.log('- Has symbolsList field:', 'symbolsList' in response.data);
    
    // Try accessing the raw response
    console.log('\n🔍 Checking axios response object:');
    console.log('- Config URL:', response.config.url);
    console.log('- Status:', response.status);
    console.log('- Headers content-length:', response.headers['content-length']);
    
    // Check if symbols might be elsewhere
    if (!response.data.symbols) {
      console.log('\n❌ SYMBOLS MISSING IN RESPONSE.DATA');
      console.log('Available keys:', Object.keys(response.data));
    } else {
      console.log('\n✅ SYMBOLS FOUND:', response.data.symbols);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFinalCheck();