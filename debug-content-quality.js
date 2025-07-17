const axios = require('axios');

async function debugContentQuality() {
  const response = await axios.post('http://localhost:3000/api/chat', {
    message: 'analyze AAPL',
    sessionId: 'debug-content'
  });
  
  const text = response.data.response;
  
  console.log('AAPL Analysis:');
  console.log(text);
  console.log('\nChecking for data points pattern:');
  console.log('Pattern: /\\d+%|\\d+B|\\d+M|\\d+k|\\d+\\.[0-9]B|tons|bps|YoY|QoQ/');
  
  const hasSpecificData = /\d+%|\d+B|\d+M|\d+k|\d+\.[0-9]B|tons|bps|YoY|QoQ/.test(text);
  console.log('Has specific data:', hasSpecificData);
  
  const matches = text.match(/\d+%|\d+B|\d+M|\d+k|\d+\.[0-9]B|tons|bps|YoY|QoQ/g);
  console.log('Matches found:', matches);
  
  console.log('\nText length:', text.length);
  console.log('Rich content (>500 chars):', text.length > 500);
}

debugContentQuality().catch(console.error);