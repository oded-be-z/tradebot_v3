const axios = require('axios');

async function testSymbolsDetailed() {
  console.log('🧪 Testing Symbols in Detail\n');
  
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'bitcoin vs gold',
      sessionId: 'test-symbols-detailed'
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('\n🔑 Response Keys:', Object.keys(response.data));
    console.log('\n📝 Response Data:');
    console.log('- Type:', response.data.type);
    console.log('- Symbol (single):', response.data.symbol);
    console.log('- Symbols array:', response.data.symbols);
    console.log('- Has showChart:', response.data.showChart);
    console.log('- Has chartData:', !!response.data.chartData);
    
    // Check metadata
    if (response.data.metadata) {
      console.log('\n📋 Metadata:');
      console.log(JSON.stringify(response.data.metadata, null, 2));
    }
    
    // Check for symbols in any form
    const possibleSymbolLocations = [
      response.data.symbols,
      response.data.symbol ? [response.data.symbol] : null,
      response.data.metadata?.symbols,
      response.data.data?.symbols
    ];
    
    console.log('\n🔍 Symbol Search:');
    possibleSymbolLocations.forEach((loc, i) => {
      if (loc) {
        console.log(`Location ${i}: Found symbols:`, loc);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testSymbolsDetailed();