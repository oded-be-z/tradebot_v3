const axios = require('axios');

async function testWithDebug() {
  console.log('🧪 Testing Symbol Propagation with Debug\n');
  
  try {
    // Make the request
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'compare bitcoin and gold prices',
      sessionId: 'test-debug-' + Date.now()
    });
    
    console.log('✅ Request successful');
    console.log('\n📊 Response analysis:');
    console.log('- Type:', response.data.type);
    console.log('- Has symbols field:', 'symbols' in response.data);
    console.log('- Symbols value:', response.data.symbols);
    console.log('- Symbol (singular):', response.data.symbol);
    
    if (response.data.metadata) {
      console.log('\n📋 Metadata:');
      console.log('- Has symbols in metadata:', 'symbols' in response.data.metadata);
      console.log('- Metadata symbols:', response.data.metadata.symbols);
    }
    
    console.log('\n🔑 All response keys:', Object.keys(response.data));
    
    // Log a snippet of the response text
    if (response.data.response) {
      console.log('\n📝 Response snippet:', response.data.response.substring(0, 100) + '...');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testWithDebug();