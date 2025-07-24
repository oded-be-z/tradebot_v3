// Test single chart generation to see exact response format
const axios = require('axios');

async function testSingleChart() {
  console.log('🧪 Testing single chart generation...');
  
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'show TSLA chart',
      sessionId: 'single-test'
    });
    
    console.log('📊 Response structure:');
    console.log('- success:', response.data.success);
    console.log('- showChart:', response.data.showChart);
    console.log('- chartData:', response.data.chartData ? 'PRESENT' : 'NULL');
    console.log('- chartData type:', typeof response.data.chartData);
    
    if (response.data.chartData) {
      console.log('- chartData keys:', Object.keys(response.data.chartData));
      console.log('- chartData.type:', response.data.chartData.type);
      console.log('- chartData.symbol:', response.data.chartData.symbol);
    }
    
    console.log('\n🎯 Chart generation successful!');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testSingleChart();