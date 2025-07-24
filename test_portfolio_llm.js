const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:3000/api/chat';
const SESSION_URL = 'http://localhost:3000/api/session/init';
const PORTFOLIO_URL = 'http://localhost:3000/api/portfolio/upload';

async function testPortfolioAnalysis() {
  console.log('🧪 Testing LLM-First Portfolio Analysis\n');
  
  try {
    // Create session
    const sessionResp = await axios.post(SESSION_URL);
    const sessionId = sessionResp.data.sessionId;
    console.log(`Session created: ${sessionId}\n`);
    
    // Create a sample portfolio CSV
    const portfolioCSV = `Symbol,Shares,Purchase Price
MSFT,25,280.50
AAPL,50,145.20
TSLA,15,185.75
NVDA,10,450.00
AMZN,20,125.50
SPY,30,400.00
BTC,0.5,35000
ETH,2,2200
VTI,15,200.00
GOOGL,8,135.00`;
    
    // Save CSV temporarily
    fs.writeFileSync('test_portfolio.csv', portfolioCSV);
    
    console.log('📁 Created test portfolio with 10 holdings\n');
    
    // Upload portfolio
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream('test_portfolio.csv'));
    form.append('sessionId', sessionId);
    
    console.log('📤 Uploading portfolio...\n');
    
    const uploadResp = await axios.post(PORTFOLIO_URL, form, {
      headers: {
        ...form.getHeaders(),
        'X-Session-Id': sessionId
      }
    });
    
    if (uploadResp.data.success) {
      console.log('✅ Portfolio uploaded successfully\n');
      
      // The upload endpoint should return the auto-analysis
      if (uploadResp.data.analysis) {
        console.log('📊 Auto-Analysis Generated:\n');
        console.log('Response:', uploadResp.data.analysis.response.substring(0, 200) + '...\n');
      }
      
      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test portfolio query
      console.log('🔍 Testing portfolio query: "analyze my portfolio risks"\n');
      
      const chatResp = await axios.post(API_URL, {
        message: "analyze my portfolio risks and give me specific rebalancing actions",
        sessionId: sessionId
      });
      
      const response = chatResp.data;
      
      console.log('📈 LLM-First Portfolio Analysis Response:\n');
      console.log('Type:', response.type);
      console.log('Has Chart:', !!response.chartData);
      console.log('\nResponse Preview:');
      console.log(response.response.substring(0, 500) + '...\n');
      
      // Validate response structure
      const hasSpecificNumbers = /\d+\s*shares/.test(response.response);
      const hasPercentages = /\d+(\.\d+)?%/.test(response.response);
      const hasDollarAmounts = /\$[\d,]+/.test(response.response);
      const hasActionWords = /(sell|buy|reduce|increase)/i.test(response.response);
      
      console.log('✓ Validation Results:');
      console.log(`  - Contains specific share numbers: ${hasSpecificNumbers ? '✅' : '❌'}`);
      console.log(`  - Contains percentages: ${hasPercentages ? '✅' : '❌'}`);
      console.log(`  - Contains dollar amounts: ${hasDollarAmounts ? '✅' : '❌'}`);
      console.log(`  - Contains action words (buy/sell): ${hasActionWords ? '✅' : '❌'}`);
      
      // Check for generic phrases we want to avoid
      const genericPhrases = [
        'consider diversification',
        'monitor your portfolio',
        'rebalancing might be good',
        'keep an eye on'
      ];
      
      const hasGenericAdvice = genericPhrases.some(phrase => 
        response.response.toLowerCase().includes(phrase)
      );
      
      console.log(`  - Avoids generic advice: ${!hasGenericAdvice ? '✅' : '❌'}`);
      
      // Expected LLM-first structure
      console.log('\n📋 Expected LLM-First Response Structure:');
      console.log('✓ Perplexity analyzes portfolio for risks and opportunities');
      console.log('✓ Azure OpenAI synthesizes SPECIFIC actions with exact numbers');
      console.log('✓ Response includes:');
      console.log('  - Portfolio summary with total value and return %');
      console.log('  - Top 3 risks with specific numbers');
      console.log('  - 3 specific actions (e.g., "Sell 5 MSFT shares")');
      console.log('  - Allocation pie chart');
      console.log('  - Performance bar chart');
      
      // Save full response for debugging
      fs.writeFileSync('test_portfolio_response.json', JSON.stringify(response, null, 2));
      console.log('\n💾 Full response saved to test_portfolio_response.json');
      
    } else {
      console.log('❌ Portfolio upload failed:', uploadResp.data.error);
    }
    
    // Clean up
    fs.unlinkSync('test_portfolio.csv');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Server is not running!');
      console.log('Please start the server with: npm start');
    }
  }
}

// Run the test
testPortfolioAnalysis().catch(console.error);