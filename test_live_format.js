// Test format enforcement on live response
const axios = require('axios');
const DualLLMOrchestrator = require('./services/dualLLMOrchestrator');

async function testLiveFormat() {
  console.log('🧪 Testing Live Format Enforcement\n');
  
  try {
    // Get a live response first
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'AAPL price',
      sessionId: 'format-test-' + Date.now()
    });
    
    const originalResponse = response.data.response;
    console.log('📥 Original Response:');
    console.log(originalResponse);
    
    // Now apply format enforcement manually
    const testUnderstanding = {
      intent: 'price_query',
      symbols: ['AAPL']
    };
    
    console.log('\n🔧 Applying Format Enforcement...');
    const formatted = DualLLMOrchestrator.enforceResponseFormat(originalResponse, testUnderstanding);
    
    console.log('\n📤 Formatted Response:');
    console.log(formatted);
    
    // Check improvements
    const originalHasEmojis = /[📊📈📉💰🎯⚠️🔍🔥]/.test(originalResponse);
    const formattedHasEmojis = /[📊📈📉💰🎯⚠️🔍🔥]/.test(formatted);
    
    const originalHasBold = /\*\*.*\*\*/.test(originalResponse);
    const formattedHasBold = /\*\*.*\*\*/.test(formatted);
    
    const originalHasWantMeTo = /want me to/i.test(originalResponse);
    const formattedHasWantMeTo = /want me to/i.test(formatted);
    
    console.log('\n📊 Comparison:');
    console.log(`Emojis: ${originalHasEmojis ? '✅' : '❌'} -> ${formattedHasEmojis ? '✅' : '❌'}`);
    console.log(`Bold: ${originalHasBold ? '✅' : '❌'} -> ${formattedHasBold ? '✅' : '❌'}`);
    console.log(`Want me to: ${originalHasWantMeTo ? '✅' : '❌'} -> ${formattedHasWantMeTo ? '✅' : '❌'}`);
    
    const improvement = [
      !originalHasEmojis && formattedHasEmojis,
      !originalHasBold && formattedHasBold,
      !originalHasWantMeTo && formattedHasWantMeTo
    ].filter(Boolean).length;
    
    console.log(`\n🎯 Improvements: ${improvement}/3`);
    
    if (improvement >= 2) {
      console.log('✅ Format enforcement working correctly!');
      console.log('❗ Issue: Format enforcement not being called in live system');
    } else {
      console.log('❌ Format enforcement logic needs fixing');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLiveFormat();