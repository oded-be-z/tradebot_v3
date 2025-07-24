const axios = require('axios');

const PORT = 3000;
const API_URL = `http://localhost:${PORT}/api/chat`;

async function makeRequest(message, sessionId) {
  try {
    const response = await axios.post(API_URL, {
      message,
      sessionId
    });
    return response.data;
  } catch (error) {
    console.error('Request error:', error.message);
    return null;
  }
}

async function testChartGeneration() {
  console.log('🚀 CHART GENERATION FIX TEST');
  console.log('============================\n');
  
  const sessionId = `chart_test_${Date.now()}`;
  
  const testCases = [
    "show me TSLA trend",
    "NVDA trend analysis",
    "What's the trend for AAPL"
  ];
  
  console.log('Testing trend queries that should generate charts...\n');
  
  for (let i = 0; i < testCases.length; i++) {
    const query = testCases[i];
    console.log(`${i+1}. Testing: "${query}"`);
    
    const response = await makeRequest(query, sessionId);
    
    if (response) {
      console.log(`✅ Symbol: ${response.symbol}`);
      console.log(`✅ ShowChart: ${response.showChart}`);
      console.log(`✅ ChartData present: ${response.chartData ? 'YES' : 'NO'}`);
      
      if (response.chartData) {
        console.log(`✅ ChartData type: ${typeof response.chartData}`);
        console.log(`✅ ChartData keys: ${Object.keys(response.chartData)}`);
      }
      
      const chartWorking = response.showChart && response.chartData;
      console.log(`✅ Chart generation: ${chartWorking ? 'WORKING ✅' : 'FAILED ❌'}`);
      console.log(`📝 Response: ${response.response.substring(0, 100)}...\n`);
    } else {
      console.log(`❌ Failed to get response\n`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testChartGeneration().catch(console.error);