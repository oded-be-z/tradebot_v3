// Debug temporal intelligence specifically
const axios = require('axios');

async function debugTemporal() {
  console.log('🕐 DEBUGGING TEMPORAL INTELLIGENCE\n');
  
  const sessionId = 'temporal-debug-' + Date.now();
  
  console.log('1️⃣ First AAPL query - establishing baseline...');
  
  const response1 = await axios.post('http://localhost:3000/api/chat', {
    message: 'AAPL price',
    sessionId: sessionId
  });
  
  console.log(`   Response: "${response1.data.response.substring(0, 100)}..."`);
  console.log('   Context should now store AAPL with timestamp\n');
  
  console.log('⏰ Waiting 5 seconds for time difference...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('2️⃣ Second AAPL query - should show time-based insight...');
  
  const response2 = await axios.post('http://localhost:3000/api/chat', {
    message: 'AAPL price again',
    sessionId: sessionId
  });
  
  console.log(`   Response: "${response2.data.response.substring(0, 150)}..."`);
  
  // Check for temporal indicators
  const hasTimeRef = /update|since|ago|minutes?|just|recently/i.test(response2.data.response);
  const hasTimeNumbers = /\d+\s*(second|minute|hour)/i.test(response2.data.response);
  
  console.log('\n🔍 Analysis:');
  console.log(`   Time Reference Found: ${hasTimeRef ? '✅' : '❌'}`);
  console.log(`   Specific Time Mentioned: ${hasTimeNumbers ? '✅' : '❌'}`);
  
  if (!hasTimeRef) {
    console.log('\n❌ Temporal intelligence not working');
    console.log('🔧 Possible issues:');
    console.log('   • Context not storing lastAskedTime properly');
    console.log('   • SmartInsights not receiving context data');
    console.log('   • Time calculation logic error');
    console.log('   • Price comparison data missing');
  } else {
    console.log('\n✅ Temporal intelligence working!');
  }
}

debugTemporal().catch(console.error);