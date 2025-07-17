const axios = require('axios');

async function testDogecoin() {
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: "what's happening with dogecoin",
      sessionId: 'final-test'
    });
    
    const text = response.data.response;
    const hasActualZeroPrices = /\$0\.00(?![0-9])/.test(text);
    
    console.log('🧪 Dogecoin Micro-price Final Test\n');
    console.log('✅ Response generated');
    console.log('✅ Has emojis:', /[📊📈💡]/.test(text) ? '✅' : '❌');
    console.log('✅ Has bullets:', /•/.test(text) ? '✅' : '❌');
    console.log('✅ No actual $0.00:', !hasActualZeroPrices ? '✅' : '❌');
    console.log('✅ Has micro-prices:', /\$0\.000\d+/.test(text) ? '✅' : '❌');
    
    console.log('\nSample prices from response:');
    const prices = text.match(/\$0\.\d+/g);
    if (prices) {
      prices.forEach(p => console.log('  ', p));
    }
    
    console.log('\n📊 FINAL RESULT:', !hasActualZeroPrices ? '✅ PASS' : '❌ FAIL');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

testDogecoin();