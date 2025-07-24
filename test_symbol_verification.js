const axios = require('axios');

const PORT = 3000;
const API_URL = `http://localhost:${PORT}/api/chat`;

async function testSymbolInResponse() {
  const sessionId = `test_symbol_${Date.now()}`;
  
  console.log('🧪 Testing Symbol Verification\n');
  
  try {
    // Test 1: NVDA query
    console.log('Test 1: Asking about NVDA...');
    const nvdaResponse = await axios.post(API_URL, {
      message: "How about NVDA?",
      sessionId: sessionId
    });
    
    const nvdaText = nvdaResponse.data.response || nvdaResponse.data.message || '';
    const hasNVDA = nvdaText.includes('NVDA');
    const hasNvidia = nvdaText.toLowerCase().includes('nvidia');
    
    console.log(`Response: ${nvdaText.substring(0, 150)}...`);
    console.log(`Contains NVDA: ${hasNVDA}`);
    console.log(`Contains Nvidia: ${hasNvidia}`);
    console.log(`Symbol field: ${nvdaResponse.data.symbol}`);
    console.log(`ShowChart: ${nvdaResponse.data.showChart}`);
    
    // Test 2: Vague query after NVDA
    console.log('\nTest 2: Vague query "What\'s the trend?"...');
    const vagueResponse = await axios.post(API_URL, {
      message: "What's the trend?",
      sessionId: sessionId
    });
    
    const vagueText = vagueResponse.data.response || vagueResponse.data.message || '';
    const vagueHasNVDA = vagueText.includes('NVDA');
    const vagueHasNvidia = vagueText.toLowerCase().includes('nvidia');
    
    console.log(`Response: ${vagueText.substring(0, 150)}...`);
    console.log(`Contains NVDA: ${vagueHasNVDA}`);
    console.log(`Contains Nvidia: ${vagueHasNvidia}`);
    console.log(`Symbol field: ${vagueResponse.data.symbol}`);
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`✅ NVDA query has symbol field: ${nvdaResponse.data.symbol === 'NVDA' ? 'PASS' : 'FAIL'}`);
    console.log(`✅ NVDA mentioned in response: ${(hasNVDA || hasNvidia) ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Vague query uses NVDA context: ${(vagueHasNVDA || vagueHasNvidia) ? 'PASS' : 'FAIL'}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testSymbolInResponse();