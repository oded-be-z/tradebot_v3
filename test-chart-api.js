const axios = require('axios');

async function testChartAPI() {
  console.log('🧪 Testing Chart API Integration...\n');
  
  const baseURL = 'http://localhost:3000';
  
  try {
    // Initialize session
    const sessionRes = await axios.post(`${baseURL}/api/session/init`);
    const sessionId = sessionRes.data.sessionId;
    console.log(`✅ Session initialized: ${sessionId}\n`);
    
    // Test cases as specified
    const testCases = [
      {
        name: 'Bitcoin Chart',
        message: 'show bitcoin chart',
        expectedSymbol: 'BTC'
      },
      {
        name: 'Gold vs Silver Chart',
        message: 'gold vs silver chart',
        expectedSymbols: ['GC', 'SI']
      },
      {
        name: 'Oil Trends with Chart',
        message: 'oil trends with chart',
        expectedSymbol: 'CL'
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`📋 Testing: ${testCase.name}`);
      console.log(`   Query: "${testCase.message}"`);
      
      const response = await axios.post(`${baseURL}/api/chat`, {
        message: testCase.message,
        sessionId
      });
      
      const { success, response: botResponse, chartData, type, metadata } = response.data;
      
      console.log(`   ✅ Response received (type: ${type})`);
      console.log(`   ✅ Success: ${success}`);
      
      // Chart validation
      if (chartData) {
        console.log(`   ✅ Chart data present`);
        console.log(`   ✅ Chart type: ${chartData.type}`);
        console.log(`   ✅ Chart title: ${chartData.title || 'No title'}`);
        
        if (chartData.imageUrl) {
          console.log(`   ✅ Image URL present (${chartData.imageUrl.length} chars)`);
          
          if (chartData.imageUrl.startsWith('data:image/png;base64,')) {
            console.log(`   ✅ Valid PNG base64 image`);
          } else {
            console.log(`   ❌ Invalid image format`);
          }
        } else {
          console.log(`   ❌ No image URL in chart data`);
        }
      } else {
        console.log(`   ❌ No chart data received`);
      }
      
      // Check for placeholder text
      if (botResponse.includes('Chart rendering available in full implementation')) {
        console.log(`   ❌ Found placeholder text in response`);
      } else {
        console.log(`   ✅ No placeholder text found`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log('🎯 API chart testing completed!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testChartAPI();