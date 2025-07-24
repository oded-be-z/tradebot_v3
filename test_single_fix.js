const axios = require('axios');

async function testSingleFix() {
  console.log('🔍 Testing Single Critical Fix');
  console.log('='.repeat(30));
  
  try {
    // Test 1: Empty query (should now return graceful message)
    console.log('\n📋 Testing Empty Query Fix...');
    const emptyResponse = await axios.post('http://localhost:3000/api/chat', {
      message: "",
      sessionId: "test-empty"
    });
    
    const responseText = emptyResponse.data.response;
    const hasGracefulMessage = responseText.includes("help you with financial analysis");
    const isClean = !/(\"response\":|\\n|\\\"|\\\\)/.test(responseText);
    
    console.log(`✅ Empty Query: ${hasGracefulMessage && isClean ? 'FIXED' : 'FAILED'}`);
    console.log(`📝 Response: ${responseText.substring(0, 100)}...`);
    console.log(`🧹 Clean: ${isClean ? 'Yes' : 'No'}`);
    
    // Wait 10 seconds before next test to avoid rate limiting
    console.log('\n⏳ Waiting 10 seconds to avoid rate limits...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Test 2: Simple query to see if we hit rate limits
    console.log('\n📋 Testing Basic Query (rate limit check)...');
    const basicResponse = await axios.post('http://localhost:3000/api/chat', {
      message: "help",
      sessionId: "test-basic"
    });
    
    const basicText = basicResponse.data.response;
    const hasRateLimit = basicText.includes("high demand");
    const hasApiError = basicText.includes("temporary issue");
    
    console.log(`✅ Basic Query: ${!hasRateLimit && !hasApiError ? 'WORKING' : 'RATE LIMITED'}`);
    console.log(`📝 Response: ${basicText.substring(0, 100)}...`);
    
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('❌ Still hitting rate limits - 429 error');
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n='.repeat(30));
  console.log('🏁 Single Fix Test Complete');
}

testSingleFix().catch(console.error);