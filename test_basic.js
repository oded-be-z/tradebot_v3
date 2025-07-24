const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function runBasicTest() {
  console.log("🧪 Running Basic FinanceBot Tests...\n");
  
  try {
    // 1. Create session
    console.log("1️⃣ Creating session...");
    const sessionResponse = await axios.post(`${BASE_URL}/api/session/init`);
    const sessionId = sessionResponse.data.sessionId;
    console.log(`✅ Session created: ${sessionId}\n`);
    
    // 2. Test greeting
    console.log("2️⃣ Testing greeting...");
    const greetingResponse = await axios.post(`${BASE_URL}/api/chat`, {
      message: "hi",
      sessionId: sessionId
    });
    console.log(`Response: "${greetingResponse.data.response}"`);
    
    // Check for banned phrases
    const bannedPhrases = ['let me know', 'feel free', "i'm here to"];
    const responseText = greetingResponse.data.response.toLowerCase();
    const foundBanned = bannedPhrases.filter(phrase => responseText.includes(phrase));
    
    if (foundBanned.length > 0) {
      console.log(`❌ FAILED: Found banned phrases: ${foundBanned.join(', ')}`);
    } else {
      console.log(`✅ PASSED: No banned phrases found`);
    }
    console.log(`Response length: ${greetingResponse.data.response.length} chars\n`);
    
    // 3. Test price query
    console.log("3️⃣ Testing price query...");
    const priceResponse = await axios.post(`${BASE_URL}/api/chat`, {
      message: "what's apple's price?",
      sessionId: sessionId
    });
    console.log(`Response: "${priceResponse.data.response}"`);
    
    if (priceResponse.data.response.includes('$')) {
      console.log(`✅ PASSED: Price information provided`);
    } else {
      console.log(`❌ FAILED: No price found in response`);
    }
    console.log(`Response length: ${priceResponse.data.response.length} chars\n`);
    
    // 4. Test context retention
    console.log("4️⃣ Testing context retention...");
    const contextResponse = await axios.post(`${BASE_URL}/api/chat`, {
      message: "what about the trend?",
      sessionId: sessionId
    });
    console.log(`Response: "${contextResponse.data.response}"`);
    
    if (contextResponse.data.response.toLowerCase().includes('aapl') || 
        contextResponse.data.response.toLowerCase().includes('apple')) {
      console.log(`✅ PASSED: Context maintained (references Apple)`);
    } else {
      console.log(`❌ FAILED: Context lost`);
    }
    
    if (contextResponse.data.chartData) {
      console.log(`✅ PASSED: Chart data provided`);
    } else {
      console.log(`⚠️ WARNING: No chart data`);
    }
    console.log(`Response length: ${contextResponse.data.response.length} chars\n`);
    
    // 5. Test comparison
    console.log("5️⃣ Testing comparison...");
    const comparisonResponse = await axios.post(`${BASE_URL}/api/chat`, {
      message: "compare AAPL to MSFT",
      sessionId: sessionId
    });
    console.log(`Response: "${comparisonResponse.data.response.substring(0, 100)}..."`);
    
    if (comparisonResponse.data.response.includes('AAPL') && 
        comparisonResponse.data.response.includes('MSFT')) {
      console.log(`✅ PASSED: Both symbols mentioned`);
    } else {
      console.log(`❌ FAILED: Missing symbol comparison`);
    }
    console.log(`Response length: ${comparisonResponse.data.response.length} chars\n`);
    
    console.log("🎉 Basic tests completed!");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

runBasicTest();