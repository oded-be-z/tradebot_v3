// Debug format enforcement integration with detailed tracing
const axios = require('axios');

async function debugFormatEnforcement() {
  console.log('🔍 DEBUGGING FORMAT ENFORCEMENT INTEGRATION\n');
  
  const sessionId = 'debug-format-' + Date.now();
  
  console.log('🧪 Test Query: "AAPL price"');
  console.log('📊 Checking server logs for middleware execution...\n');
  
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'AAPL price',
      sessionId: sessionId
    });
    
    const responseText = response.data.response;
    const symbols = response.data.symbols || [];
    
    console.log('📥 Raw Response Received:');
    console.log(`   Length: ${responseText.length} characters`);
    console.log(`   Symbols: [${symbols.join(', ')}]`);
    console.log(`   Preview: "${responseText.substring(0, 120)}..."\n`);
    
    // Check format compliance
    const formatTests = {
      hasEmojis: /[📊📈📉💰🎯⚠️🔍🔥]/.test(responseText),
      hasBold: /\*\*.*\*\*/.test(responseText),
      hasWantMeTo: /want me to/i.test(responseText),
      hasBullets: /•/.test(responseText)
    };
    
    const formatScore = Object.values(formatTests).filter(Boolean).length;
    
    console.log('📋 Format Analysis:');
    console.log(`   Emojis: ${formatTests.hasEmojis ? '✅' : '❌'}`);
    console.log(`   Bold Text: ${formatTests.hasBold ? '✅' : '❌'}`);
    console.log(`   Want me to: ${formatTests.hasWantMeTo ? '✅' : '❌'}`);
    console.log(`   Bullets: ${formatTests.hasBullets ? '✅' : '❌'}`);
    console.log(`   Score: ${formatScore}/4\n`);
    
    // Test direct format enforcement to confirm it works
    console.log('🔧 Testing Direct Format Enforcement...');
    
    const DualLLMOrchestrator = require('./services/dualLLMOrchestrator');
    const testUnderstanding = {
      intent: 'price_query',
      symbols: ['AAPL']
    };
    
    const directlyFormatted = DualLLMOrchestrator.enforceResponseFormat(responseText, testUnderstanding);
    
    const directFormatTests = {
      hasEmojis: /[📊📈📉💰🎯⚠️🔍🔥]/.test(directlyFormatted),
      hasBold: /\*\*.*\*\*/.test(directlyFormatted),
      hasWantMeTo: /want me to/i.test(directlyFormatted),
      hasBullets: /•/.test(directlyFormatted)
    };
    
    const directFormatScore = Object.values(directFormatTests).filter(Boolean).length;
    
    console.log('📤 Direct Format Enforcement Results:');
    console.log(`   Emojis: ${directFormatTests.hasEmojis ? '✅' : '❌'}`);
    console.log(`   Bold Text: ${directFormatTests.hasBold ? '✅' : '❌'}`);
    console.log(`   Want me to: ${directFormatTests.hasWantMeTo ? '✅' : '❌'}`);
    console.log(`   Bullets: ${directFormatTests.hasBullets ? '✅' : '❌'}`);
    console.log(`   Score: ${directFormatScore}/4\n`);
    
    console.log('📝 Direct Format Preview:');
    console.log(`   "${directlyFormatted.substring(0, 150)}..."\n`);
    
    // Analysis
    console.log('🎯 INTEGRATION ANALYSIS\n');
    
    if (formatScore >= 3) {
      console.log('✅ Format enforcement IS working in live system!');
      console.log('   The middleware is successfully applying formatting');
    } else if (directFormatScore >= 3) {
      console.log('❌ Format enforcement MIDDLEWARE NOT WORKING');
      console.log('   • Direct enforcement works perfectly');
      console.log('   • Middleware not being triggered or not applying changes');
      console.log('   • Check server.js middleware placement and conditions');
    } else {
      console.log('❌ Format enforcement LOGIC BROKEN');
      console.log('   • Direct enforcement also failing');
      console.log('   • Need to fix enforceResponseFormat() method');
    }
    
    // Check if middleware logs appear
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Check server console for "[FORMAT-MIDDLEWARE]" log messages');
    console.log('2. Verify middleware conditions are met (response.response is string)');
    console.log('3. Confirm dualLLMOrchestrator.enforceResponseFormat is accessible');
    console.log('4. Test with different query types to isolate the issue');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  }
}

debugFormatEnforcement();