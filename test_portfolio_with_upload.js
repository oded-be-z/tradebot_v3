const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testPortfolioWithUpload() {
  console.log('🧪 Testing Complete Portfolio LLM-First Implementation with Upload\n');
  
  const sessionId = 'portfolio-llm-test-' + Date.now();
  
  try {
    // Step 1: Create a test portfolio CSV
    const portfolioCSV = `Symbol,Shares,Purchase Price
AAPL,50,150
MSFT,30,300
GOOGL,10,2500
NVDA,25,400
TSLA,20,800
AMZN,15,3000`;
    
    fs.writeFileSync('test-portfolio-llm.csv', portfolioCSV);
    console.log('✅ Created test portfolio CSV');
    
    // Step 2: Upload the portfolio
    const form = new FormData();
    form.append('file', fs.createReadStream('test-portfolio-llm.csv'));
    form.append('sessionId', sessionId);
    
    const uploadResponse = await axios.post('http://localhost:3000/api/portfolio/upload', form, {
      headers: form.getHeaders()
    });
    
    console.log('✅ Portfolio uploaded:', uploadResponse.data.message);
    console.log('Upload response keys:', Object.keys(uploadResponse.data));
    if (uploadResponse.data.portfolio) {
      console.log('Holdings:', uploadResponse.data.portfolio.length);
    } else if (uploadResponse.data.summary && uploadResponse.data.summary.totalHoldings) {
      console.log('Holdings:', uploadResponse.data.summary.totalHoldings);
    }
    
    // Step 3: Test portfolio analysis
    console.log('\n📊 Testing portfolio analysis...\n');
    
    // Wait a bit to ensure session is updated
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'analyze my portfolio holdings with risk assessment and provide 3 specific rebalancing actions',
      sessionId: sessionId
    });
    
    console.log('✅ Response received');
    console.log('Type:', response.data.type);
    console.log('Has Chart:', !!response.data.chartData);
    console.log('\n📊 Analysis Preview:');
    console.log(response.data.response.substring(0, 800) + '...\n');
    
    // Validation checks
    const text = response.data.response;
    const hasSpecificShares = /\d+ shares/.test(text);
    const hasDollarAmounts = /\$[\d,]+/.test(text);
    const hasPercentages = /\d+%/.test(text);
    const hasBuySell = /Buy|Sell/i.test(text);
    const hasRisks = /risk|Risk/i.test(text);
    const hasActions = /action|Action/i.test(text);
    
    console.log('✅ Validation Results:');
    console.log('- Has specific share counts:', hasSpecificShares);
    console.log('- Has dollar amounts:', hasDollarAmounts);
    console.log('- Has percentages:', hasPercentages);
    console.log('- Has buy/sell actions:', hasBuySell);
    console.log('- Has risk analysis:', hasRisks);
    console.log('- Has action items:', hasActions);
    
    // Check for specific patterns
    const shareMatches = text.match(/\d+ shares/g);
    const dollarMatches = text.match(/\$[\d,]+/g);
    
    console.log('\n📈 Specific Matches Found:');
    console.log('- Share references:', shareMatches ? shareMatches.slice(0, 5) : 'None');
    console.log('- Dollar amounts:', dollarMatches ? dollarMatches.slice(0, 5) : 'None');
    
    if (hasSpecificShares && hasDollarAmounts && hasPercentages && hasBuySell) {
      console.log('\n🎉 SUCCESS: Portfolio analysis is providing specific, actionable recommendations!');
    } else {
      console.log('\n⚠️  WARNING: Response missing some specific elements');
    }
    
    // Cleanup
    fs.unlinkSync('test-portfolio-llm.csv');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testPortfolioWithUpload();