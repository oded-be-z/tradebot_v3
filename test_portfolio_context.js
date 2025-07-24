const axios = require('axios');
async function testPortfolioContext() {
  console.log('🧪 Testing Portfolio Context\n');
  
  // First upload a test portfolio
  // Then test if context includes portfolio
  const response = await axios.post('http://localhost:3000/api/chat', {
    message: 'analyze my portfolio risks',
    sessionId: 'test-portfolio-context'
  });
  
  console.log('Response type:', response.data.type);
  console.log('Has portfolio in metadata:', response.data.metadata?.hasPortfolio);
}
testPortfolioContext();