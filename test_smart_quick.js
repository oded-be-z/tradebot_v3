// Quick test for SmartInsights temporal feature
const axios = require('axios');

async function quickTest() {
  console.log('🕐 Quick Temporal Test\n');
  
  const sessionId = 'quick-test-' + Date.now();
  
  // Query 1
  console.log('Query 1: AAPL price');
  const r1 = await axios.post('http://localhost:3000/api/chat', {
    message: 'AAPL price',
    sessionId: sessionId
  });
  console.log(`Response: "${r1.data.response.substring(0, 80)}..."`);
  
  // Wait 3 seconds
  console.log('\n⏰ Waiting 3 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Query 2
  console.log('Query 2: AAPL price');
  const r2 = await axios.post('http://localhost:3000/api/chat', {
    message: 'AAPL price',
    sessionId: sessionId
  });
  
  const response = r2.data.response;
  console.log(`Full Response:\n${response}\n`);
  
  // Check for temporal indicators
  const temporalIndicators = [
    /\d+\s*second/i,
    /\d+\s*minute/i, 
    /just/i,
    /update:/i,
    /since/i,
    /ago/i,
    /⏰/,
    /⚡/,
    /⏱️/
  ];
  
  const found = temporalIndicators.filter(pattern => pattern.test(response));
  console.log(`Temporal Indicators Found: ${found.length}/9`);
  
  if (found.length > 0) {
    console.log('✅ Temporal intelligence detected!');
    console.log('Patterns found:', found.map(p => p.toString()));
  } else {
    console.log('❌ No temporal intelligence detected');
  }
}

quickTest().catch(console.error);