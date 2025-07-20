const axios = require('axios');
const logger = require('./utils/logger');

const API_URL = 'http://localhost:3000/api/chat';

async function testGreeting(greeting) {
  try {
    console.log(`\n🧪 Testing greeting: "${greeting}"`);
    
    const response = await axios.post(API_URL, {
      message: greeting,
      sessionId: `test-greeting-${Date.now()}`
    });
    
    const data = response.data;
    const responseText = data.response;
    const responseType = data.type;
    
    // Check if it's a greeting response
    const isGreetingResponse = responseText.includes("Hey there! I'm Max");
    const hasDisclaimer = responseText.includes("I'm a financial assistant - let's talk about markets!");
    
    console.log(`Response type: ${responseType}`);
    console.log(`Is greeting response: ${isGreetingResponse}`);
    console.log(`Has disclaimer: ${hasDisclaimer}`);
    console.log(`Response preview: ${responseText.substring(0, 100)}...`);
    
    if (isGreetingResponse && !hasDisclaimer) {
      console.log('✅ PASS: Greeting handled correctly');
      return true;
    } else if (hasDisclaimer) {
      console.log('❌ FAIL: Got disclaimer instead of greeting');
      return false;
    } else {
      console.log('❌ FAIL: Unexpected response');
      return false;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return false;
  }
}

async function testComparison(query) {
  try {
    console.log(`\n🧪 Testing comparison: "${query}"`);
    
    const response = await axios.post(API_URL, {
      message: query,
      sessionId: `test-comparison-${Date.now()}`
    });
    
    const data = response.data;
    const responseText = data.response || JSON.stringify(data);
    
    // Check for proper comparison format
    const hasCurrentPrices = responseText.includes('Current Prices:');
    const hasPerformance = responseText.includes('Performance (24h):');
    const hasMarketAnalysis = responseText.includes('Market Analysis:');
    const hasProperFormat = responseText.includes(' vs ') && responseText.includes('Comparison');
    
    console.log(`Has Current Prices section: ${hasCurrentPrices}`);
    console.log(`Has Performance section: ${hasPerformance}`);
    console.log(`Has Market Analysis section: ${hasMarketAnalysis}`);
    console.log(`Has proper format: ${hasProperFormat}`);
    
    if (hasCurrentPrices && hasPerformance && hasMarketAnalysis && hasProperFormat) {
      console.log('✅ PASS: Comparison formatted correctly');
      return true;
    } else {
      console.log('❌ FAIL: Comparison format incomplete');
      console.log('\nResponse preview:');
      console.log(responseText.substring(0, 300) + '...');
      return false;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing Greeting Detection and Comparison Formatting\n');
  
  // Test various greetings
  const greetings = [
    'hi',
    'hello',
    'hey',
    'hi!',
    'hello!',
    'good morning',
    'good afternoon',
    'hey there',
    'howdy',
    'yo'
  ];
  
  let greetingsPassed = 0;
  let greetingsFailed = 0;
  
  console.log('=== GREETING TESTS ===');
  for (const greeting of greetings) {
    const passed = await testGreeting(greeting);
    if (passed) greetingsPassed++;
    else greetingsFailed++;
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test comparisons
  const comparisons = [
    'compare GC vs SI',
    'Gold vs Silver',
    'AAPL vs MSFT',
    'compare Bitcoin and Ethereum'
  ];
  
  let comparisonsPassed = 0;
  let comparisonsFailed = 0;
  
  console.log('\n\n=== COMPARISON TESTS ===');
  for (const comparison of comparisons) {
    const passed = await testComparison(comparison);
    if (passed) comparisonsPassed++;
    else comparisonsFailed++;
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n\n📊 Test Summary:');
  console.log('================');
  console.log(`Greetings: ${greetingsPassed} passed, ${greetingsFailed} failed`);
  console.log(`Comparisons: ${comparisonsPassed} passed, ${comparisonsFailed} failed`);
  console.log(`\nTotal: ${greetingsPassed + comparisonsPassed} passed, ${greetingsFailed + comparisonsFailed} failed`);
  
  // Debug tips
  if (greetingsFailed > 0) {
    console.log('\n⚠️  Greeting Detection Issues:');
    console.log('1. Check that azureOpenAI.js has greeting detection rules');
    console.log('2. Verify intelligentResponse.js has greeting handler');
    console.log('3. Check server logs for LLM analysis results');
    console.log('4. Ensure greetings are marked as isFinancial: true');
  }
  
  if (comparisonsFailed > 0) {
    console.log('\n⚠️  Comparison Formatting Issues:');
    console.log('1. Check generateComparisonAnalysis() method');
    console.log('2. Verify NumberFormatter is working correctly');
    console.log('3. Check that asset info is being retrieved');
  }
}

// Run tests
runTests().catch(console.error);