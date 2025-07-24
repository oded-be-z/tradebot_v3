const axios = require('axios');

async function testLiveInsights() {
  const sessionId = 'insights-test-' + Date.now();
  console.log('🔍 Testing Live Smart Insights\n');
  
  // Query 1: Initial AAPL query
  console.log('Query 1: AAPL price');
  let res = await axios.post('http://localhost:3000/api/chat', { 
    message: 'AAPL price', 
    sessionId 
  });
  console.log('Response:', res.data.response.substring(0, 200) + '...\n');
  
  // Wait 2 seconds then query again (should show time-based insight)
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Query 2: AAPL price (after 2 seconds)');
  res = await axios.post('http://localhost:3000/api/chat', { 
    message: 'AAPL price', 
    sessionId 
  });
  console.log('Response:', res.data.response.substring(0, 200) + '...\n');
  
  // Query 3: Expert query
  console.log('Query 3: What about AAPL RSI?');
  res = await axios.post('http://localhost:3000/api/chat', { 
    message: 'What about AAPL RSI?', 
    sessionId 
  });
  console.log('Response:', res.data.response.substring(0, 200) + '...\n');
}

testLiveInsights().catch(console.error);
