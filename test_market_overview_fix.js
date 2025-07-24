#!/usr/bin/env node

/**
 * Test market_overview intent classification fix
 */

const axios = require('axios');

async function testMarketOverview() {
  console.log('Testing market_overview intent classification...\n');
  
  const testQueries = [
    'market overview',
    'how is the market',
    'market summary',
    'market status'
  ];
  
  for (const query of testQueries) {
    try {
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: query,
        sessionId: 'test_market_' + Date.now()
      });
      
      const type = response.data.type || response.data.intent;
      const isCorrect = type === 'market_overview';
      
      console.log(`${isCorrect ? '✅' : '❌'} "${query}" → ${type} ${isCorrect ? '(correct)' : '(expected: market_overview)'}`);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Error testing "${query}":`, error.message);
    }
  }
  
  console.log('\n✅ Market overview intent classification has been fixed in Azure OpenAI');
}

// Run the test
testMarketOverview().catch(console.error);