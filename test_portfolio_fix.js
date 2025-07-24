/**
 * Test Portfolio Formatting Fix
 * Verifies that portfolio responses have properly formatted symbols
 */

const axios = require('axios');
const FormData = require('form-data');
const { FormatMonitor } = require('./monitoring/FormatMonitor');

async function testPortfolioFormatting() {
  console.log('🧪 Testing Portfolio Formatting Fix\n');
  console.log('=' .repeat(60));
  
  const sessionId = 'portfolio-fix-test-' + Date.now();
  
  // Test 1: Portfolio without upload (should handle gracefully)
  console.log('\nTest 1: Analyze portfolio without upload');
  console.log('-'.repeat(40));
  
  try {
    const response1 = await axios.post('http://localhost:3000/api/chat', {
      message: 'analyze my portfolio',
      sessionId
    });
    
    const text1 = response1.data.response;
    console.log('Response:', text1);
    
    const score1 = FormatMonitor.calculateFormatScore(text1);
    console.log(`\nFormat Score: ${score1}/100`);
    console.log('✓ Has Emoji:', /[📊📈📉💰🎯⚠️🔍🔥⚔️]/.test(text1) ? '✅' : '❌');
    console.log('✓ Has Bold:', /\*\*[A-Z]{1,5}\*\*/.test(text1) ? '✅' : '❌');
    console.log('✓ Has Action:', /want me to/i.test(text1) ? '✅' : '❌');
    
  } catch (error) {
    console.error('Error:', error.response?.data?.error || error.message);
  }
  
  // Test 2: Upload portfolio and analyze
  console.log('\n\nTest 2: Upload portfolio with common stocks');
  console.log('-'.repeat(40));
  
  try {
    // Create portfolio CSV
    const csvContent = `symbol,shares,purchase_price
AAPL,100,150.00
MSFT,50,300.00
GOOGL,20,2500.00
TSLA,25,200.00
NVDA,30,400.00
SPY,40,380.00
META,15,250.00
AMZN,10,3000.00`;
    
    // Upload portfolio
    const formData = new FormData();
    formData.append('file', Buffer.from(csvContent), {
      filename: 'test_portfolio.csv',
      contentType: 'text/csv'
    });
    formData.append('sessionId', sessionId);
    
    console.log('Uploading portfolio...');
    const uploadResponse = await axios.post('http://localhost:3000/api/portfolio/upload', formData, {
      headers: formData.getHeaders()
    });
    
    console.log('Upload response:', uploadResponse.data.message);
    
    // Wait a moment for processing
    await new Promise(r => setTimeout(r, 1000));
    
    // Now analyze the portfolio
    console.log('\nAnalyzing portfolio...');
    const response2 = await axios.post('http://localhost:3000/api/chat', {
      message: 'analyze my portfolio',
      sessionId
    });
    
    const text2 = response2.data.response;
    console.log('\nResponse:', text2);
    
    // Detailed analysis
    const score2 = FormatMonitor.calculateFormatScore(text2);
    console.log(`\nFormat Score: ${score2}/100`);
    
    // Check each requirement
    const hasEmoji = /[📊📈📉💰🎯⚠️🔍🔥⚔️]/.test(text2);
    const hasBold = /\*\*[A-Z]{1,5}\*\*/.test(text2);
    const hasAction = /want me to/i.test(text2);
    const hasStructure = text2.includes('•') || text2.includes('\n');
    
    console.log('✓ Has Emoji:', hasEmoji ? '✅' : '❌');
    console.log('✓ Has Bold:', hasBold ? '✅' : '❌');
    console.log('✓ Has Action:', hasAction ? '✅' : '❌');
    console.log('✓ Has Structure:', hasStructure ? '✅' : '❌');
    
    // Check for specific symbols being bold
    console.log('\nSymbol Formatting Check:');
    const symbolsToCheck = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'SPY', 'META', 'AMZN'];
    let allSymbolsBold = true;
    
    symbolsToCheck.forEach(symbol => {
      const isBold = text2.includes(`**${symbol}**`);
      console.log(`  ${symbol}: ${isBold ? '✅ Bold' : '❌ Not bold'}`);
      if (!isBold && text2.includes(symbol)) {
        allSymbolsBold = false;
      }
    });
    
    // Check for risk indicators
    const hasRiskIndicators = text2.includes('🟢') || text2.includes('🟡') || text2.includes('🔴');
    console.log('\n✓ Has Risk Indicators:', hasRiskIndicators ? '✅' : '❌');
    
    // Final verdict
    console.log('\n' + '=' .repeat(60));
    console.log('📊 PORTFOLIO FIX VERIFICATION');
    console.log('=' .repeat(60));
    
    if (score2 === 100 && allSymbolsBold) {
      console.log('✅ SUCCESS: Portfolio formatting is working perfectly!');
      console.log('All symbols are bold, format score is 100/100');
    } else if (score2 >= 75) {
      console.log('⚠️ PARTIAL SUCCESS: Portfolio formatting improved but needs work');
      console.log(`Format score: ${score2}/100`);
      if (!allSymbolsBold) {
        console.log('Issue: Not all symbols are bold');
      }
    } else {
      console.log('❌ FAILED: Portfolio formatting still broken');
      console.log(`Format score: ${score2}/100`);
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data?.error || error.message);
  }
  
  // Test 3: Portfolio with specific action request
  console.log('\n\nTest 3: Portfolio with specific request');
  console.log('-'.repeat(40));
  
  try {
    const response3 = await axios.post('http://localhost:3000/api/chat', {
      message: 'which stocks in my portfolio are risky?',
      sessionId
    });
    
    const text3 = response3.data.response;
    console.log('Response:', text3.substring(0, 300) + '...');
    
    const score3 = FormatMonitor.calculateFormatScore(text3);
    console.log(`\nFormat Score: ${score3}/100`);
    
    // Check if portfolio symbols are mentioned and bold
    const mentionedSymbols = [];
    ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'].forEach(symbol => {
      if (text3.includes(symbol)) {
        mentionedSymbols.push({
          symbol,
          isBold: text3.includes(`**${symbol}**`)
        });
      }
    });
    
    console.log('\nMentioned symbols:');
    mentionedSymbols.forEach(s => {
      console.log(`  ${s.symbol}: ${s.isBold ? '✅ Bold' : '❌ Not bold'}`);
    });
    
  } catch (error) {
    console.error('Error:', error.response?.data?.error || error.message);
  }
  
  // Test 4: Mixed portfolio and market query
  console.log('\n\nTest 4: Mixed portfolio and market context');
  console.log('-'.repeat(40));
  
  try {
    const response4 = await axios.post('http://localhost:3000/api/chat', {
      message: 'compare my AAPL holdings to the market',
      sessionId
    });
    
    const text4 = response4.data.response;
    console.log('Response:', text4.substring(0, 300) + '...');
    
    const score4 = FormatMonitor.calculateFormatScore(text4);
    console.log(`\nFormat Score: ${score4}/100`);
    
    // Should have both portfolio context and market comparison
    const hasPortfolioContext = text4.includes('holding') || text4.includes('portfolio') || text4.includes('shares');
    const hasComparison = text4.includes('vs') || text4.includes('compared') || text4.includes('versus');
    
    console.log('✓ Has Portfolio Context:', hasPortfolioContext ? '✅' : '❌');
    console.log('✓ Has Comparison:', hasComparison ? '✅' : '❌');
    console.log('✓ AAPL is Bold:', text4.includes('**AAPL**') ? '✅' : '❌');
    
  } catch (error) {
    console.error('Error:', error.response?.data?.error || error.message);
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Portfolio formatting test complete!');
  console.log('Review the results above to verify the fix is working.');
}

// Run the test
testPortfolioFormatting().catch(console.error);