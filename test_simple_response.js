const axios = require('axios');

async function testSimpleResponse() {
  console.log('🧪 Testing Enhanced Response Prompt Only\n');

  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'AAPL price',
      sessionId: 'test-simple-' + Date.now()
    });

    console.log('✅ Raw Response:');
    console.log(response.data.response);
    console.log('\n📊 Analysis:');
    
    // Check for enhanced prompt elements
    const hasEmojis = /[📊📈📉💰🎯⚠️🔍🔥💪👍😐😰🟢🟡🔴]/.test(response.data.response);
    const hasBold = /\*\*.*\*\*/.test(response.data.response);
    const hasBullets = /•/.test(response.data.response);
    const hasActionable = /Your Move|🎯|Want me to/.test(response.data.response);
    
    console.log(`- Contains emojis: ${hasEmojis ? '✅' : '❌'}`);
    console.log(`- Contains bold formatting: ${hasBold ? '✅' : '❌'}`);
    console.log(`- Contains bullet points: ${hasBullets ? '✅' : '❌'}`);
    console.log(`- Contains actionable items: ${hasActionable ? '✅' : '❌'}`);
    
    console.log('\n📝 Response length:', response.data.response.length, 'characters');
    console.log('📋 Suggestions:', JSON.stringify(response.data.suggestions));
    console.log('🚨 Show Chart:', response.data.showChart);
    
    const score = [hasEmojis, hasBold, hasBullets, hasActionable].filter(Boolean).length;
    console.log(`\n🏆 Enhancement Score: ${score}/4`);
    
    if (score >= 2) {
      console.log('✅ Enhanced prompts are working!');
    } else {
      console.log('❌ Enhanced prompts need adjustment');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSimpleResponse();