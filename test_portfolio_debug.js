const axios = require('axios');

async function debugPortfolioFlow() {
  console.log('🔍 Debugging Portfolio Flow\n');
  
  try {
    // Test with a simple portfolio query
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'show me my portfolio',
      sessionId: 'test-debug-' + Date.now()
    });
    
    console.log('Response type:', response.data.type);
    console.log('Response preview:', response.data.response.substring(0, 200));
    
    // Check if it mentions no portfolio
    if (response.data.response.includes('don\'t see') || response.data.response.includes('upload')) {
      console.log('\n✅ Correctly identifies no portfolio uploaded');
    }
    
    // Now test with a more specific portfolio query
    const response2 = await axios.post('http://localhost:3000/api/chat', {
      message: 'analyze my portfolio with AAPL, MSFT, GOOGL holdings',
      sessionId: 'test-debug2-' + Date.now()
    });
    
    console.log('\nResponse 2 type:', response2.data.type);
    console.log('Contains symbols:', /AAPL|MSFT|GOOGL/.test(response2.data.response));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugPortfolioFlow();