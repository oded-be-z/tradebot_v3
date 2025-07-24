const axios = require('axios');

async function testSymbolPropagation() {
  console.log('🧪 Testing Symbol Propagation Fix\n');
  
  try {
    console.log('Testing: "bitcoin vs gold"');
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'bitcoin vs gold',
      sessionId: 'test-symbols-' + Date.now()
    });
    
    console.log('\n📊 Response Summary:');
    console.log('Success:', response.data.success);
    console.log('Has symbols array:', !!response.data.symbols);
    console.log('Symbols:', response.data.symbols);
    console.log('Symbol (single):', response.data.symbol);
    console.log('Response keys:', Object.keys(response.data));
    
    if (response.data.symbols && response.data.symbols.length > 0) {
      console.log('\n✅ Symbols are being propagated!');
      console.log('Found', response.data.symbols.length, 'symbols:', response.data.symbols);
    } else {
      console.log('\n❌ No symbols found in response!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testSymbolPropagation();