const axios = require('axios');

async function testPortfolioComplete() {
  console.log('🧪 Testing Complete Portfolio LLM-First Implementation\n');
  
  // Note: Assumes portfolio is already uploaded in session
  const sessionId = 'portfolio-llm-test-' + Date.now();
  
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'analyze my portfolio and provide specific rebalancing recommendations',
      sessionId: sessionId
    });
    
    console.log('✅ Response received');
    console.log('Type:', response.data.type);
    console.log('Has Chart:', !!response.data.chartData);
    console.log('\n📊 Analysis Preview:');
    console.log(response.data.response.substring(0, 500) + '...\n');
    
    // Validation checks
    const text = response.data.response;
    const hasSpecificShares = /\d+ shares/.test(text);
    const hasDollarAmounts = /\$[\d,]+/.test(text);
    const hasPercentages = /\d+%/.test(text);
    const hasBuySell = /Buy|Sell/i.test(text);
    
    console.log('✅ Validation Results:');
    console.log('- Has specific share counts:', hasSpecificShares);
    console.log('- Has dollar amounts:', hasDollarAmounts);
    console.log('- Has percentages:', hasPercentages);
    console.log('- Has buy/sell actions:', hasBuySell);
    
    if (hasSpecificShares && hasDollarAmounts && hasPercentages && hasBuySell) {
      console.log('\n🎉 SUCCESS: Portfolio analysis is providing specific, actionable recommendations!');
    } else {
      console.log('\n⚠️  WARNING: Response missing some specific elements');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPortfolioComplete();