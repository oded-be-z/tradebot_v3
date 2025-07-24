const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testPortfolioFinal() {
  console.log('🧪 Testing Complete Portfolio LLM-First Implementation\n');
  
  const sessionId = 'portfolio-final-' + Date.now();
  
  try {
    // Step 1: Create a more realistic portfolio CSV
    const portfolioCSV = `Symbol,Shares,Purchase Price
AAPL,150,120
MSFT,80,250
GOOGL,20,2200
NVDA,50,350
TSLA,40,700
AMZN,30,2800
META,60,280
SPY,100,380
QQQ,75,340
ARKK,200,45`;
    
    fs.writeFileSync('test-portfolio-final.csv', portfolioCSV);
    console.log('✅ Created test portfolio CSV with 10 holdings');
    
    // Step 2: Upload the portfolio
    const form = new FormData();
    form.append('file', fs.createReadStream('test-portfolio-final.csv'));
    form.append('sessionId', sessionId);
    
    console.log('📤 Uploading portfolio...');
    const uploadResponse = await axios.post('http://localhost:3000/api/portfolio/upload', form, {
      headers: form.getHeaders()
    });
    
    console.log('✅ Portfolio uploaded successfully');
    console.log('Response:', uploadResponse.data.message.substring(0, 100) + '...');
    
    // Step 3: Wait to ensure session is fully updated
    console.log('⏳ Waiting for session update...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 4: Test different portfolio queries
    const testQueries = [
      'analyze my portfolio and identify the top 3 risks with specific percentages',
      'what are my portfolio holdings and which ones should I rebalance?',
      'give me 3 specific actions to improve my portfolio with exact share counts'
    ];
    
    for (const query of testQueries) {
      console.log(`\n📊 Testing: "${query}"\n`);
      
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: query,
        sessionId: sessionId
      });
      
      console.log('Type:', response.data.type);
      console.log('Response length:', response.data.response.length);
      
      // Extract and analyze the response
      const text = response.data.response;
      
      // Look for specific patterns
      const hasSpecificShares = /\d+ shares/.test(text);
      const hasDollarAmounts = /\$[\d,]+/.test(text);
      const hasPercentages = /\d+%/.test(text);
      const hasBuySell = /Buy|Sell|buy|sell|reduce|increase/i.test(text);
      const hasSymbols = /AAPL|MSFT|GOOGL|NVDA|TSLA|AMZN|META|SPY|QQQ|ARKK/.test(text);
      
      console.log('\nValidation:');
      console.log('- Has portfolio symbols:', hasSymbols);
      console.log('- Has specific shares:', hasSpecificShares);
      console.log('- Has dollar amounts:', hasDollarAmounts);
      console.log('- Has percentages:', hasPercentages);
      console.log('- Has actions:', hasBuySell);
      
      // Show specific matches
      const shareMatches = text.match(/\d+ shares/g);
      const symbolMatches = text.match(/AAPL|MSFT|GOOGL|NVDA|TSLA|AMZN|META|SPY|QQQ|ARKK/g);
      
      if (shareMatches) {
        console.log('- Share references:', shareMatches.slice(0, 3).join(', '));
      }
      if (symbolMatches) {
        console.log('- Symbols mentioned:', [...new Set(symbolMatches)].join(', '));
      }
      
      // Show response preview
      console.log('\nResponse preview:');
      console.log(text.substring(0, 400) + '...');
      
      // Success check
      if (hasSymbols && hasSpecificShares && hasDollarAmounts && hasPercentages) {
        console.log('\n✅ SUCCESS: Portfolio analysis is working with specific recommendations!');
      } else {
        console.log('\n⚠️  Some elements missing from response');
      }
    }
    
    // Cleanup
    fs.unlinkSync('test-portfolio-final.csv');
    console.log('\n🎉 Test complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testPortfolioFinal();