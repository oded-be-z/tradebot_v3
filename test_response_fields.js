const axios = require('axios');

async function testResponseFields() {
  console.log('🧪 Testing Response Fields\n');
  
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'bitcoin vs gold',
      sessionId: 'test-fields-' + Date.now()
    });
    
    console.log('📥 Response Status:', response.status);
    console.log('\n🔑 Response fields:');
    
    const data = response.data;
    for (const [key, value] of Object.entries(data)) {
      if (key === 'response' || key === 'chartData') {
        console.log(`- ${key}: [${typeof value}] (content omitted)`);
      } else if (key === 'symbols') {
        console.log(`- ${key}:`, value, '<-- CHECKING THIS');
      } else {
        console.log(`- ${key}:`, value);
      }
    }
    
    // Specific symbols check
    console.log('\n🎯 Symbols Check:');
    console.log('symbols field exists:', 'symbols' in data);
    console.log('symbols value:', data.symbols);
    console.log('symbols type:', typeof data.symbols);
    console.log('Is array:', Array.isArray(data.symbols));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testResponseFields();